import pool from '../config/db';

/**
 * Performs all scheduled background cleanups.
 *
 * Currently handles:
 *   1. Hard-delete logistics notices older than 3 days (from published_at).
 *      This reduces unnecessary DB storage and server traffic.
 *   2. Hard-delete any soft-deleted notices (deleted_at IS NOT NULL) older
 *      than 1 day, completing the two-phase deletion cycle.
 *
 * Called automatically on every relevant API request (e.g. GET /api/driver/notices,
 * GET /api/student/profile) so no separate cron job is needed.
 */
export const performAllCleanups = async (): Promise<void> => {
  try {
    // 1. Hard-delete driver logistics notices older than 3 days
    const hardDelete = await pool.query(`
      DELETE FROM silo_logistics_notices
      WHERE published_at < NOW() - INTERVAL '3 days'
    `);

    // 2. Hard-delete soft-deleted notices older than 1 day (cleanup of deleted_at records)
    const softDelete = await pool.query(`
      DELETE FROM silo_logistics_notices
      WHERE deleted_at IS NOT NULL
        AND deleted_at < NOW() - INTERVAL '1 day'
    `);

    const removed = (hardDelete.rowCount ?? 0) + (softDelete.rowCount ?? 0);
    if (removed > 0) {
      console.log(`[Cleanup] Removed ${removed} expired/deleted logistics notice(s) from DB.`);
    }
  } catch (err: any) {
    // Non-fatal: log but don't crash the request
    console.error('[Cleanup] performAllCleanups error:', err.message);
  }
};
