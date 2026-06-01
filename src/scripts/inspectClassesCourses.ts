import pool from '../config/database';

async function run() {
  try {
    console.log("=== INSPECTING ALL CLASSES ===");
    const classes = await pool.query(`
      SELECT c.id, c.name, c.section, c.grade, c.branch_id,
             (SELECT COUNT(*) FROM students s WHERE s.section_id = c.id) as enrolled_students
      FROM classes c
    `);
    console.log(`Total classes in DB: ${classes.rows.length}`);
    classes.rows.forEach(c => {
      console.log(`  - [ID: ${c.id}] Name: ${c.name} | Section: ${c.section} | Grade: ${c.grade} | Branch ID: ${c.branch_id} | Enrolled: ${c.enrolled_students}`);
    });

    console.log("\n=== INSPECTING ALL COURSES ===");
    const courses = await pool.query(`
      SELECT co.id, co.name, co.code, co.teacher_id, co.class_id,
             u.name as teacher_name, c.name as class_name, c.section as class_section
      FROM courses co
      LEFT JOIN classes c ON co.class_id = c.id
      LEFT JOIN teachers t ON co.teacher_id = t.id
      LEFT JOIN users u ON t.user_id = u.id
    `);
    console.log(`Total courses in DB: ${courses.rows.length}`);
    courses.rows.forEach(co => {
      console.log(`  - [ID: ${co.id}] Name: ${co.name} | Code: ${co.code} | Teacher: ${co.teacher_name || 'NONE'} | Class: ${co.class_name || 'NONE'} Section ${co.class_section || 'N/A'}`);
    });

    process.exit(0);
  } catch (err: any) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

run();
