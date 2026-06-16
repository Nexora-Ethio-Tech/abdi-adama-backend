import pool from '../config/database';

async function main() {
  try {
    const res = await pool.query(`
      SELECT DISTINCT type, (student_id IS NULL) AS is_manual
      FROM finance_transactions;
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Error executing query:', err);
  } finally {
    await pool.end();
  }
}

main();
