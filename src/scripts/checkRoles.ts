import pool from '../config/database';

async function run() {
  try {
    const r = await pool.query(
      `SELECT id, digital_id, name, email, role, status
       FROM users
       WHERE role IN ('super-admin', 'vice-principal')
       ORDER BY role, name
       LIMIT 20`
    );
    console.log(JSON.stringify(r.rows, null, 2));
    process.exit(0);
  } catch (err: any) {
    console.error(err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
