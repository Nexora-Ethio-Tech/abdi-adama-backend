import pool from '../config/database';

async function main() {
  // Inspect employee_attendance column details including data type
  const r = await pool.query(`
    SELECT column_name, data_type, udt_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'employee_attendance'
    ORDER BY ordinal_position
  `);
  console.log('employee_attendance columns:');
  console.log(JSON.stringify(r.rows, null, 2));
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
