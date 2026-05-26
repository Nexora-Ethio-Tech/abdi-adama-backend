import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';
import { sendSuccess, sendError, getPagination } from '../shared/responseUtils';
import { getNextSaturday } from '../shared/dateUtils';
import { broadcast, addClient, removeClient } from '../shared/sseManager';
import { performAllCleanups } from '../shared/cleanupUtils';
import * as notificationService from '../services/notificationService';

/**
 * GET /api/driver/manifest  (also aliased at /api/transport/manifest)
 * DRIVER MANIFEST SEPARATION - Returns ONLY the 4 students assigned to THIS driver.
 * Driver A must absolutely NOT see Driver B's students or routing information.
 * Returns: student_name, digital_id, grade, route_name
 */
export const getManifest = async (req: AuthRequest, res: Response) => {
  const driver_id = req.user?.user_id;  // The actual driver's user_id

  if (!driver_id) {
    sendError(res, 'Authentication error: user_id not found in token.', 401);
    return;
  }

  try {
    // 1. Find the driver's assigned route (Driver A only sees their route)
    const routeResult = await pool.query(
      'SELECT id, name FROM routes WHERE driver_id = $1',
      [driver_id]
    );

    if (routeResult.rows.length === 0) {
      sendError(res, 'No route assigned to this driver yet.', 404);
      return;
    }

    const route = routeResult.rows[0];

    // 2. Get students assigned to THIS driver's route ONLY
    // JOIN: student_routes -> students -> users (to get digital_id & name)
    const manifestResult = await pool.query(
      `SELECT 
         u.name           AS student_name,
         u.digital_id,
         u.digital_id     AS digital_id,
         s.grade,
         $1::text         AS route_name
       FROM student_routes sr
       JOIN students s ON s.id = sr.student_id
       JOIN users u ON u.id = s.user_id
       WHERE sr.route_id = $2
       ORDER BY u.name ASC`,
      [route.name, route.id]
    );

    sendSuccess(res, {
      route_id: route.id,
      route_name: route.name,
      student_count: manifestResult.rows.length,
      manifest: manifestResult.rows,
    });
    return;
  } catch (err: any) {
    sendError(res, 'Failed to fetch manifest.', 500, err.message);
    return;
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
    sendError(res, 'Notice content is required.', 400);
    return;
  }

  try {
    // Get driver's full name for the notice
    const driverResult = await pool.query(
      'SELECT name FROM users WHERE id = $1',
      [identity_id]
    );
    const driverName = driverResult.rows[0]?.name || 'Driver';

    // Auto-expire after 5 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 5);
    expiresAt.setHours(23, 59, 59, 999);

    const branchId = req.user?.branch_id || '1';

    const result = await pool.query(
      `INSERT INTO logistics_notices (sender_id, content, message, title, stations, expires_at, branch_id, driver_name, category, published_at, timestamp, created_at)
       VALUES ($1, $2, $2, $3, $4, $5, $6, $7, 'Logistics', NOW(), NOW(), CURRENT_TIMESTAMP)
       RETURNING *`,
      [identity_id, content, title || 'Logistics Update', stations || null, expiresAt, branchId, driverName]
    );

    const notice = result.rows[0];
    const noticePayload = {
      id: notice.id,
      title: notice.title || 'Logistics Update',
      content: notice.message,
      stations: notice.stations,
      driverName,
      time: notice.timestamp,
      published_at: notice.published_at,
      category: 'Logistics',
      priority: 'Normal',
      expires_at: notice.expires_at,
      branchId: notice.branch_id,
      senderId: identity_id
    };
    const broadcastPayload = {
      ...noticePayload,
      content: notice.message,
    };

    // 3. Find assigned students for this driver (to restrict broadcast)
    const manifestResult = await pool.query(
      `SELECT s.user_id 
       FROM student_routes rm 
       JOIN routes r ON r.id = rm.route_id 
       JOIN students s ON s.id = rm.student_id
       WHERE r.driver_id = $1`,
      [identity_id]
    );
    const assignedStudentUserIds = manifestResult.rows.map(r => r.user_id);

    // Push to relevant SSE clients instantly (Assigned Student/Parent + Admin/VP in branch)
    const allowedRoles = ['Student', 'Parent', 'Admin', 'SchoolAdmin', 'VicePrincipal', 'SuperAdmin'];
    broadcast('LOGISTICS_NOTICE', broadcastPayload, branchId, allowedRoles, assignedStudentUserIds);

    sendSuccess(res, noticePayload, 'Notice posted successfully.', 201);
    return;
  } catch (err: any) {
    sendError(res, 'Failed to post notice.', 500, err.message);
    return;
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
        n.driver_name  AS driverName,
        'Logistics'::text AS category,
        false AS is_pending
      FROM logistics_notices n
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
 * Soft deletes a notice and broadcasts deletion to all connected clients.
 * Only the sender can delete their own notice.
 */
export const deleteNotice = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const branchId = req.user?.branch_id;
  const user_id = req.user?.user_id;

  try {
    const checkResult = await pool.query(
      'SELECT sender_id, branch_id FROM logistics_notices WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return sendError(res, 'Notice not found.', 404);
    }

    const notice = checkResult.rows[0];
    const role = req.user?.role;
    const identityId = req.user?.identity_id;

    // Normalize role for comparison
    const normalizedRole = role?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';

    // 1. Branch Isolation (Admin/SchoolAdmin/Driver must be in the same branch)
    if (notice.branch_id !== branchId) {
      return sendError(res, 'You do not have permission to delete notices from another branch.', 403);
    }

    // 2. Ownership Isolation for Drivers (strict)
    if (normalizedRole === 'driver' && notice.sender_id !== identityId) {
      return sendError(res, 'You can only delete your own notices.', 403);
    }

    const deleteResult = await pool.query(
      'UPDATE logistics_notices SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id',
      [id]
    );

    if (deleteResult.rowCount === 0) {
      return sendError(res, 'Notice could not be deleted.', 500);
    }

    // 3. Broadcast deletion event to all connected clients (immediate real-time sync)
    // Find assigned students' user_ids for the driver posting this notice
    const manifestResult = await pool.query(
      `SELECT s.user_id 
       FROM student_routes rm 
       JOIN routes r ON r.id = rm.route_id 
       JOIN students s ON s.id = rm.student_id
       WHERE r.driver_id = $1`,
      [notice.sender_id]
    );
    const assignedStudentUserIds = manifestResult.rows.map(r => r.user_id);

    // Broadcast to all relevant roles (drivers, students, parents, admins, VP, super admin)
    const allowedRoles = ['Driver', 'Student', 'Parent', 'Admin', 'SchoolAdmin', 'VicePrincipal', 'SuperAdmin'];
    broadcast('NOTICE_DELETED', { id, deletedBy: user_id, deletedAt: new Date().toISOString() }, notice.branch_id, allowedRoles, assignedStudentUserIds);

    return sendSuccess(res, null, 'Notice deleted successfully.');
  } catch (err: any) {
    return sendError(res, 'Failed to delete notice.', 500, err.message);
  }
};

/**
 * GET /api/driver/stream
 * SSE stream endpoint. Client connects here to receive real-time notice updates (deletions, new posts).
 * Supports token via query parameter (for EventSource API) or Authorization header.
 */
export const subscribeToNotifications = (req: AuthRequest, res: Response) => {
  const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

  // Extract token from query parameter or Authorization header
  let token: string | undefined = req.query.token as string | undefined;

  if (!token) {
    const authHeader = req.headers['authorization'];
    token = authHeader && authHeader.split(' ')[1];
  }

  if (!token) {
    res.status(401).json({ message: 'Authentication token required' });
    return;
  }

  // Verify and decode token
  jwt.verify(token, JWT_SECRET, async (err: any, user: any) => {
    if (err) {
      res.status(403).json({ message: 'Invalid or expired token' });
      return;
    }

    const branchId = user?.branch_id || '1';
    const role = user?.role || 'Guest';
    const identityId = user?.identity_id || user?.userId || 'unknown';

    // Get child identities for parents (for filtering logistics notices to assigned children)
    let childIdentityIds: string[] | undefined = undefined;

    if (role === 'Parent' || role === 'parent') {
      try {
        const childrenResult = await pool.query(
          `SELECT s.user_id 
           FROM parent_student ps
           JOIN parents p ON p.id = ps.parent_id
           JOIN students s ON s.id = ps.student_id
           WHERE p.user_id = $1`,
          [identityId]
        );
        childIdentityIds = childrenResult.rows.map(r => r.user_id);
      } catch (dbErr) {
        console.error('[SSE] Failed to fetch parent child ids:', dbErr);
      }
    }

    // Register this client with SSE manager
    addClient(res, {
      branchId,
      role,
      identityId,
      childIdentityIds
    });

    // Handle client disconnect
    res.on('close', () => {
      removeClient(res);
    });

    res.on('error', () => {
      removeClient(res);
    });
  });
};


export const postAlert = async (req: AuthRequest, res: Response) => {
  const { message, target_route } = req.body;
  const driver_id = req.user?.user_id;
  const driver_name = (req.user as any)?.name || 'Driver';

  if (!driver_id) {
    sendError(res, 'Authentication error: driver_id not found.', 401);
    return;
  }

  if (!message || message.trim().length === 0) {
    return sendError(res, 'Alert message is required.', 400);
  }

  try {
    // Create the notification
    const notification = await notificationService.createNotification(
      driver_id,
      driver_name,
      message,
      target_route || null
    );

    // Broadcast to relevant parties:
    // 1. Students assigned to this driver's route
    // 2. Parents of those students
    // 3. Branch admins & vice principals
    const routeResult = await pool.query(
      'SELECT id FROM routes WHERE driver_id = $1',
      [driver_id]
    );

    if (routeResult.rows.length > 0) {
      const route_id = routeResult.rows[0].id;

      // Get students on this route
      const studentResult = await pool.query(
        `SELECT DISTINCT s.user_id FROM student_routes sr
         JOIN students s ON s.id = sr.student_id
         WHERE sr.route_id = $1`,
        [route_id]
      );

      const studentUserIds = studentResult.rows.map(r => r.user_id);

      // Broadcast alert to assigned students, their parents, and school admin only
      const broadcastPayload = {
        type: 'DRIVER_ALERT',
        id: notification.id,
        driver_name: driver_name,
        message: message,
        created_at: notification.created_at,
      };

      const allowedRoles = ['Student', 'Parent', 'SchoolAdmin'];
      broadcast('DRIVER_ALERT', broadcastPayload, req.user?.branch_id || '1', allowedRoles, studentUserIds);
    }

    return sendSuccess(res, notification, 'Alert posted successfully.', 201);
  } catch (err: any) {
    return sendError(res, 'Failed to post alert.', 500, err.message);
  }
};

/**
 * GET /api/driver/alerts?page=&limit=
 * Get all alerts posted by drivers
 * DRIVER ISOLATION: Driver can only see their own alerts
 * SCHOOL ADMIN ACCESS: SchoolAdmin only (NOT VP or SuperAdmin)
 */
export const getAlerts = async (req: AuthRequest, res: Response) => {
  const driver_id = req.user?.user_id;
  const role = req.user?.role;
  const branch_id = req.user?.branch_id;
  const { limit, offset } = getPagination(req.query);

  if (!driver_id) {
    return sendError(res, 'Authentication error: driver_id not found.', 401);
  }

  try {
    // Perform cleanup of old/deleted notifications
    await performAllCleanups();

    // Normalize role for comparison (same as authorizeRoles middleware)
    const normalizedRole = role?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';

    let notifications;

    if (normalizedRole === 'driver') {
      // Driver only sees their own alerts
      notifications = await notificationService.getNotificationsForDriver(driver_id);
    } else if (normalizedRole === 'schooladmin') {
      // Only SchoolAdmin sees all driver alerts for branch
      notifications = await notificationService.getAllNotificationsForAdmin(branch_id);
    } else {
      return sendError(res, 'Access denied: insufficient permissions.', 403);
    }

    sendSuccess(res, {
      count: notifications.length,
      alerts: notifications.slice(offset, offset + limit),
      total: notifications.length,
    });
    return;
  } catch (err: any) {
    sendError(res, 'Failed to fetch alerts.', 500, err.message);
    return;
  }
};

/**
 * DELETE /api/driver/alert/:id
 * Delete a driver's posted alert
 * INSTANT DELETE: Removes immediately from database
 * Only the driver who posted it can delete it
 * Broadcasts deletion to: Assigned students, their parents, and School Admin
 */
export const deleteAlert = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const driver_id = req.user?.user_id;

  if (!driver_id) {
    sendError(res, 'Authentication error: driver_id not found.', 401);
    return;
  }

  try {
    // Soft delete (mark as deleted)
    const deleted = await notificationService.softDeleteNotification(id, driver_id);

    if (!deleted) {
      sendError(res, 'Failed to delete alert.', 500);
      return;
    }

    // Broadcast deletion event to all connected clients
    const broadcastPayload = {
      type: 'DRIVER_ALERT_DELETED',
      id: id,
      deleted_at: new Date().toISOString(),
    };

    broadcast('DRIVER_ALERT_DELETED', broadcastPayload, req.user?.branch_id || '1',
      ['Student', 'Parent', 'SchoolAdmin']);

    sendSuccess(res, null, 'Alert deleted successfully.');
    return;
  } catch (err: any) {
    if (err.message.includes('Unauthorized')) {
      sendError(res, err.message, 403);
      return;
    }
    sendError(res, 'Failed to delete alert.', 500, err.message);
    return;
  }
};

