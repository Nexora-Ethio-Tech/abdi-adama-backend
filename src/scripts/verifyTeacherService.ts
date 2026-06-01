import teacherService from '../services/teacher.service';
import pool from '../config/db';

async function main() {
  try {
    // Let's find Bekele's user record first
    const teacherResult = await pool.query(`
      SELECT u.id as user_id, u.name, t.id as teacher_id
      FROM teachers t 
      JOIN users u ON t.user_id = u.id 
      WHERE u.name ILIKE '%bekele%' 
      LIMIT 1
    `);

    if (teacherResult.rows.length === 0) {
      console.log('No Bekele teacher found.');
      return;
    }

    const { user_id, name, teacher_id } = teacherResult.rows[0];
    console.log(`Testing with teacher: ${name} (User ID: ${user_id}, Teacher ID: ${teacher_id})`);

    // Get assigned classes using teacherService (which expects the user_id as argument)
    const classes = await teacherService.getAssignedClasses(user_id);
    console.log('\n=== Assigned Classes ===');
    console.log(JSON.stringify(classes, null, 2));

    // Get student roster for each assigned class
    for (const cls of classes) {
      console.log(`\n=== Student Roster for Class: ${cls.name} (Section: ${cls.section}, ID: ${cls.id}) ===`);
      const roster = await teacherService.getStudentRoster(cls.id);
      console.log(JSON.stringify(roster, null, 2));
    }

    // Get dashboard
    console.log('\n=== Dashboard Data ===');
    const dashboard = await teacherService.getDashboard(user_id);
    console.log(JSON.stringify(dashboard, null, 2));

  } catch (err: any) {
    console.error('Error during verification:', err);
  } finally {
    await pool.end();
  }
}

main();
