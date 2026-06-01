import pool from '../config/database';

async function run() {
  try {
    // List all teachers with their dept and dean status
    const teachers = await pool.query(`
      SELECT u.name, u.digital_id, u.email, t.id as teacher_id,
             t.department, t.is_dean, t.subjects
      FROM teachers t
      JOIN users u ON t.user_id = u.id
      ORDER BY u.name
      LIMIT 15
    `);

    console.log(`\nTotal teachers found: ${teachers.rows.length}`);
    teachers.rows.forEach((r: any) =>
      console.log(`  [${r.digital_id}] ${r.name} | dept: ${r.department || 'N/A'} | is_dean: ${r.is_dean} | email: ${r.email}`)
    );

    process.exit(0);
  } catch (err: any) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
