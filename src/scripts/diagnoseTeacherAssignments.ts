import pool from '../config/database';

async function diagnoseTeacherAssignments() {
  try {
    console.log('=== TEACHER ASSIGNMENT DIAGNOSTIC ===\n');

    // 1. Find Alemu's user and teacher records
    const userResult = await pool.query(`
      SELECT u.id as user_id, u.name, u.email, u.role,
             t.id as teacher_id, t.branch_id, t.subjects, t.department
      FROM users u
      LEFT JOIN teachers t ON t.user_id = u.id
      WHERE LOWER(u.name) LIKE '%alemu%'
    `);
    console.log('=== 1. Alemu User + Teacher Records ===');
    console.table(userResult.rows);
    
    if (userResult.rows.length === 0) {
      console.log('ERROR: No user found with name containing "alemu"');
      return;
    }

    const teacher = userResult.rows[0];
    const teacherId = teacher.teacher_id;
    const userId = teacher.user_id;
    console.log(`\nUsing teacher.id = ${teacherId}, user.id = ${userId}\n`);

    // 2. Check class_teachers records
    const classTeachersResult = await pool.query(`
      SELECT ct.id, ct.class_id, ct.teacher_id, ct.branch_id, ct.assigned_at,
             c.name as class_name, c.section, c.grade, c.teacher_id as class_teacher_id_col
      FROM class_teachers ct
      JOIN classes c ON ct.class_id = c.id
      WHERE ct.teacher_id = $1
      ORDER BY c.name, c.section
    `, [teacherId]);
    console.log('=== 2. class_teachers Records (Homeroom Assignments) ===');
    console.table(classTeachersResult.rows);

    // 3. Check courses records
    const coursesResult = await pool.query(`
      SELECT co.id as course_id, co.name as subject, co.code, co.teacher_id,
             co.class_id, c.name as class_name, c.section, c.grade,
             c.teacher_id as class_teacher_id_col
      FROM courses co
      JOIN classes c ON co.class_id = c.id
      WHERE co.teacher_id = $1
      ORDER BY c.name, c.section
    `, [teacherId]);
    console.log('=== 3. courses Records (Subject Assignments) ===');
    console.table(coursesResult.rows);

    // 4. Check classes where teacher_id column is set
    const classesDirectResult = await pool.query(`
      SELECT id, name, section, grade, teacher_id, branch_id
      FROM classes
      WHERE teacher_id = $1
    `, [teacherId]);
    console.log('=== 4. classes.teacher_id Records (Legacy Direct Assignments) ===');
    console.table(classesDirectResult.rows);

    // 5. Now simulate what purpose=grades returns
    console.log('\n=== 5. SIMULATED purpose=grades Query (current logic) ===');
    const gradesResult = await pool.query(`
      SELECT 
        co.id AS course_id,
        c.id AS class_id,
        c.name,
        c.section,
        c.grade AS grade_level,
        co.name AS subject,
        EXISTS (
          SELECT 1 FROM class_teachers ct 
          WHERE ct.class_id = c.id AND ct.teacher_id = $1
        ) AS in_class_teachers,
        (c.teacher_id = $1) AS in_classes_teacher_id_col,
        NOT EXISTS (
          SELECT 1 FROM class_teachers ct 
          WHERE ct.class_id = c.id AND ct.teacher_id = $1
        ) AND c.teacher_id IS DISTINCT FROM $1 AS would_be_included
      FROM courses co
      JOIN classes c ON co.class_id = c.id
      WHERE co.teacher_id = $1
      ORDER BY c.name, c.section
    `, [teacherId]);
    console.table(gradesResult.rows);

    // 6. Simulate what purpose=attendance returns
    console.log('\n=== 6. SIMULATED purpose=attendance Query (current logic) ===');
    const attendanceResult = await pool.query(`
      WITH combined AS (
        SELECT c.id AS class_id, c.name, c.section, c.grade, 'class_teachers' as source
        FROM class_teachers ct JOIN classes c ON ct.class_id = c.id WHERE ct.teacher_id = $1
        UNION
        SELECT id, name, section, grade, 'classes.teacher_id' as source
        FROM classes WHERE teacher_id = $1
      )
      SELECT * FROM combined ORDER BY name, section
    `, [teacherId]);
    console.table(attendanceResult.rows);

    // 7. Check all Grade 12 classes and their teacher assignments
    console.log('\n=== 7. All Grade 12 Classes with Teacher Assignments ===');
    const grade12Result = await pool.query(`
      SELECT 
        c.id, c.name, c.section, c.grade, c.teacher_id as direct_teacher_id,
        (SELECT string_agg(t2.id::text || ' (' || u2.name || ')', ', ')
         FROM class_teachers ct2
         JOIN teachers t2 ON ct2.teacher_id = t2.id
         JOIN users u2 ON t2.user_id = u2.id
         WHERE ct2.class_id = c.id) as homeroom_teachers,
        (SELECT string_agg(co.name || ' → ' || u3.name, ', ')
         FROM courses co
         JOIN teachers t3 ON co.teacher_id = t3.id
         JOIN users u3 ON t3.user_id = u3.id
         WHERE co.class_id = c.id) as subject_teachers_courses
      FROM classes c
      WHERE LOWER(c.name) LIKE '%12%' OR c.grade = '12'
      ORDER BY c.name, c.section
    `);
    console.log('Grade 12 classes:');
    console.table(grade12Result.rows);

    console.log('\n=== DIAGNOSIS COMPLETE ===');
    console.log('\nKey insight:');
    console.log('- "in_class_teachers = true" means this course assignment would be EXCLUDED from Grade Entry');
    console.log('- "would_be_included = true" means this course WOULD appear in Grade Entry');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

diagnoseTeacherAssignments();
