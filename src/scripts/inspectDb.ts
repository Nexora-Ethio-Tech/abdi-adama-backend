import pool from '../config/database';

async function main() {
  try {
    const identities = await pool.query(`SELECT COUNT(*) FROM silo_identities;`);
    console.log('Count of silo_identities:', identities.rows[0].count);

    const users = await pool.query(`SELECT COUNT(*) FROM users WHERE role = 'student';`);
    console.log('Count of students in users table:', users.rows[0].count);

    const siloUsers = await pool.query(`SELECT COUNT(*) FROM silo_users;`);
    console.log('Count of silo_users:', siloUsers.rows[0].count);

    const enrollments = await pool.query(`SELECT COUNT(*) FROM silo_enrollments;`);
    console.log('Count of silo_enrollments:', enrollments.rows[0].count);

    console.log('\nSample silo_identities:');
    const sampleIds = await pool.query(`SELECT * FROM silo_identities LIMIT 3;`);
    console.log(sampleIds.rows);

    console.log('\nSample users (student):');
    const sampleUsers = await pool.query(`SELECT id, username, email, role, digital_id FROM users WHERE role = 'student' LIMIT 3;`);
    console.log(sampleUsers.rows);

    console.log('\nSample silo_enrollments:');
    const sampleEnrollments = await pool.query(`SELECT * FROM silo_enrollments LIMIT 3;`);
    console.log(sampleEnrollments.rows);

  } catch (err) {
    console.error('Error: ', err);
  } finally {
    await pool.end();
  }
}

main();
