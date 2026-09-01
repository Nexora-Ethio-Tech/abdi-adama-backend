import pool from '../config/database';
import logger from '../utils/logger';

/**
 * Weekly Plans Cleanup Job
 * Removes all weekly plans every Friday evening at 6:00 PM
 * Teachers can then create new plans for the following week
 */
export async function startWeeklyPlansCleanupJob(): Promise<void> {
  // Check every hour if it's Friday at 6:00 PM
  const cleanupInterval = setInterval(async () => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 5 = Friday
    const hour = now.getHours();

    // Run cleanup every Friday at 18:00 (6:00 PM)
    if (dayOfWeek === 5 && hour === 18) {
      try {
        await cleanupWeeklyPlans();
      } catch (error) {
        logger.error('Error running weekly plans cleanup job:', error);
      }
    }
  }, 60 * 60 * 1000); // Check every hour

  // Clean up the interval when process exits
  process.on('exit', () => clearInterval(cleanupInterval));

  logger.info('✓ Weekly Plans Cleanup Job started (runs Friday 6:00 PM)');
}

/**
 * Delete all weekly plans from the database
 * This allows teachers to submit fresh plans for the next week
 */
export async function cleanupWeeklyPlans(): Promise<void> {
  const client = await pool.connect();
  let plansCount = 0;
  let cleanupCompleted = false;
  
  try {
    await client.query('BEGIN');

    // Count plans before deletion
    const countResult = await client.query('SELECT COUNT(*) as count FROM weekly_plans');
    plansCount = parseInt(countResult.rows[0]?.count || '0', 10);

    if (plansCount === 0) {
      logger.info('Weekly Plans Cleanup: No plans to delete');
      await client.query('COMMIT');
      return;
    }

    // Delete all weekly plans
    await client.query('DELETE FROM weekly_plans');

    // Log success
    await client.query('COMMIT');
    cleanupCompleted = true;
    logger.info(`✓ Weekly Plans Cleanup: Deleted ${plansCount} plans from database`);

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error during weekly plans cleanup:', error);
    throw error;
  } finally {
    client.release();
  }

  if (cleanupCompleted) {
    // Audit logging is deliberately outside the transaction and after the
    // checked-out client has been returned to the pool.
    await pool.query(
      `INSERT INTO audit_logs (action, entity_type, description, timestamp)
       VALUES ($1, $2, $3, $4)`,
      ['DELETE_BATCH', 'weekly_plans', `Automatic cleanup: removed ${plansCount} plans`, new Date()]
    ).catch(() => {
      // Audit log table may not exist, ignore error
    });
  }
}

/**
 * Manual cleanup function (for testing or manual trigger)
 * Can be called from an admin endpoint if needed
 */
export async function triggerWeeklyPlansCleanupManually(): Promise<{ deletedCount: number }> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Get count before deletion
    const countResult = await client.query('SELECT COUNT(*) as count FROM weekly_plans');
    const deletedCount = parseInt(countResult.rows[0]?.count || '0', 10);

    // Delete all plans
    await client.query('DELETE FROM weekly_plans');

    await client.query('COMMIT');

    logger.info(`Manual weekly plans cleanup triggered: ${deletedCount} plans deleted`);

    return { deletedCount };

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error during manual weekly plans cleanup:', error);
    throw error;
  } finally {
    client.release();
  }
}
