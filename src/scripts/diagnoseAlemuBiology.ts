import pool from '../config/database';

async function run() {
  try {
    console.log("=== DIAGNOSING BIOLOGY TEACHER (ALEMU) ===");

    // 1. Find teacher Alemu
    const teacherResult = await pool.query(`
      SELECT t.id as teacher_uuid, u.id as user_uuid, u.name, u.digital_id, t.department, t.subjects
      FROM teachers t
      JOIN users u ON t.user_id = u.id
      WHERE u.name ILIKE '%Alemu%'
    `);
    
    if (teacherResult.rows.length === 0) {
      console.log("❌ Teacher named 'Alemu' not found in database!");
      
      // List first 5 teachers as sanity check
      const someTeachers = await pool.query(`
        SELECT u.name, u.digital_id, t.id FROM teachers t JOIN users u ON t.user_id = u.id LIMIT 5
      `);
      console.log("Some available teachers in database:", someTeachers.rows);
      process.exit(0);
    }

    const teacher = teacherResult.rows[0];
    console.log("Found teacher record:", teacher);

    // 2. Look up courses assigned to this teacher
    const coursesResult = await pool.query(`
      SELECT co.*, c.name as class_name, c.section as class_section, c.grade as class_grade
      FROM courses co
      LEFT JOIN classes c ON co.class_id = c.id
      WHERE co.teacher_id = $1
    `, [teacher.teacher_uuid]);

    console.log(`\nFound ${coursesResult.rows.length} courses directly assigned to this teacher in 'courses' table:`);
    coursesResult.rows.forEach((c: any) => {
      console.log(`  - [Course ID: ${c.id}] Name: ${c.name} | Code: ${c.code} | Class ID: ${c.class_id} (${c.class_name} Section ${c.class_section})`);
    });

    // 3. Look up class_teachers links
    const classTeachersResult = await pool.query(`
      SELECT ct.*, c.name as class_name, c.section as class_section
      FROM class_teachers ct
      JOIN classes c ON ct.class_id = c.id
      WHERE ct.teacher_id = $1
    `, [teacher.teacher_uuid]);

    console.log(`\nFound ${classTeachersResult.rows.length} records in 'class_teachers':`);
    classTeachersResult.rows.forEach((ct: any) => {
      console.log(`  - Class: ${ct.class_name} Section ${ct.class_section} | Subject: ${ct.subject || 'N/A'}`);
    });

    // 4. Look up classes assigned to this teacher (as class-master/homeroom)
    const classesResult = await pool.query(`
      SELECT id, name, section, grade, teacher_id FROM classes WHERE teacher_id = $1
    `, [teacher.teacher_uuid]);

    console.log(`\nFound ${classesResult.rows.length} classes where they are the homeroom teacher:`);
    classesResult.rows.forEach((c: any) => {
      console.log(`  - Class: ${c.name} Section ${c.section} | Grade: ${c.grade}`);
    });

    // 5. Look up some Biology courses and classes in database to see where they are
    const biologyCourses = await pool.query(`
      SELECT co.id, co.name, co.teacher_id, co.class_id, c.name as class_name, u.name as teacher_name
      FROM courses co
      LEFT JOIN classes c ON co.class_id = c.id
      LEFT JOIN teachers t ON co.teacher_id = t.id
      LEFT JOIN users u ON t.user_id = u.id
      WHERE co.name ILIKE '%Biology%'
    `);
    console.log(`\nBiology courses in DB:`, biologyCourses.rows);

    process.exit(0);
  } catch (err: any) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

run();
