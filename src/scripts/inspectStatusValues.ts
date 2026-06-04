import pool from '../config/database';

async function main() {
  const r1 = await pool.query(`SELECT DISTINCT status FROM students`);
  console.log('Student statuses:', r1.rows);

  const r2 = await pool.query(`SELECT DISTINCT fee_approval_status FROM students`);
  console.log('Student fee approval statuses:', r2.rows);

  const r3 = await pool.query(`SELECT DISTINCT status FROM users`);
  console.log('User statuses:', r3.rows);

  const r4 = await pool.query(`SELECT DISTINCT status FROM loans`);
  console.log('Loan statuses:', r4.rows);

  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
