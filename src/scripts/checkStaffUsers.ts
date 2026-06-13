import pool from '../config/database';

async function main() {
  try {
    // 1. Get all branches
    const branches = await pool.query('SELECT id, name FROM branches');
    console.log('--- BRANCHES ---');
    console.log(JSON.stringify(branches.rows, null, 2));

    // 2. Get all non-student, non-parent, non-super-admin users
    const users = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, u.status, u.branch_id, b.name as branch_name
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.id
      WHERE u.role NOT IN ('student', 'parent', 'super-admin')
      ORDER BY u.role, u.name
    `);
    console.log('\n--- STAFF USERS ---');
    console.log(JSON.stringify(users.rows, null, 2));

  } catch (err: any) {
    console.error('Error:', err.message || err);
  } finally {
    await pool.end();
  }
}

main();
