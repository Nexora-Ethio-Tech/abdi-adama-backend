import pool from '../config/database';

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('🔄 Adding is_late_arrival column if not exists...');
    await client.query(`
      ALTER TABLE employee_attendance
        ADD COLUMN IF NOT EXISTS is_late_arrival BOOLEAN NOT NULL DEFAULT FALSE
    `);
    console.log('✅ is_late_arrival column added');

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

main().catch(e => { console.error(e); process.exit(1); });
