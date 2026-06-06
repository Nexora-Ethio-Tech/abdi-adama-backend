import pool from '../config/db';

/**
 * Weekly Communication Book Policy:
 * 1. Content is updated every Friday.
 * 2. Content is visible until the following Thursday evening.
 * 3. On Thursday evening (before Friday update), old content is removed.
 * 
 * Technical Implementation:
 * Records are stored with a 'week_ending' date (typically the Sunday of that week).
 * A record is "active" if it belongs to the current week's cycle (Friday to Thursday).
 */

/**
 * Performs a hard cleanup of the communication_logs table.
 * Removes any records that are outside the current weekly window.
 */
export const performCommunicationCleanup = async () => {
  try {
    const result = await pool.query(`
      DELETE FROM communication_logs
      WHERE NOW() >= (week_ending + INTERVAL '4 days' + ((5 - EXTRACT(ISODOW FROM (week_ending + INTERVAL '4 days'))::integer + 7) % 7) * INTERVAL '1 day')::date + TIME '09:00:00'
    `);
    if ((result.rowCount ?? 0) > 0) {
      console.log(`[Cleanup] Deleted ${result.rowCount} expired weekly communication log(s) from database.`);
    }
  } catch (err: any) {
    console.error('[Cleanup] performCommunicationCleanup error:', err.message || err);
  }
};

/**
 * Returns a filter for the active communication log window.
 */
export const getActiveCommLogSQL = () => {
  return "1=1"; // Keep 1=1 as cleanup utility already purges expired records
};
