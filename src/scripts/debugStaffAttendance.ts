import pool from '../config/database';

async function main() {
  // Test the exact getStaffAttendance query with the Main Branch ID
  const branchId = '9e59d9ee-b664-42e9-af0c-bf03e8135544';
  const targetDate = new Date().toISOString().split('T')[0]; // today in Gregorian

  console.log('Testing with branchId:', branchId);
  console.log('Testing with date:', targetDate);

  // Run the exact query from the service
  const result = await pool.query(
    `SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        u.status,
        u.branch_id,
        b.name AS branch_name,
        COALESCE(
          t.department,
          CASE u.role
            WHEN 'teacher'       THEN 'Academics'
            WHEN 'finance-clerk' THEN 'Finance'
            WHEN 'librarian'     THEN 'Library'
            WHEN 'clinic-admin'  THEN 'Clinic'
            WHEN 'driver'        THEN 'Transport'
            WHEN 'auditor'       THEN 'Audit'
            WHEN 'school-admin'  THEN 'Administration'
            WHEN 'vice-principal' THEN 'Administration'
            ELSE u.role::text
          END
        ) AS department,
        t.subjects,
        COALESCE(t.classes_count, 0)::int AS classes_count,
        ea.status                          AS attendance_status,
        ea.sign_in_time,
        ea.sign_out_time,
        ea.recorded_by
     FROM users u
     LEFT JOIN branches b ON b.id = u.branch_id
     LEFT JOIN teachers t ON t.user_id = u.id
     LEFT JOIN employee_attendance ea
            ON ea.user_id = u.id AND ea.date = $2
     WHERE u.branch_id = $1
       AND u.role NOT IN ('student', 'parent', 'super-admin')
       AND u.status = 'Approved'
     ORDER BY u.name`,
    [branchId, targetDate]
  );

  console.log('\n--- QUERY RESULT ---');
  console.log(`Found ${result.rows.length} rows`);
  console.log(JSON.stringify(result.rows, null, 2));

  // Also check what column 'department' looks like in teachers table
  const teacherCols = await pool.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'teachers'
    ORDER BY ordinal_position
  `);
  console.log('\n--- TEACHERS TABLE COLUMNS ---');
  console.log(teacherCols.rows.map((r: any) => `${r.column_name} (${r.data_type})`).join('\n'));

  // Check what school-admin users exist and their branch_ids
  const admins = await pool.query(`
    SELECT id, name, email, role, branch_id, status
    FROM users
    WHERE role IN ('school-admin', 'vice-principal')
    ORDER BY name
  `);
  console.log('\n--- SCHOOL ADMIN / VP USERS ---');
  console.log(JSON.stringify(admins.rows, null, 2));

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
