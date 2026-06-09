import pool from '../config/database';

async function main() {
  const collectionsRes = await pool.query('SELECT DISTINCT month FROM student_collections ORDER BY month DESC LIMIT 20');
  console.log('--- student_collections months ---');
  collectionsRes.rows.forEach(r => console.log(r.month));

  const paymentsRes = await pool.query('SELECT DISTINCT month FROM payments ORDER BY month DESC LIMIT 20');
  console.log('--- payments months ---');
  paymentsRes.rows.forEach(r => console.log(r.month));

  await pool.end();
}
main().catch(console.error);
