import pool from '../config/db';

// Helper to resolve student
const resolveStudentRecord = async (identityOrStudentId: string) => {
  const result = await pool.query(
    `SELECT s.id, s.user_id, s.grade, s.section_id, s.branch_id,
            u.name AS student_name,
            cl.name AS class_name,
            cl.section AS section_name
     FROM students s
     JOIN users u ON s.user_id = u.id
     LEFT JOIN classes cl ON s.section_id = cl.id
     WHERE s.id::text = $1 OR s.user_id::text = $1
     LIMIT 1`,
    [identityOrStudentId]
  );
  return result.rows[0] || null;
};

// Helper for logistics
const fetchLogisticsAnnouncementsForStudent = async (studentId: string) => {
  const result = await pool.query(
    `SELECT
       n.id::text,
       'Normal'::text AS priority,
       n.title,
       n.content,
       n.created_at AS timestamp,
       'Logistics'::text AS category,
       n.driver_name AS "driverName"
     FROM logistics_notices n
     WHERE n.created_at > NOW() - INTERVAL '60 days'
       AND n.driver_id IN (
         SELECT r.driver_id
         FROM routes r
         JOIN student_routes rm ON r.id = rm.route_id
         WHERE rm.student_id = $1
       )
     ORDER BY n.created_at DESC
     LIMIT 20`,
    [studentId]
  );
  return result.rows;
};

async function test() {
  const studentIds = [
    { digitalId: 'STD-MB-0003', name: 'Haile Kidus' },
    { digitalId: 'STD-MB-0012', name: 'Fistum Alemayo' }
  ];

  for (const s of studentIds) {
    console.log(`\n=================== TESTING FOR ${s.name} (${s.digitalId}) ===================`);

    // Get user row
    const userRes = await pool.query(
      `SELECT id, name, role FROM users WHERE digital_id = $1`,
      [s.digitalId]
    );
    if (userRes.rows.length === 0) {
      console.log(`❌ User row not found for ${s.digitalId}`);
      continue;
    }
    const userRow = userRes.rows[0];
    console.log('User row:', userRow);

    const studentRow = await resolveStudentRecord(userRow.id);
    if (!studentRow) {
      console.log(`❌ Student row not found for user_id ${userRow.id}`);
      continue;
    }
    console.log('Student row:', studentRow);

    // Test logistics
    const logistics = await fetchLogisticsAnnouncementsForStudent(studentRow.id);
    console.log('Logistics Announcements for this student:', logistics);
  }

  await pool.end();
}

test();
