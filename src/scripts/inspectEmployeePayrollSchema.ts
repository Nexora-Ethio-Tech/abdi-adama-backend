import pool from '../config/database';

async function main() {
  const r = await pool.query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'employee_payroll_profiles' ORDER BY ordinal_position`
  );
  console.log('employee_payroll_profiles columns:');
  r.rows.forEach((row: any) => console.log(`  ${row.column_name} (${row.data_type})`));
  await pool.end();
}

main().catch(console.error);
