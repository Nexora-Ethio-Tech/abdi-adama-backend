import pool from '../config/database';

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('🔄 Adding lunch_out_time column if not exists...');
    await client.query(`
      ALTER TABLE employee_attendance
        ADD COLUMN IF NOT EXISTS lunch_out_time VARCHAR(20)
    `);
    console.log('✅ lunch_out_time column added');

    console.log('🔄 Adding lunch_in_time column if not exists...');
    await client.query(`
      ALTER TABLE employee_attendance
        ADD COLUMN IF NOT EXISTS lunch_in_time VARCHAR(20)
    `);
    console.log('✅ lunch_in_time column added');

    await client.query('COMMIT');
    console.log('\n✅ Lunch times migration completed successfully!');
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
