import pool from '../config/db';

async function test() {
  console.log('--- TESTING PARENT DASHBOARD ENDPOINT ---');
  try {
    const parentProfileId = 'd2915cf9-bb3e-4227-8efc-08eb8cbdd5bb'; // PRT-MB-0020

    const childrenResult = await pool.query(
      `SELECT
         s.id,
         u.name AS "fullName",
         s.grade
       FROM parent_student ps
       JOIN students s ON ps.student_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE ps.parent_id = $1`,
      [parentProfileId]
    );
    console.log('\nLinked children:', childrenResult.rows);

    const announcementsResult = await pool.query(
      `SELECT
         n.id::text,
         COALESCE(n.priority, 'Normal') AS priority,
         n.title,
         n.content,
         n.created_at AS timestamp,
         'School'::text AS category,
         NULL::text AS "driverName"
       FROM notices n
       WHERE n.created_at > NOW() - INTERVAL '30 days'

       UNION ALL

       SELECT
         n.id::text,
         'Normal'::text AS priority,
         n.title,
         n.content,
         n.created_at AS timestamp,
         'Logistics'::text AS category,
         n.driver_name AS "driverName"
       FROM logistics_notices n
       WHERE n.deleted_at IS NULL
         AND n.created_at > NOW() - INTERVAL '30 days'
         AND n.sender_id IN (
           SELECT r.driver_id
           FROM routes r
           JOIN student_routes rm ON r.id = rm.route_id
           WHERE rm.student_id IN (
             SELECT student_id FROM parent_student WHERE parent_id = $1
           )
         )

       UNION ALL

       SELECT
         m.id::text,
         'High'::text AS priority,
         'Clinic: ' || su.name AS title,
         m.text AS content,
         m.created_at AS timestamp,
         'Clinic'::text AS category,
         NULL::text AS "driverName"
       FROM clinic_chat_messages m
       JOIN students s ON s.id = m.student_id
       JOIN users su ON s.user_id = su.id
       WHERE m.sender_role = 'clinic'
         AND m.student_id IN (
           SELECT student_id FROM parent_student WHERE parent_id = $1
         )
         AND m.created_at > NOW() - INTERVAL '7 days'

       ORDER BY timestamp DESC
       LIMIT 15`,
      [parentProfileId]
    );

    console.log('\nAnnouncements returned for parent dashboard:');
    console.log(announcementsResult.rows);

  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

test();
