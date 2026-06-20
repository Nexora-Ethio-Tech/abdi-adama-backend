import pool from '../config/database';

async function main() {
  try {
    const res = await pool.query(`
      SELECT ea.id, ea.user_id, u.name, ea.date::text as date_str, ea.sign_in_time, ea.status, ea.recorded_by, ea.created_at
      FROM employee_attendance ea
      JOIN users u ON u.id = ea.user_id
      WHERE ea.recorded_by = 'zk-machine'
      ORDER BY ea.created_at DESC
      LIMIT 3;
    `);
    console.log('--- Last 3 zk-machine records ---');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Error running script:', err);
  } finally {
    await pool.end();
  }
}

main();
