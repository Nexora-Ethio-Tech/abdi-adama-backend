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
    // We define "old" as anything where the week_ending is older than the most recent Friday.
    // If today is Friday, Sunday's record is the new one.
    // If today is Thursday, Sunday's record is the one to be deleted tonight.
    
    // Logic: Delete records where week_ending is 5 or more days old.
    // This ensures that a record posted for Sunday stays through the following Thursday and is deleted on Friday morning.
    await pool.query(
      "DELETE FROM communication_logs WHERE week_ending <= CURRENT_DATE - INTERVAL '5 days'"
    );
  } catch (err) {
    console.error('[commBookUtils] Cleanup failed:', err);
  }
};

/**
 * Returns a filter for the active communication log window.
 */
export const getActiveCommLogSQL = () => {
  return "week_ending > CURRENT_DATE - INTERVAL '5 days'";
};
