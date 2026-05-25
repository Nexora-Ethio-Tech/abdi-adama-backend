import pool from '../config/db';
import { randomUUID } from 'crypto';

/**
 * Driver Notification Service
 * Handles creation, retrieval, deletion, and 3-day auto-purge of driver alerts.
 * Ensures strict driver isolation (Driver A cannot see Driver B's alerts).
 */

export interface DriverNotification {
  id: string;
  driver_id: string;
  driver_name: string;
  message: string;
  target_route: string | null;
  created_at: string;
  student_count?: number;
}

/**
 * POST a new driver notification (alert)
 * Only the driver can post to their own route
 */
export const createNotification = async (
  driver_id: string,
  driver_name: string,
  message: string,
  target_route: string | null = null
): Promise<DriverNotification> => {
  const id = randomUUID();
  const now = new Date().toISOString();

  const result = await pool.query(
    `INSERT INTO driver_notifications 
      (id, driver_id, message, target_route, created_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, driver_id, message, target_route, created_at`,
    [id, driver_id, message, target_route, now]
  );

  return {
    ...result.rows[0],
    driver_name,
  };
};

/**
 * GET all notifications for a specific driver
 * STRICT ISOLATION: Driver can only see their own notifications
 * Auto-filters out deleted and 3+ day old notifications
 */
export const getNotificationsForDriver = async (
  driver_id: string
): Promise<DriverNotification[]> => {
  const result = await pool.query(
    `SELECT 
       dn.id,
       dn.driver_id,
       u.name AS driver_name,
       dn.message,
       dn.target_route,
       dn.created_at
     FROM driver_notifications dn
     JOIN users u ON u.id = dn.driver_id
     WHERE dn.driver_id = $1
       AND dn.deleted_at IS NULL
       AND dn.created_at >= NOW() - INTERVAL '3 days'
     ORDER BY dn.created_at DESC`,
    [driver_id]
  );

  return result.rows;
};

/**
 * GET notifications for students assigned to a driver
 * Used by students to see announcements from their driver
 * Returns only current (not expired) notifications
 */
export const getNotificationsForStudentByDriver = async (
  driver_id: string
): Promise<DriverNotification[]> => {
  const result = await pool.query(
    `SELECT 
       dn.id,
       dn.driver_id,
       u.name AS driver_name,
       dn.message,
       dn.target_route,
       dn.created_at
     FROM driver_notifications dn
     JOIN users u ON u.id = dn.driver_id
     WHERE dn.driver_id = $1
       AND dn.deleted_at IS NULL
       AND dn.created_at >= NOW() - INTERVAL '3 days'
     ORDER BY dn.created_at DESC`,
    [driver_id]
  );

  return result.rows;
};

/**
 * GET notifications for parents of students assigned to a driver
 * Returns only current (not expired) notifications
 */
export const getNotificationsForParentByDriver = async (
  driver_id: string
): Promise<DriverNotification[]> => {
  const result = await pool.query(
    `SELECT 
       dn.id,
       dn.driver_id,
       u.name AS driver_name,
       dn.message,
       dn.target_route,
       dn.created_at
     FROM driver_notifications dn
     JOIN users u ON u.id = dn.driver_id
     WHERE dn.driver_id = $1
       AND dn.deleted_at IS NULL
       AND dn.created_at >= NOW() - INTERVAL '3 days'
     ORDER BY dn.created_at DESC`,
    [driver_id]
  );

  return result.rows;
};

/**
 * GET all notifications visible to admin/vice principal
 * Shows all driver notifications for the branch (not filtered by driver)
 * Filters 3+ day old notifications
 */
export const getAllNotificationsForAdmin = async (
  branch_id: string | null = null
): Promise<DriverNotification[]> => {
  let query = `
    SELECT 
      dn.id,
      dn.driver_id,
      u.name AS driver_name,
      dn.message,
      dn.target_route,
      dn.created_at
    FROM driver_notifications dn
    JOIN users u ON u.id = dn.driver_id
    WHERE dn.deleted_at IS NULL
      AND dn.created_at >= NOW() - INTERVAL '3 days'
  `;

  const params: any[] = [];

  if (branch_id) {
    query += ` AND u.branch_id = $${params.length + 1}`;
    params.push(branch_id);
  }

  query += ` ORDER BY dn.created_at DESC`;

  const result = await pool.query(query, params);
  return result.rows;
};

/**
 * SOFT DELETE a notification (soft delete - marks deleted_at)
 * Only the driver who posted it can delete it
 * Hard deletion happens automatically after 6 hours (via cleanup)
 */
export const softDeleteNotification = async (
  notification_id: string,
  driver_id: string
): Promise<boolean> => {
  // Verify ownership before deleting
  const verifyResult = await pool.query(
    'SELECT driver_id FROM driver_notifications WHERE id = $1',
    [notification_id]
  );

  if (verifyResult.rows.length === 0) {
    throw new Error('Notification not found');
  }

  if (verifyResult.rows[0].driver_id !== driver_id) {
    throw new Error('Unauthorized: Can only delete your own notifications');
  }

  const result = await pool.query(
    'UPDATE driver_notifications SET deleted_at = NOW() WHERE id = $1',
    [notification_id]
  );

  return (result.rowCount ?? 0) > 0;
};

/**
 * Get count of notifications posted by a driver in the last 3 days
 * Useful for rate limiting or analytics
 */
export const getRecentNotificationCount = async (
  driver_id: string
): Promise<number> => {
  const result = await pool.query(
    `SELECT COUNT(*) as count 
     FROM driver_notifications
     WHERE driver_id = $1
       AND deleted_at IS NULL
       AND created_at >= NOW() - INTERVAL '3 days'`,
    [driver_id]
  );

  return parseInt(result.rows[0].count, 10);
};

/**
 * Hard delete notifications older than 3 days
 * Called automatically by performAllCleanups()
 * Permanently removes data from database
 */
export const hardDeleteOldNotifications = async (): Promise<number> => {
  const result = await pool.query(
    `DELETE FROM driver_notifications
     WHERE created_at < NOW() - INTERVAL '3 days'`
  );

  return result.rowCount ?? 0;
};

/**
 * Hard delete soft-deleted notifications older than 6 hours
 * Allows data retention for auditing while cleaning up quickly after manual deletion
 */
export const hardDeleteSoftDeletedNotifications = async (): Promise<number> => {
  const result = await pool.query(
    `DELETE FROM driver_notifications
     WHERE deleted_at IS NOT NULL
       AND deleted_at < NOW() - INTERVAL '6 hours'`
  );

  return result.rowCount ?? 0;
};
