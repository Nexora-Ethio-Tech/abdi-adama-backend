import pool from '../config/database';

async function main() {
  const tables = ['employee_attendance', 'student_attendance'];
  for (const table of tables) {
    const r = await pool.query(
      `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = '${table}' ORDER BY ordinal_position`
    );
    if (r.rows.length === 0) {
      console.log(`TABLE ${table}: DOES NOT EXIST`);
    } else {
      console.log(`\nTABLE ${table}:`);
      r.rows.forEach((row: any) => console.log(`  ${row.column_name} (${row.data_type}) nullable=${row.is_nullable}`));
    }
  }
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
