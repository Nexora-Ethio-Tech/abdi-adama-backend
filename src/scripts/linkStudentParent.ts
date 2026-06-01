import pool from '../config/db';

async function run() {
  console.log('--- LINKING STUDENT AND PARENT ---');
  try {
    const parentProfileId = 'd2915cf9-bb3e-4227-8efc-08eb8cbdd5bb'; // PRT-MB-0020
    const studentId = '36b7725b-86ca-4596-9fee-b2f5656d6d35'; // STD-MB-0003

    // Insert the link
    const result = await pool.query(
      `INSERT INTO parent_student (parent_id, student_id) 
       VALUES ($1, $2) 
       ON CONFLICT DO NOTHING`,
      [parentProfileId, studentId]
    );
    console.log('✅ Link inserted successfully!', result.rowCount);

    // Verify parent's linked students now
    const parentStudentRes = await pool.query(
      `SELECT ps.*, s.grade, u.name AS student_name, u.digital_id AS student_digital_id
       FROM parent_student ps
       JOIN students s ON ps.student_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE ps.parent_id = $1`,
      [parentProfileId]
    );
    console.log('\nUpdated Linked Students:');
    console.log(parentStudentRes.rows);

  } catch (err: any) {
    console.error('Error linking:', err.message);
  } finally {
    await pool.end();
  }
}

run();
