import pool from '../src/config/database';
import userService from '../src/services/user.service';
import { UserRole } from '../src/types';

function genPlaceholderEmail(role: string): string {
  const rand = Math.floor(Math.random() * 900000) + 100000;
  return `${role}-${Date.now()}-${rand}@no-reply.local`;
}

async function fixUnlinkedStudents() {
  console.log("Starting fix for unlinked students...");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Fetch pending applications that are 'payment-confirmed' but have no student_user_id
    const appRes = await client.query(
      `SELECT id, applicant_name, applicant_email, grade_applying, branch_id, parent_user_id
       FROM pending_applications
       WHERE status = 'payment-confirmed' AND student_user_id IS NULL`
    );

    console.log(`Found ${appRes.rows.length} unlinked payment-confirmed applications.`);

    for (const app of appRes.rows) {
      console.log(`Processing application ID ${app.id} for ${app.applicant_name}...`);

      if (!app.parent_user_id) {
        console.error(`Error: Application ${app.id} has no parent_user_id! Skipping.`);
        continue;
      }

      // 2. Create student user account
      const studentEmail = app.applicant_email || genPlaceholderEmail('student');
      console.log(`Creating student user with email: ${studentEmail}...`);

      const studentCreate = await userService.createUser(
        {
          name: app.applicant_name,
          email: studentEmail,
          role: UserRole.STUDENT,
          branchId: app.branch_id,
          grade: app.grade_applying,
        },
        'system-reconcile'
      );

      const studentUserId = studentCreate.user.id;
      console.log(`Created student user ID: ${studentUserId}`);

      // 3. Get student ID from students table
      const studentIdRes = await client.query(
        'SELECT id FROM students WHERE user_id = $1 LIMIT 1',
        [studentUserId]
      );
      if (studentIdRes.rows.length === 0) {
        throw new Error(`Failed to locate created student profile for user ID ${studentUserId}.`);
      }
      const studentId = studentIdRes.rows[0].id;
      console.log(`Found student ID: ${studentId}`);

      // 4. Update pending_applications table
      await client.query(
        `UPDATE pending_applications
         SET student_user_id = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [studentUserId, app.id]
      );
      console.log(`Updated pending_applications student_user_id to ${studentUserId}`);

      // 5. Get parent ID from parents table
      const parentIdRes = await client.query(
        'SELECT id FROM parents WHERE user_id = $1 LIMIT 1',
        [app.parent_user_id]
      );
      if (parentIdRes.rows.length === 0) {
        throw new Error(`Failed to locate parent profile for user ID ${app.parent_user_id}.`);
      }
      const parentId = parentIdRes.rows[0].id;
      console.log(`Found parent ID: ${parentId}`);

      // 6. Link in parent_student table
      await client.query(
        `INSERT INTO parent_student (parent_id, student_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [parentId, studentId]
      );
      console.log(`Inserted parent-student link between parent ${parentId} and student ${studentId}.`);
    }

    await client.query("COMMIT");
    console.log("Successfully fixed all unlinked students!");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error occurred, transaction rolled back:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

fixUnlinkedStudents();
