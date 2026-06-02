import pool from '../config/database';

async function main() {
  try {
    const res = await pool.query(`SELECT * FROM system_settings;`);
    console.log('--- System Settings ---');
    console.log(res.rows);
  } catch (err) {
    console.error('Error fetching system settings:', err);
  } finally {
    await pool.end();
  }
}

main();
