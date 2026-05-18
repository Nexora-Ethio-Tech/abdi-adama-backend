import { Request, Response } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';
import { sendSuccess, sendError, getPagination } from '../shared/responseUtils';
import { getNextSaturday } from '../shared/dateUtils';
import { broadcast } from '../shared/sseManager';
import { performAllCleanups } from '../shared/cleanupUtils';

/**
 * GET /api/driver/manifest  (also aliased at /api/transport/manifest)
 * Returns the list of students assigned to the logged-in driver's route.
 * Frontend expects: student_name, digital_id, grade, route_name
 */
export const getManifest = async (req: AuthRequest, res: Response) => {
  const identity_id = req.user?.identity_id;

  if (!identity_id) {
    return sendError(res, 'Authentication error: identity not found in token.', 401);
  }

  try {
    // 1. Find the driver's route
    const routeResult = await pool.query(
      'SELECT id, bus_number, route_name FROM silo_routes WHERE driver_id = $1',
      [identity_id]
    );

    if (routeResult.rows.length === 0) {
      return sendError(res, 'No route assigned to this driver yet.', 404);
    }

    const route = routeResult.rows[0];

    // 2. Get manifest — return student_name + digital_id (school_id alias) + grade
    const manifestResult = await pool.query(
      `SELECT 
         i.full_name  AS student_name,
         i.school_id,
         i.school_id  AS digital_id,
         i.grade,
         $1::text     AS route_name
       FROM silo_route_manifest rm
       JOIN silo_identities i ON i.id = rm.student_id
       WHERE rm.route_id = $2
       ORDER BY i.full_name ASC`,
      [route.route_name, route.id]
    );

    return sendSuccess(res, {
      bus_number:  route.bus_number,
      route_name:  route.route_name,
      student_count: manifestResult.rows.length,
      manifest:    manifestResult.rows,
    });
  } catch (err: any) {
    return sendError(res, 'Failed to fetch manifest.', 500, err.message);
  }
};

/**
 * POST /api/driver/notice
 * Posts a logistics update.
 * Body: { title, content, stations }
 */
export const postNotice = async (req: AuthRequest, res: Response) => {
  const { title, content, stations } = req.body;
  const identity_id = req.user?.identity_id;

  if (!content) {
    return sendError(res, 'Notice content is required.', 400);
  }

  try {
    // Get driver's full name for the notice
    const driverResult = await pool.query(
      'SELECT full_name FROM silo_identities WHERE id = $1',
      [identity_id]
    );
    const driverName = driverResult.rows[0]?.full_name || 'Driver';

    const expiresAt = getNextSaturday(new Date());
    // Set expiration to end of Saturday (e.g., 11:59 PM)
    expiresAt.setHours(23, 59, 59, 999);

    const branchId = req.user?.branch_id || '1';

    const result = await pool.query(
      `INSERT INTO silo_logistics_notices (sender_id, message, title, stations, published_at, expires_at, branch_id)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6)
       RETURNING *`,
      [identity_id, content, title || null, stations || null, expiresAt, branchId]
    );

    const notice = result.rows[0];
    const broadcastPayload = {
      id:         notice.id,
      title:      notice.title || 'Logistics Update',
      content:    notice.message,
      stations:   notice.stations,
      driverName,
      timestamp:  notice.published_at,
      category:   'Logistics',
      priority:   'Normal',
      expires_at: notice.expires_at,
      branchId:   notice.branch_id,
      senderId:   identity_id
    };

    // 3. Find assigned students for this driver (to restrict broadcast)
    const manifestResult = await pool.query(
      'SELECT student_id FROM silo_route_manifest rm JOIN silo_routes r ON r.id = rm.route_id WHERE r.driver_id = $1',
      [identity_id]
    );
    const assignedStudentIds = manifestResult.rows.map(r => r.student_id);

    // Push to relevant SSE clients instantly (Assigned Student/Parent + Admin/VP in branch)
    const allowedRoles = ['Student', 'Parent', 'Admin', 'SchoolAdmin', 'VicePrincipal'];
    broadcast('LOGISTICS_NOTICE', broadcastPayload, branchId, allowedRoles, assignedStudentIds);

    return sendSuccess(res, {
      ...notice,
      driverName,
    }, 'Notice posted successfully.', 201);
  } catch (err: any) {
    return sendError(res, 'Failed to post notice.', 500, err.message);
  }
};

/**
 * GET /api/driver/notices?page=&limit=
 * Returns logistics notices — most recent first.
 */
export const getNotices = async (req: AuthRequest, res: Response) => {
  const { limit, offset } = getPagination(req.query);
  const branchId = req.user?.branch_id || '1';
  await performAllCleanups();

  try {
    const role = req.user?.role;
    const identityId = req.user?.identity_id;

    let query = `
      SELECT 
        n.id,
        n.title,
        n.message      AS content,
        n.stations,
        n.timestamp    AS time,
        n.published_at,
        n.expires_at,
        n.branch_id,
        i.full_name    AS driverName,
        'Logistics'::text AS category,
        false AS is_pending
      FROM silo_logistics_notices n
      LEFT JOIN silo_identities i ON i.id = n.sender_id
      WHERE n.deleted_at IS NULL
        AND (n.expires_at IS NULL OR n.expires_at > CURRENT_TIMESTAMP)
        AND n.branch_id = $1
    `;
    const params: any[] = [branchId];

    // Driver only sees their OWN notices. Admin/VP sees ALL notices for the branch.
    if (role === 'Driver') {
      query += ` AND n.sender_id = $${params.length + 1}`;
      params.push(identityId);
    }

    query += ` ORDER BY n.timestamp DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return sendSuccess(res, result.rows);
  } catch (err: any) {
    return sendError(res, 'Failed to fetch notices.', 500, err.message);
  }
};

/**
 * DELETE /api/driver/notice/:id
 * Soft deletes a notice. Only the sender can delete their own notice.
 */
export const deleteNotice = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const branchId = req.user?.branch_id;
  const identity_id = req.user?.identity_id;

  try {
    const checkResult = await pool.query(
      'SELECT sender_id, branch_id FROM silo_logistics_notices WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return sendError(res, 'Notice not found.', 404);
    }

    const notice = checkResult.rows[0];
    const role = req.user?.role;

    // 1. Branch Isolation (Admin/VP/Driver must be in the same branch)
    if (notice.branch_id !== branchId) {
      return sendError(res, 'You do not have permission to delete notices from another branch.', 403);
    }

    // 2. Ownership Isolation for Drivers (strict)
    if (role === 'Driver' && notice.sender_id !== identity_id) {
      return sendError(res, 'You can only delete your own notices.', 403);
    }

    const deleteResult = await pool.query(
      'UPDATE silo_logistics_notices SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id',
      [id]
    );

    if (deleteResult.rowCount === 0) {
      return sendError(res, 'Notice could not be deleted.', 500);
    }

    return sendSuccess(res, null, 'Notice deleted successfully.');
  } catch (err: any) {
    return sendError(res, 'Failed to delete notice.', 500, err.message);
  }
};
