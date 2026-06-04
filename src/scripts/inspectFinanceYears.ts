import pool from '../config/database';

async function main() {
  const r1 = await pool.query(`SELECT DISTINCT ethiopic_year FROM finance_transactions`);
  console.log('Distinct ethiopic_year:', r1.rows);

  const r2 = await pool.query(`SELECT DISTINCT EXTRACT(YEAR FROM date) as year FROM finance_transactions`);
  console.log('Distinct calendar years:', r2.rows);

  const r3 = await pool.query(`SELECT COUNT(*) as count FROM finance_transactions`);
  console.log('Total transaction count:', r3.rows[0].count);

  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
