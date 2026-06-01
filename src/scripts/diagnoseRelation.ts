import pool from '../config/db';

async function run() {
  console.log('--- RELATION DIAGNOSTIC ---');
  try {
    // 1. Check Parent
    const parentRes = await pool.query(
      `SELECT u.id AS user_id, u.name, u.email, u.role, u.digital_id
       FROM users u
       WHERE u.digital_id = $1`,
      ['PRT-MB-0020']
    );
    console.log('\n1. Parent User Info:');
    console.log(parentRes.rows);

    if (parentRes.rows.length === 0) {
      console.log('❌ Parent not found in users table by digital_id PRT-MB-0020');
      return;
    }

    const parentUserId = parentRes.rows[0].user_id;

    // Check parents profile
    const parentProfileRes = await pool.query(
      `SELECT * FROM parents WHERE user_id = $1`,
      [parentUserId]
    );
    console.log('\nParent Profile Info:');
    console.log(parentProfileRes.rows);

    if (parentProfileRes.rows.length === 0) {
      console.log('❌ Parent Profile NOT found in parents table for user_id:', parentUserId);
      return;
    }

    const parentProfileId = parentProfileRes.rows[0].id;

    // 2. Check linked students in parent_student
    const parentStudentRes = await pool.query(
      `SELECT ps.*, s.grade, u.name AS student_name, u.digital_id AS student_digital_id
       FROM parent_student ps
       JOIN students s ON ps.student_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE ps.parent_id = $1`,
      [parentProfileId]
    );
    console.log('\n2. Linked Students in parent_student table:');
    console.log(parentStudentRes.rows);

    // 3. Check Students explicitly by digital_id
    console.log('\n3. Target Students Info:');
    const studentsRes = await pool.query(
      `SELECT s.id AS student_id, u.name, u.digital_id, s.branch_id, s.grade
       FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE u.digital_id IN ('STD-MB-0003', 'STD-MB-0012')`
    );
    console.log(studentsRes.rows);

    for (const student of studentsRes.rows) {
      console.log(`\n--- Details for Student: ${student.name} (${student.digital_id}) ---`);

      // Link check
      const isLinked = parentStudentRes.rows.some(r => r.student_id === student.student_id);
      console.log(`Is linked to parent PRT-MB-0020?`, isLinked ? '✅ YES' : '❌ NO');

      // Check driver/route assignment
      const routeRes = await pool.query(
        `SELECT sr.*, r.name AS route_name, r.driver_id, u.name AS driver_name
         FROM student_routes sr
         JOIN routes r ON sr.route_id = r.id
         LEFT JOIN users u ON r.driver_id = u.id
         WHERE sr.student_id = $1`,
        [student.student_id]
      );
      console.log('Assigned Routes:', routeRes.rows);

      if (routeRes.rows.length > 0) {
        for (const r of routeRes.rows) {
          if (r.driver_id) {
            const noticesRes = await pool.query(
              `SELECT id, title, content, created_at, sender_id
               FROM logistics_notices
               WHERE sender_id = $1 AND deleted_at IS NULL`,
              [r.driver_id]
            );
            console.log(`Driver notices (sender_id: ${r.driver_id}):`, noticesRes.rows);
          } else {
            console.log('⚠️ Warning: Assigned route does not have an assigned driver (driver_id is null)');
          }
        }
      } else {
        console.log('❌ Student is NOT assigned to any bus route in student_routes!');
      }

      // Check clinic messages
      const clinicRes = await pool.query(
        `SELECT id, text, sender_role, created_at
         FROM clinic_chat_messages
         WHERE student_id = $1`,
        [student.student_id]
      );
      console.log(`Clinic messages (count: ${clinicRes.rows.length}):`);
      console.log(clinicRes.rows);
    }

  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
