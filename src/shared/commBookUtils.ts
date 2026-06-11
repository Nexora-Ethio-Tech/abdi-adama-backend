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
    // A log expires after its week_ending Thursday has fully passed.
    // We delete any log where the week_ending date is in a previous week
    // (i.e., the week_ending Thursday is strictly before the start of the current week's Friday).
    const result = await pool.query(`
      DELETE FROM communication_logs
      WHERE week_ending < (
        -- Find the most recent Friday (start of current cycle)
        CURRENT_DATE - (((EXTRACT(ISODOW FROM CURRENT_DATE)::int + 2) % 7))::int * INTERVAL '1 day'
      )
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
