import pool from '../config/database';
import { hashPassword } from '../utils/password';
import { requireEnvironmentValue } from '../utils/secureConfig';

async function seedSiloData() {
  const studentPassword = requireEnvironmentValue('SEED_SILO_STUDENT_PASSWORD');
  const client = await pool.connect();
  try {
    console.log('🌱 Starting Silo Database Seeding...');
    await client.query('BEGIN');

    // Ensure progress column exists in silo_enrollments
    await client.query(`
      ALTER TABLE silo_enrollments ADD COLUMN IF NOT EXISTS progress INT DEFAULT 0;
    `);

    // Get all students from users/students tables
    const studentsRes = await client.query(`
      SELECT u.id AS user_id, u.digital_id, u.name, s.grade, s.id AS student_tbl_id
      FROM users u
      JOIN students s ON s.user_id = u.id
      WHERE u.role = 'student'
    `);
    const dbStudents = studentsRes.rows;
    console.log(`Found ${dbStudents.length} students in unified database.`);

    if (dbStudents.length === 0) {
      console.warn('⚠️ No students found in the unified database. Please seed them first.');
      await client.query('ROLLBACK');
      return;
    }

    // Insert into silo_identities
    for (const student of dbStudents) {
      await client.query(`
        INSERT INTO silo_identities (id, school_id, full_name, grade)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (school_id) DO UPDATE
        SET full_name = EXCLUDED.full_name, grade = EXCLUDED.grade;
      `, [student.user_id, student.digital_id, student.name, student.grade]);

      // Also ensure they have a matching record in silo_users for completeness
      const pwHash = await hashPassword(studentPassword);
      await client.query(`
        INSERT INTO silo_users (identity_id, role, password_hash, is_active)
        VALUES ($1, 'Student', $2, TRUE)
        ON CONFLICT (identity_id, role) DO NOTHING;
      `, [student.user_id, pwHash]);
    }
    console.log('✅ Synchronized students to silo_identities and silo_users.');

    // Ensure we have courses in silo_courses
    const courses = [
      { name: 'Mathematics', code: 'MATH-101' },
      { name: 'English Language', code: 'ENG-101' },
      { name: 'Biology', code: 'BIO-101' },
      { name: 'Physics', code: 'PHYS-101' },
      { name: 'Chemistry', code: 'CHEM-101' },
      { name: 'Amharic', code: 'AMH-101' },
      { name: 'Social Studies', code: 'SOC-101' },
    ];

    const seededCourses: Array<{ id: string; name: string; code: string }> = [];

    for (const course of courses) {
      const res = await client.query(`
        INSERT INTO silo_courses (name, code)
        VALUES ($1, $2)
        ON CONFLICT (code) DO UPDATE
        SET name = EXCLUDED.name
        RETURNING id
      `, [course.name, course.code]);
      seededCourses.push({ id: res.rows[0].id, name: course.name, code: course.code });
    }
    console.log(`✅ Ensured ${seededCourses.length} courses in silo_courses.`);

    // Enroll students and insert grades
    const years = ['2025/2026', '2024/2025', '2023/2024'];
    const semesters = [1, 2];

    for (const student of dbStudents) {
      for (const year of years) {
        for (const semester of semesters) {
          for (const course of seededCourses) {
            // Check if enrollment exists
            const existingEnroll = await client.query(`
              SELECT id FROM silo_enrollments 
              WHERE student_id = $1 AND course_id = $2 AND academic_year = $3 AND semester = $4::text
            `, [student.user_id, course.id, year, semester.toString()]);

            let enrollmentId;
            if (existingEnroll.rows.length > 0) {
              enrollmentId = existingEnroll.rows[0].id;
              await client.query(`
                UPDATE silo_enrollments SET progress = 100 WHERE id = $1
              `, [enrollmentId]);
            } else {
              const enrollRes = await client.query(`
                INSERT INTO silo_enrollments (student_id, course_id, academic_year, semester, progress)
                VALUES ($1, $2, $3, $4::text, $5)
                RETURNING id
              `, [student.user_id, course.id, year, semester.toString(), 100]);
              enrollmentId = enrollRes.rows[0].id;
            }

            // Generate grades:
            const quiz10 = Math.round((7 + Math.random() * 3) * 10) / 10;
            const assignment10 = Math.round((7.5 + Math.random() * 2.5) * 10) / 10;
            const mid30 = Math.round((20 + Math.random() * 10) * 10) / 10;
            const final50 = Math.round((35 + Math.random() * 15) * 10) / 10;

            const total = quiz10 + assignment10 + mid30 + final50;

            // Legacy component columns
            const quiz_1 = Math.round((12 + Math.random() * 8) * 10) / 10;
            const quiz_2 = Math.round((12 + Math.random() * 8) * 10) / 10;
            const test_1 = Math.round((28 + Math.random() * 12) * 10) / 10;
            const test_2 = Math.round((28 + Math.random() * 12) * 10) / 10;
            const participation = Math.round((15 + Math.random() * 5) * 10) / 10;
            const mid_exam = Math.round((65 + Math.random() * 35) * 10) / 10;
            const final_exam = Math.round((65 + Math.random() * 35) * 10) / 10;

            // Check if grade row already exists for this enrollment_id
            const existingGrade = await client.query(`
              SELECT id FROM silo_student_grades WHERE enrollment_id = $1
            `, [enrollmentId]);

            if (existingGrade.rows.length > 0) {
              await client.query(`
                UPDATE silo_student_grades SET
                  quiz_10 = $2, assignment_10 = $3, mid_30 = $4, final_50 = $5, total = $6,
                  quiz_1 = $7, quiz_2 = $8, test_1 = $9, test_2 = $10, 
                  participation = $11, mid_exam = $12, final_exam = $13
                WHERE enrollment_id = $1
              `, [
                enrollmentId,
                quiz10, assignment10, mid30, final50, total,
                quiz_1, quiz_2, test_1, test_2,
                participation, mid_exam, final_exam
              ]);
            } else {
              await client.query(`
                INSERT INTO silo_student_grades (
                  enrollment_id, student_id,
                  quiz_10, assignment_10, mid_30, final_50, total,
                  quiz_1, quiz_2, test_1, test_2, 
                  participation, mid_exam, final_exam
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
              `, [
                enrollmentId, student.user_id,
                quiz10, assignment10, mid30, final50, total,
                quiz_1, quiz_2, test_1, test_2,
                participation, mid_exam, final_exam
              ]);
            }
          }
        }
      }
    }

    console.log('✅ Successfully enrolled and graded all students for all academic periods.');
    await client.query('COMMIT');
    console.log('🎉 Silo Seeding Completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', err);
  } finally {
    client.release();
  }
}

seedSiloData().then(() => pool.end());
