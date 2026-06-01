import pool from '../config/database';

async function run() {
  try {
    console.log("=== RUNNING DATABASE SELF-HEAL FOR COURSES ===");

    // 1. Get all teachers
    const teachersRes = await pool.query(`
      SELECT t.id as teacher_uuid, u.name, u.digital_id, t.department, t.subjects
      FROM teachers t
      JOIN users u ON t.user_id = u.id
    `);
    const teachersMap = new Map<string, any>();
    teachersRes.rows.forEach(t => {
      teachersMap.set(t.teacher_uuid, t);
    });

    // 2. Get all classes
    const classesRes = await pool.query(`
      SELECT id, name, section, grade FROM classes
    `);
    const classesMap = new Map<string, any>();
    classesRes.rows.forEach(c => {
      classesMap.set(c.id, c);
    });

    // 3. Get all class_teachers
    const classTeachersRes = await pool.query(`
      SELECT id, class_id, teacher_id FROM class_teachers
    `);
    
    console.log(`Found ${classTeachersRes.rows.length} class-teacher assignments.`);

    let coursesCreated = 0;

    for (const ct of classTeachersRes.rows) {
      const teacher = teachersMap.get(ct.teacher_id);
      const cls = classesMap.get(ct.class_id);

      if (!teacher || !cls) {
        console.log(`⚠️ Invalid assignment: Teacher or Class not found in database! (CT ID: ${ct.id})`);
        continue;
      }

      // Check if course already exists
      const existingRes = await pool.query(`
        SELECT id FROM courses 
        WHERE class_id = $1 AND teacher_id = $2
      `, [ct.class_id, ct.teacher_id]);

      if (existingRes.rows.length > 0) {
        console.log(`✅ Course already exists for Teacher: ${teacher.name} | Class: ${cls.name} Section ${cls.section}`);
        continue;
      }

      // Determine subject name
      let subjectName = "General Subject";
      if (teacher.digital_id === 'TCH-MB-0007' || teacher.name.toLowerCase().includes('alemu')) {
        subjectName = "Biology";
      } else if (teacher.department && teacher.department !== 'N/A' && teacher.department !== 'General') {
        subjectName = teacher.department;
      } else if (teacher.subjects && teacher.subjects.length > 0) {
        subjectName = teacher.subjects[0];
      }

      const cleanClassName = (cls.name || `Grade ${cls.grade}`).replace(/\s+/g, '');
      const subjectCode = `${subjectName.substring(0, 4).toUpperCase()}-${cleanClassName}-${(cls.section || '1').replace(/\s+/g, '')}`;

      // Insert course
      const insertRes = await pool.query(`
        INSERT INTO courses (name, code, teacher_id, class_id, progress)
        VALUES ($1, $2, $3, $4, 0)
        RETURNING *
      `, [subjectName, subjectCode, ct.teacher_id, ct.class_id]);

      coursesCreated++;
      console.log(`🆕 Created Course: ${subjectName} (${subjectCode}) for Teacher: ${teacher.name} | Class: ${cls.name} Section ${cls.section}`);
    }

    console.log(`\n🎉 Self-heal complete! Created ${coursesCreated} courses.`);
    process.exit(0);
  } catch (err: any) {
    console.error("❌ Error in self-heal script:", err.message);
    process.exit(1);
  }
}

run();
