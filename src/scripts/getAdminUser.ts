import pool from '../config/database';

async function main() {
  const result = await pool.query(`
    SELECT id, digital_id, username, email, name, role, branch_id
    FROM users
    WHERE role = 'school-admin'
  `);
  console.log(result.rows);
  process.exit(0);
}
main();
