import teacherService from '../services/teacher.service';
import pool from '../config/database';

async function main() {
  try {
    // 1. Find Alemu
    const teacherResult = await pool.query(`
      SELECT u.id as user_id, u.name, t.id as teacher_id
      FROM teachers t 
      JOIN users u ON t.user_id = u.id 
      WHERE u.name ILIKE '%alemu%' 
      LIMIT 1
    `);

    if (teacherResult.rows.length === 0) {
      console.log('❌ Alemu teacher not found.');
      return;
    }

    const { user_id, name, teacher_id } = teacherResult.rows[0];
    console.log(`Testing with teacher: ${name} (User ID: ${user_id}, Teacher ID: ${teacher_id})`);

    // 2. Call getAssignedClasses with purpose = 'grades'
    console.log('\n=== Calling getAssignedClasses(user_id, "grades") ===');
    const classes = await teacherService.getAssignedClasses(user_id, 'grades');
    console.log(JSON.stringify(classes, null, 2));

    // 3. Get student roster for the class
    if (classes.length > 0) {
      const cls = classes[0];
      const rosterClassId = cls.class_id || cls.id;
      console.log(`\n=== Calling getStudentRoster(${rosterClassId}) ===`);
      const roster = await teacherService.getStudentRoster(rosterClassId);
      console.log(`Roster length: ${roster.length}`);
      console.log("First student from roster:", roster[0]);
    }

    process.exit(0);
  } catch (err: any) {
    console.error('❌ Error during verification:', err);
    process.exit(1);
  }
}

main();
