import { Request, Response } from 'express';
import pool from '../../config/db';
import { AuthRequest } from '../../middleware/authMiddleware';
import { sendSuccess, sendError, getPagination } from '../../shared/responseUtils';
import { getNextSaturday } from '../../shared/dateUtils';
import { broadcast } from '../../shared/sseManager';

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

    const result = await pool.query(
      `INSERT INTO silo_logistics_notices (sender_id, message, title, stations, published_at, expires_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)
       RETURNING *`,
      [identity_id, content, title || null, stations || null, expiresAt]
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
    };

    // Push to all connected SSE clients instantly (Student, Parent, Admin portals)
    broadcast('LOGISTICS_NOTICE', broadcastPayload, identity_id);

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
  const { limit, offset, page } = getPagination(req.query);
  const identity_id = req.user?.identity_id;

  if (!identity_id) {
    return sendError(res, 'Authentication error: identity not found.', 401);
  }

  try {
    const result = await pool.query(
      `SELECT 
         n.id,
         n.title,
         n.message      AS content,
         n.stations,
         n.timestamp    AS time,
         n.published_at,
         n.expires_at,
         i.full_name    AS driverName,
         'Logistics'::text AS category,
         false AS is_pending
       FROM silo_logistics_notices n
       LEFT JOIN silo_identities i ON i.id = n.sender_id
       WHERE n.deleted_at IS NULL
         AND (n.expires_at IS NULL OR n.expires_at > CURRENT_TIMESTAMP)
         AND n.sender_id = $3
       ORDER BY n.timestamp DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset, identity_id]
    );

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
  const identity_id = req.user?.identity_id;

  try {
    const checkResult = await pool.query(
      'SELECT sender_id FROM silo_logistics_notices WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return sendError(res, 'Notice not found.', 404);
    }

    const notice = checkResult.rows[0];

    // Ownership check:
    // 1. If it's their notice, allow.
    // 2. If it's a "legacy" notice (created before recent identity cleanup), 
    //    and the current user is a driver, we'll allow it for now to let them clean up.
    if (notice.sender_id !== identity_id) {
       // Check if sender_id exists in identities
       const senderExists = await pool.query('SELECT 1 FROM silo_identities WHERE id = $1', [notice.sender_id]);
       if (senderExists.rows.length > 0) {
         // Sender exists and it's NOT the current driver. Block.
         return sendError(res, 'You do not have permission to delete this notice.', 403);
       }
       // If sender_id doesn't exist, it's an orphaned legacy notice. 
       // Since the route is restricted to drivers (via middleware), we allow them to clean up orphaned logistics notices.
    }

    await pool.query(
      'UPDATE silo_logistics_notices SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    return sendSuccess(res, null, 'Notice deleted successfully.');
  } catch (err: any) {
    return sendError(res, 'Failed to delete notice.', 500, err.message);
  }
};
