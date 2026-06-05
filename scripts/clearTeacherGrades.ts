import pool from '../src/config/database';

/**
 * Delete all grades and submission locks that belong to the teacher identified by
 * the provided user id. This removes the data visible to the teacher, the students
 * and the parents, allowing a clean slate.
 *
 * Run with:  ts-node clearTeacherGrades.ts <teacherUserId>
 */
async function clearTeacherGrades(teacherUserId: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Resolve the internal teacher id from the user id
    const teacherRes = await client.query(
      'SELECT id FROM teachers WHERE user_id = $1',
      [teacherUserId]
    );
    if (teacherRes.rows.length === 0) {
      throw new Error('Teacher not found');
    }
    const teacherId = teacherRes.rows[0].id;

    // 1️⃣ Remove lock records – they prevent further edits
    await client.query(
      'DELETE FROM grade_submissions WHERE teacher_id = $1',
      [teacherId]
    );

    // 2️⃣ Remove grade rows for all courses owned by this teacher
    await client.query(
      `DELETE FROM grades
        WHERE course_id IN (SELECT id FROM courses WHERE teacher_id = $1)`,
      [teacherId]
    );

    await client.query('COMMIT');
    console.log('✅ All grades and submissions cleared for teacher', teacherUserId);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to clear grades:', error);
  } finally {
    client.release();
  }
}

// When executed directly from the command line
if (require.main === module) {
  const [, , teacherUserId] = process.argv;
  if (!teacherUserId) {
    console.error('Usage: ts-node clearTeacherGrades.ts <teacherUserId>');
    process.exit(1);
  }
  clearTeacherGrades(teacherUserId).then(() => process.exit());
}
