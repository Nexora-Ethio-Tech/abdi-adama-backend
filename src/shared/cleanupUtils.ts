import pool from '../config/db';
import * as notificationService from '../services/notificationService';
import { performCommunicationCleanup } from './commBookUtils';

/**
 * Performs all scheduled background cleanups.
 *
 * Currently handles:
 *   1. Hard-delete logistics notices that have expired (older than expires_at timestamp).
 *      Notices auto-expire 5 days after creation.
 *   2. Hard-delete any soft-deleted notices (deleted_at IS NOT NULL) older
 *      than 6 hours, completing immediate manual deletion requests.
 *   3. Hard-delete driver notifications older than 3 days (AUTO-PURGE).
 *   4. Hard-delete soft-deleted driver notifications older than 6 hours.
 *   5. Purge older weekly communication book logs every Friday morning.
 *
 * Called automatically on every relevant API request (e.g. GET /api/driver/notices,
 * GET /api/student/profile) so no separate cron job is needed.
 */
export const performAllCleanups = async (): Promise<void> => {
  try {
    // 5. Purge old weekly communication book logs
    await performCommunicationCleanup();

    // 6. Purge expired weekly lesson plans (after Friday 18:00 of their creation week)
    const weeklyPlanCleanup = await pool.query(`
      DELETE FROM weekly_plans
      WHERE created_at < CASE 
        WHEN EXTRACT(ISODOW FROM NOW()) < 5 OR (EXTRACT(ISODOW FROM NOW()) = 5 AND EXTRACT(HOUR FROM NOW()) < 18)
        THEN (date_trunc('week', NOW()) - INTERVAL '2 days 6 hours')
        ELSE (date_trunc('week', NOW()) + INTERVAL '4 days 18 hours')
      END
    `);

    // 1. Hard-delete expired logistics notices (auto-expired after 5 days)
    const expiredDelete = await pool.query(`
      DELETE FROM logistics_notices
      WHERE expires_at IS NOT NULL
        AND expires_at < NOW()
    `);

    // 2. Hard-delete manually soft-deleted notices older than 6 hours (cleanup of deleted_at records)
    // This allows data retention for auditing while cleaning up quickly after manual deletion
    const softDelete = await pool.query(`
      DELETE FROM logistics_notices
      WHERE deleted_at IS NOT NULL
        AND deleted_at < NOW() - INTERVAL '6 hours'
    `);

    // 3. Hard-delete driver notifications older than 3 days (AUTO-PURGE)
    // After exactly 3 days, notifications are completely wiped from server
    const oldDriverNotices = await notificationService.hardDeleteOldNotifications();

    // 4. Hard-delete soft-deleted driver notifications older than 6 hours
    // Allows data retention for auditing while cleaning up quickly after manual deletion
    const softDeletedDriverNotices = await notificationService.hardDeleteSoftDeletedNotifications();

    const removed = (expiredDelete.rowCount ?? 0) + (softDelete.rowCount ?? 0) + 
                    (weeklyPlanCleanup.rowCount ?? 0) + oldDriverNotices + softDeletedDriverNotices;
    if (removed > 0) {
      console.log(`[Cleanup] Removed ${removed} expired/deleted notification(s) or plan(s) from DB.`);
    }
  } catch (err: any) {
    // Non-fatal: log but don't crash the request
    console.error('[Cleanup] performAllCleanups error:', err.message);
  }
};

