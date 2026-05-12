import { Request, Response } from 'express';
import pool from '../../config/db';
import { AuthRequest } from '../../middleware/authMiddleware';
import { sendSuccess, sendError, getPagination } from '../../shared/responseUtils';

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

    const result = await pool.query(
      `INSERT INTO silo_logistics_notices (sender_id, message, title, stations)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [identity_id, content, title || null, stations || null]
    );

    return sendSuccess(res, {
      ...result.rows[0],
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
export const getNotices = async (req: Request, res: Response) => {
  const { limit, offset, page } = getPagination(req.query);

  try {
    const result = await pool.query(
      `SELECT 
         n.id,
         n.title,
         n.message   AS content,
         n.stations,
         n.timestamp AS time,
         i.full_name AS driverName,
         'Logistics'::text AS category
       FROM silo_logistics_notices n
       LEFT JOIN silo_identities i ON i.id = n.sender_id
       ORDER BY n.timestamp DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return sendSuccess(res, result.rows);
  } catch (err: any) {
    return sendError(res, 'Failed to fetch notices.', 500, err.message);
  }
};
