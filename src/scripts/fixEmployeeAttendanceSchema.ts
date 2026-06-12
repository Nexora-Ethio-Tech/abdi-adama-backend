import pool from '../config/database';

/**
 * Migration: Fix employee_attendance table for staff attendance tracking
 *
 * Changes:
 * 1. ALTER recorded_by from UUID → VARCHAR(64) so it can hold both
 *    UUID values (manual entries) and the 'zk-machine' string (biometric entries)
 * 2. ADD sign_in_time VARCHAR(20) — time string (e.g. "08:05 AM") from biometric punch
 * 3. ADD sign_out_time VARCHAR(20) — time string from sign-out punch
 */
async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('🔄 Dropping foreign key constraint on recorded_by...');
    // Must drop the FK constraint before changing column type
    await client.query(`
      ALTER TABLE employee_attendance
        DROP CONSTRAINT IF EXISTS employee_attendance_recorded_by_fkey
    `);
    console.log('✅ FK constraint dropped');

    console.log('🔄 Altering employee_attendance.recorded_by to VARCHAR(64)...');
    // Drop the UUID type constraint so we can store 'zk-machine' strings too
    await client.query(`
      ALTER TABLE employee_attendance
        ALTER COLUMN recorded_by TYPE VARCHAR(64) USING (recorded_by::text)
    `);
    console.log('✅ recorded_by column type changed to VARCHAR(64)');

    console.log('🔄 Adding sign_in_time column if not exists...');
    await client.query(`
      ALTER TABLE employee_attendance
        ADD COLUMN IF NOT EXISTS sign_in_time VARCHAR(20)
    `);
    console.log('✅ sign_in_time column added (or already exists)');

    console.log('🔄 Adding sign_out_time column if not exists...');
    await client.query(`
      ALTER TABLE employee_attendance
        ADD COLUMN IF NOT EXISTS sign_out_time VARCHAR(20)
    `);
    console.log('✅ sign_out_time column added (or already exists)');

    await client.query('COMMIT');
    console.log('\n✅ Migration completed successfully!');
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed, rolled back:', err.message || err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(e => { console.error(e); process.exit(1); });
