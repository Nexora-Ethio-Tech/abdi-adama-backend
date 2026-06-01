import teacherService from '../services/teacher.service';
import pool from '../config/database';

async function main() {
  try {
    const classId = '717afba8-7917-4386-876a-1b2fc4557da1';
    console.log(`=== FETCHING STUDENTS FOR CLASS ID: ${classId} ===`);
    
    // Check if class exists
    const classRes = await pool.query('SELECT * FROM classes WHERE id = $1', [classId]);
    console.log("Class record:", classRes.rows[0]);

    // Check students directly
    const directStudents = await pool.query(`
      SELECT s.id, s.section_id, s.grade, u.name, u.digital_id
      FROM students s
      JOIN users u ON s.user_id = u.id
      WHERE s.section_id = $1
    `, [classId]);
    console.log(`Directly assigned students count: ${directStudents.rows.length}`);
    directStudents.rows.forEach(s => {
      console.log(`  - [ID: ${s.id}] ${s.name} (${s.digital_id}) | Section ID: ${s.section_id} | Grade: ${s.grade}`);
    });

    // Call getStudentRoster
    const roster = await teacherService.getStudentRoster(classId);
    console.log(`Roster length from service: ${roster.length}`);
    roster.forEach(r => {
      console.log(`  - [ID: ${r.id}] Name: ${r.firstName} ${r.lastName} (${r.digitalId})`);
    });

    process.exit(0);
  } catch (err: any) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

main();
