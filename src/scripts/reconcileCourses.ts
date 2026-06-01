import pool from '../config/database';

async function run() {
  const client = await pool.connect();
  try {
    console.log("=== RUNNING DATABASE RECONCILIATION FOR TEACHER PORTAL ===");
    await client.query('BEGIN');

    // 1. Clean up class_teachers (Ensure each teacher has only one homeroom assignment, the latest one)
    console.log("\n1. Auditing class_teachers (homeroom assignments)...");
    const teachersWithMultipleHomerooms = await client.query(`
      SELECT teacher_id, COUNT(*) 
      FROM class_teachers 
      GROUP BY teacher_id 
      HAVING COUNT(*) > 1
    `);

    for (const row of teachersWithMultipleHomerooms.rows) {
      const teacherId = row.teacher_id;
      // Get the latest assignment
      const assignments = await client.query(`
        SELECT id, class_id, assigned_at 
        FROM class_teachers 
        WHERE teacher_id = $1 
        ORDER BY assigned_at DESC
      `, [teacherId]);

      const latestId = assignments.rows[0].id;
      console.log(`Teacher ${teacherId} has ${assignments.rows.length} homeroom assignments. Keeping latest ID: ${latestId}`);

      // Delete the older assignments
      const deleteResult = await client.query(`
        DELETE FROM class_teachers 
        WHERE teacher_id = $1 AND id != $2
        RETURNING class_id
      `, [teacherId, latestId]);

      for (const delRow of deleteResult.rows) {
        console.log(`  Removed old homeroom assignment for class ID: ${delRow.class_id}`);
      }
    }

    // 2. Synchronize courses from schedule_structure
    console.log("\n2. Synchronizing courses from schedule_structure...");
    const structureRows = await client.query(`
      SELECT ss.class_id, ss.teacher_id, ss.subject, c.name as class_name, c.section, ss.branch_id
      FROM schedule_structure ss
      JOIN classes c ON ss.class_id = c.id
    `);

    let coursesCreated = 0;
    let coursesUpdated = 0;

    for (const row of structureRows.rows) {
      const { class_id, teacher_id, subject, class_name, section } = row;
      const cleanSubject = (subject || '').trim();
      const cleanClassName = (class_name || '').replace(/\s+/g, '');
      const cleanSection = (section || '').replace(/\s+/g, '');
      const subjectCode = `${cleanSubject.substring(0, 4).toUpperCase()}-${cleanClassName}-${cleanSection}`;

      // Check if course already exists for this class and subject name
      const courseCheck = await client.query(`
        SELECT id, teacher_id FROM courses 
        WHERE class_id = $1 AND name = $2
      `, [class_id, cleanSubject]);

      if (courseCheck.rows.length === 0) {
        // Create new course
        await client.query(`
          INSERT INTO courses (name, code, teacher_id, class_id, progress)
          VALUES ($1, $2, $3, $4, 0)
        `, [cleanSubject, subjectCode, teacher_id, class_id]);
        coursesCreated++;
        console.log(`  Created course: "${cleanSubject}" (${subjectCode}) for class ${class_name} ${section}`);
      } else {
        const existing = courseCheck.rows[0];
        if (existing.teacher_id !== teacher_id) {
          // Update teacher assignment
          await client.query(`
            UPDATE courses 
            SET teacher_id = $1, code = $2 
            WHERE id = $3
          `, [teacher_id, subjectCode, existing.id]);
          coursesUpdated++;
          console.log(`  Updated course: "${cleanSubject}" (${subjectCode}) for class ${class_name} ${section} (new teacher: ${teacher_id})`);
        }
      }
    }
    console.log(`Schedule structure sync completed: Created ${coursesCreated}, Updated ${coursesUpdated}.`);

    // 3. Clean up courses table for teachers who are no longer teaching those courses according to schedule structure
    console.log("\n3. Cleaning up orphaned course teacher assignments...");
    // A teacher should not be assigned to a course unless:
    // a) It is in the schedule_structure for that teacher/class/subject
    // b) Or they are the homeroom teacher and the course is a legacy auto-created one (but wait, we only want subject assignments in Grade Entry)
    // Let's set teacher_id to null for courses that are NOT in schedule_structure for that teacher
    const activeCourses = await client.query(`
      SELECT id, teacher_id, class_id, name FROM courses WHERE teacher_id IS NOT NULL
    `);

    let coursesCleared = 0;
    for (const course of activeCourses.rows) {
      // Check if this teacher is assigned to this class and subject in schedule_structure
      const ssCheck = await client.query(`
        SELECT id FROM schedule_structure 
        WHERE class_id = $1 AND teacher_id = $2 AND TRIM(subject) = $3
      `, [course.class_id, course.teacher_id, course.name.trim()]);

      if (ssCheck.rows.length === 0) {
        // If not in schedule_structure, set teacher_id to null so it doesn't appear in Grade Entry
        await client.query(`
          UPDATE courses SET teacher_id = NULL WHERE id = $1
        `, [course.id]);
        coursesCleared++;
        console.log(`  Cleared teacher assignment from course "${course.name}" for class ID ${course.class_id}`);
      }
    }
    console.log(`Orphaned course cleanup completed: Cleared ${coursesCleared} assignments.`);

    await client.query('COMMIT');
    console.log("\n🎉 Database reconciliation successfully completed!");
    process.exit(0);
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error("❌ Error in reconciliation script:", err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

run();
