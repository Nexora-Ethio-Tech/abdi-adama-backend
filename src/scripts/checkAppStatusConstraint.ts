import pool from '../config/database';

async function main() {
  try {
    // Check the status column constraint on pending_applications
    const constraintRes = await pool.query(`
      SELECT conname, pg_get_constraintdef(c.oid) as def
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      WHERE t.relname = 'pending_applications'
        AND c.contype = 'c'
    `);
    console.log('--- pending_applications check constraints ---');
    console.log(constraintRes.rows);

    // Also check distinct status values currently in DB
    const statusRes = await pool.query(`SELECT DISTINCT status FROM pending_applications`);
    console.log('\n--- Current distinct status values ---');
    console.log(statusRes.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}
main();
