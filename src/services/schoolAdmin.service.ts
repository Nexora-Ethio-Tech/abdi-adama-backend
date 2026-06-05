import pool from '../config/database';
import userService from './user.service';
import { generate4DigitPIN, hashPassword } from '../utils/password';
import { sendAdmissionCredentialsEmail } from '../utils/emailService';

class SchoolAdminService {
  // User Management (existing methods)
  async registerUser(userData: any) {
    // School admin creates users, so use 'school-admin' as createdBy
    return await userService.createUser(userData, 'school-admin');
  }

  async getBranchUsers(branchId: string, role?: string, status?: string) {
    let query = `
      SELECT u.id, u.digital_id, u.username, u.name, u.email, u.role, 
            u.branch_id, u.status, u.is_active, u.staff_profile, u.created_at, u.updated_at,
             b.name as branch_name
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.id
      WHERE u.branch_id = $1
    `;

    const params: any[] = [branchId];
    let paramCount = 1;

    if (role) {
      paramCount++;
      query += ` AND u.role = $${paramCount}`;
      params.push(role);
    }

    if (status) {
      paramCount++;
      query += ` AND u.status = $${paramCount}`;
      params.push(status);
    }

    query += ' ORDER BY u.created_at DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  async getUserById(userId: string, branchId: string) {
    const result = await pool.query(
      `SELECT u.id, u.digital_id, u.username, u.name, u.email, u.role,
              u.branch_id, u.status, u.is_active, u.staff_profile, u.created_at, u.updated_at,
              b.name as branch_name
       FROM users u
       LEFT JOIN branches b ON u.branch_id = b.id
       WHERE u.id = $1 AND u.branch_id = $2`,
      [userId, branchId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found or access denied');
    }

    return result.rows[0];
  }

  // User Status Management (Approve/Revoke users in their branch)
  async updateUserStatus(userId: string, status: string, branchId: string, _schoolAdminId: string) {
    // Verify user belongs to School Admin's branch
    const userCheck = await pool.query(
      `SELECT id, role, status FROM users 
       WHERE id = $1 AND branch_id = $2`,
      [userId, branchId]
    );

    if (userCheck.rows.length === 0) {
      throw new Error('User not found in your branch');
    }

    const user = userCheck.rows[0];

    // Prevent School Admin from approving other School Admins, Vice Principals, or Auditors
    const restrictedRoles = ['school-admin', 'vice-principal', 'auditor', 'super-admin'];
    if (restrictedRoles.includes(user.role)) {
      throw new Error('You cannot change the status of admin roles. Contact Super Admin.');
    }

    // Update user status
    const result = await pool.query(
      `UPDATE users 
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, digital_id, name, email, role, status, branch_id`,
      [status, userId]
    );

    return result.rows[0];
  }

  // Delete User (teachers, students, parents, staff in their branch)
  async deleteUser(userId: string, branchId: string, _schoolAdminId: string) {
    // Verify user belongs to School Admin's branch
    const userCheck = await pool.query(
      `SELECT id, role, name FROM users 
       WHERE id = $1 AND branch_id = $2`,
      [userId, branchId]
    );

    if (userCheck.rows.length === 0) {
      throw new Error('User not found in your branch');
    }

    const user = userCheck.rows[0];

    // Prevent School Admin from deleting admin roles
    const restrictedRoles = ['school-admin', 'vice-principal', 'auditor', 'super-admin'];
    if (restrictedRoles.includes(user.role)) {
      throw new Error('You cannot delete admin roles. Contact Super Admin.');
    }

    // Delete user (CASCADE will handle related records)
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);

    return { message: `User ${user.name} deleted successfully` };
  }

  // Update User (Edit student/teacher/parent details)
  async updateUser(userId: string, branchId: string, updateData: any) {
    const normalizeGradeForStorage = (grade: string) => {
      const match = String(grade || '').trim().match(/(\d{1,2})/);
      return match ? `Grade ${match[1]}` : String(grade || '').trim();
    };

    // Verify user belongs to School Admin's branch
    const userCheck = await pool.query(
      `SELECT id, role FROM users 
       WHERE id = $1 AND branch_id = $2`,
      [userId, branchId]
    );

    if (userCheck.rows.length === 0) {
      throw new Error('User not found in your branch');
    }

    const user = userCheck.rows[0];

    // Prevent School Admin from editing admin roles
    const restrictedRoles = ['school-admin', 'vice-principal', 'auditor', 'super-admin'];
    if (restrictedRoles.includes(user.role)) {
      throw new Error('You cannot edit admin roles. Contact Super Admin.');
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (updateData.name) {
      paramCount++;
      fields.push(`name = $${paramCount}`);
      values.push(updateData.name);
    }

    if (updateData.email) {
      paramCount++;
      fields.push(`email = $${paramCount}`);
      values.push(updateData.email);
    }

    if (fields.length === 0 && (!updateData.grade && !updateData.parentPhone)) {
      throw new Error('No fields to update');
    }

    if (fields.length > 0) {
      paramCount++;
      fields.push(`updated_at = NOW()`);
      values.push(userId);

      const result = await pool.query(
        `UPDATE users SET ${fields.join(', ')}
         WHERE id = $${paramCount}
         RETURNING id, digital_id, name, email, role, status, branch_id`,
        values
      );
    }

    // If student, update grade and parent_phone in students table
    if (user.role === 'student') {
      const studentUpdates: string[] = [];
      const studentValues: any[] = [];
      let studentParamCount = 1;

      if (updateData.grade) {
        studentUpdates.push(`grade = $${studentParamCount}`);
        studentValues.push(normalizeGradeForStorage(updateData.grade));
        studentParamCount++;
      }

      if (updateData.parentPhone) {
        const { validateAndFormatPhoneNumber } = require('../utils/validation');
        const phoneValidation = validateAndFormatPhoneNumber(updateData.parentPhone);
        if (!phoneValidation.isValid) {
          throw new Error(phoneValidation.error || 'Invalid phone number');
        }
        studentUpdates.push(`parent_phone = $${studentParamCount}`);
        studentValues.push(phoneValidation.formatted);
        studentParamCount++;
      }

      if (studentUpdates.length > 0) {
        studentUpdates.push(`updated_at = NOW()`);
        // Add user_id to the values array and increment param count
        const userIdParamCount = studentParamCount;
        studentValues.push(userId);
        await pool.query(
          `UPDATE students SET ${studentUpdates.join(', ')} WHERE user_id = $${userIdParamCount}`,
          studentValues
        );
      }
    }

    const result = await pool.query(
      `SELECT id, digital_id, name, email, role, status, branch_id FROM users WHERE id = $1`,
      [userId]
    );

    return result.rows[0];
  }

  // Assign Student to Class
  async assignStudentToClass(studentId: string, classId: string, branchId: string) {
    // Verify student exists and belongs to branch
    const studentCheck = await pool.query(
      `SELECT s.id, s.user_id, s.section_id, u.role 
       FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE s.user_id = $1 AND s.branch_id = $2`,
      [studentId, branchId]
    );

    if (studentCheck.rows.length === 0) {
      throw new Error('Student not found in your branch');
    }

    const prevSectionId = studentCheck.rows[0].section_id;

    // Verify class exists and belongs to branch (include section column)
    const classCheck = await pool.query(
      'SELECT id, name, section FROM classes WHERE id = $1 AND branch_id = $2',
      [classId, branchId]
    );

    if (classCheck.rows.length === 0) {
      throw new Error('Class not found in your branch');
    }

    const classRow = classCheck.rows[0];
    const className = classRow.name;
    const classSection = classRow.section; // null for grade-level (no section)

    // Update student's grade and section_id atomically
    let result;
    if (classSection !== null && classSection !== undefined) {
      // This is a specific section — set section_id to the class id
      result = await pool.query(
        `UPDATE students 
         SET grade = $1, section_id = $2, updated_at = NOW()
         WHERE user_id = $3
         RETURNING *`,
        [className, classId, studentId]
      );
    } else {
      // Grade-only class (no section) — clear section_id and set grade
      result = await pool.query(
        `UPDATE students 
         SET grade = $1, section_id = NULL, updated_at = NOW()
         WHERE user_id = $2
         RETURNING *`,
        [className, studentId]
      );
    }

    // Update target class student_count correctly based on whether it has a section
    if (classSection !== null && classSection !== undefined) {
      await pool.query(
        `UPDATE classes 
         SET student_count = (SELECT COUNT(*) FROM students WHERE section_id = $1)
         WHERE id = $2`,
        [classId, classId]
      );
    } else {
      await pool.query(
        `UPDATE classes 
         SET student_count = (SELECT COUNT(*) FROM students WHERE section_id IS NULL AND grade = $1 AND branch_id = $2)
         WHERE id = $3`,
        [className, branchId, classId]
      );
    }

    // If the student was previously assigned to a different section, update that class count too
    if (prevSectionId && prevSectionId !== classId) {
      await pool.query(
        `UPDATE classes SET student_count = (SELECT COUNT(*) FROM students WHERE section_id = $1) WHERE id = $2`,
        [prevSectionId, prevSectionId]
      );
    }

    return {
      student: result.rows[0],
      class: classRow
    };
  }

  // Remove Student from Class
  async removeStudentFromClass(studentId: string, branchId: string) {
    // Verify student exists and belongs to branch
    const studentCheck = await pool.query(
      `SELECT s.id, s.grade 
       FROM students s
       WHERE s.user_id = $1 AND s.branch_id = $2`,
      [studentId, branchId]
    );

    if (studentCheck.rows.length === 0) {
      throw new Error('Student not found in your branch');
    }

    const currentGrade = studentCheck.rows[0].grade;

    // Remove student from class (set grade to null)
    await pool.query(
      `UPDATE students 
       SET grade = NULL, updated_at = NOW()
       WHERE user_id = $1`,
      [studentId]
    );

    // Update class student count if student was in a class
    if (currentGrade) {
      await pool.query(
        `UPDATE classes 
         SET student_count = (SELECT COUNT(*) FROM students WHERE grade = $1 AND branch_id = $2)
         WHERE name = $1 AND branch_id = $2`,
        [currentGrade, branchId]
      );
    }
  }

  // Class Management
  async createClass(data: {
    name: string;
    capacity?: number;
    section?: string;
    branchId: string;
  }) {
    // Extract grade from class name
    // Handles: "Grade 10-A", "Grade 10", "10-A", "10", etc.
    const extractGrade = (name: string): string | null => {
      // Try pattern "Grade 10-A" or "Grade 10"
      const match1 = name.match(/Grade\s+(\d{1,2})/i);
      if (match1) return match1[1];

      // Try pattern starting with digits "10-A" or "10"
      const match2 = name.match(/^(\d{1,2})/);
      if (match2) return match2[1];

      return null;
    };

    const extractedGrade = extractGrade(data.name);

    const existing = await pool.query(
      `SELECT *
       FROM classes
       WHERE branch_id = $1 AND name = $2 AND COALESCE(section, '') = COALESCE($3, '')
       LIMIT 1`,
      [data.branchId, data.name, data.section || null]
    );

    if (existing.rows.length > 0) {
      const classId = existing.rows[0].id;
      const result = await pool.query(
        `UPDATE classes
         SET name = $1,
             section = $2,
             grade = $3,
             capacity = COALESCE($4, capacity)
         WHERE id = $5
         RETURNING *`,
        [data.name, data.section || null, extractedGrade, data.capacity ?? null, classId]
      );

      return result.rows[0];
    }

    const result = await pool.query(
      `INSERT INTO classes (name, capacity, section, grade, branch_id, student_count)
       VALUES ($1, $2, $3, $4, $5, 0)
       RETURNING *`,
      [data.name, data.capacity || 0, data.section || null, extractedGrade, data.branchId]
    );

    return result.rows[0];
  }

  async getClasses(branchId: string) {
    // Ensure class_teachers table exists (safe no-op if already created)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS class_teachers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
        branch_id UUID NOT NULL,
        assigned_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(class_id, teacher_id)
      )
    `);

    const result = await pool.query(
      `SELECT 
        c.*,
        COALESCE(json_agg(json_build_object('teacher_id', ct.teacher_id, 'teacher_name', u.name, 'teacher_user_id', t.user_id) ) FILTER (WHERE ct.id IS NOT NULL), '[]') as teachers,
        COUNT(DISTINCT s.id) as actual_student_count
      FROM classes c
      LEFT JOIN class_teachers ct ON ct.class_id = c.id
      LEFT JOIN teachers t ON ct.teacher_id = t.id
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN students s ON s.branch_id = c.branch_id AND (
        s.section_id = c.id
        OR (s.section_id IS NULL AND c.section IS NULL AND s.grade = c.name)
      )
      WHERE c.branch_id = $1
      GROUP BY c.id
      ORDER BY c.name`,
      [branchId]
    );

    return result.rows;
  }

  async updateClass(classId: string, branchId: string, data: any) {
    // Verify class belongs to branch
    const checkResult = await pool.query(
      'SELECT id FROM classes WHERE id = $1 AND branch_id = $2',
      [classId, branchId]
    );

    if (checkResult.rows.length === 0) {
      throw new Error('Class not found or access denied');
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (data.name) {
      paramCount++;
      fields.push(`name = $${paramCount}`);
      values.push(data.name);
    }

    if (data.capacity !== undefined) {
      paramCount++;
      fields.push(`capacity = $${paramCount}`);
      values.push(data.capacity);
    }

    if (data.section !== undefined) {
      paramCount++;
      fields.push(`section = $${paramCount}`);
      values.push(data.section);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    paramCount++;
    values.push(classId);

    const result = await pool.query(
      `UPDATE classes SET ${fields.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    return result.rows[0];
  }

  async deleteClass(classId: string, branchId: string) {
    // Check if class has students
    const studentCheck = await pool.query(
      `SELECT COUNT(*) as count FROM students s
       JOIN classes c ON s.branch_id = c.branch_id AND (
         s.section_id = c.id
         OR (s.section_id IS NULL AND c.section IS NULL AND s.grade = c.name)
       )
       WHERE c.id = $1`,
      [classId]
    );

    if (parseInt(studentCheck.rows[0].count) > 0) {
      throw new Error('Cannot delete class with enrolled students');
    }

    const result = await pool.query(
      'DELETE FROM classes WHERE id = $1 AND branch_id = $2 RETURNING id',
      [classId, branchId]
    );

    if (result.rows.length === 0) {
      throw new Error('Class not found or access denied');
    }
  }

  // Teacher Assignment (with ability to replace existing teacher)
  async assignTeacherToClass(classId: string, teacherId: string, branchId: string) {
    // Verify class belongs to branch
    const classCheck = await pool.query(
      'SELECT id FROM classes WHERE id = $1 AND branch_id = $2',
      [classId, branchId]
    );

    if (classCheck.rows.length === 0) {
      throw new Error('Class not found or access denied');
    }

    // Check if teacherId is from users table or teachers table
    // First try to find in teachers table by id
    let teacherRecord = await pool.query(
      'SELECT id FROM teachers WHERE id = $1 AND branch_id = $2',
      [teacherId, branchId]
    );

    // If not found, try to find by user_id (in case frontend sends user.id)
    if (teacherRecord.rows.length === 0) {
      teacherRecord = await pool.query(
        'SELECT id FROM teachers WHERE user_id = $1 AND branch_id = $2',
        [teacherId, branchId]
      );
    }

    if (teacherRecord.rows.length === 0) {
      throw new Error('Teacher not found or not in this branch');
    }

    // Use the actual teacher table id
    const actualTeacherId = teacherRecord.rows[0].id;

    // Ensure class_teachers table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS class_teachers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
        branch_id UUID NOT NULL,
        assigned_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(class_id, teacher_id)
      )
    `);

    // Delete any existing assignments for this class (replace its teacher)
    await pool.query(
      `DELETE FROM class_teachers WHERE class_id = $1`,
      [classId]
    );

    // A teacher can only be a homeroom teacher for ONE class at a time.
    // Remove any other class_teachers entries for this teacher and clean up
    // the orphaned auto-created courses that are not backed by schedule_structure.
    try {
      const oldAssignments = await pool.query(
        `SELECT class_id FROM class_teachers WHERE teacher_id = $1`,
        [actualTeacherId]
      );
      if (oldAssignments.rows.length > 0) {
        for (const old of oldAssignments.rows) {
          // Null out any auto-created course for the old class if it has no schedule_structure backing
          await pool.query(
            `UPDATE courses
             SET teacher_id = NULL
             WHERE class_id = $1 AND teacher_id = $2
               AND NOT EXISTS (
                 SELECT 1 FROM schedule_structure ss
                 WHERE ss.class_id = $1 AND ss.teacher_id = $2
               )`,
            [old.class_id, actualTeacherId]
          );
        }
        await pool.query(
          `DELETE FROM class_teachers WHERE teacher_id = $1`,
          [actualTeacherId]
        );
      }
    } catch (cleanupErr: any) {
      console.error('⚠️ Could not clean up old homeroom assignments:', cleanupErr.message);
    }

    // Insert new homeroom assignment
    await pool.query(
      `INSERT INTO class_teachers (class_id, teacher_id, branch_id)
       VALUES ($1, $2, $3)`,
      [classId, actualTeacherId, branchId]
    );

    // NOTE: We do NOT auto-create a course here anymore.
    // Homeroom assignments are for Attendance only.
    // Subject-teaching courses must come from the Schedule Structure (schedule_structure table).
    // This prevents orphaned course records that pollute the Grade Entry tab.

    // Return updated class with teacher data
    const result = await pool.query(
      `SELECT 
        c.*,
        COALESCE(json_agg(json_build_object('teacher_id', ct.teacher_id, 'teacher_name', u.name, 'teacher_user_id', t.user_id) ) FILTER (WHERE ct.id IS NOT NULL), '[]') as teachers
      FROM classes c
      LEFT JOIN class_teachers ct ON ct.class_id = c.id
      LEFT JOIN teachers t ON ct.teacher_id = t.id
      LEFT JOIN users u ON t.user_id = u.id
      WHERE c.id = $1
      GROUP BY c.id`,
      [classId]
    );

    return result.rows[0];
  }

  async unassignTeacherFromClass(classId: string, teacherId: string, branchId: string) {
    // Ensure assignment exists
    const check = await pool.query(
      `SELECT id FROM class_teachers WHERE class_id = $1 AND teacher_id = $2 AND branch_id = $3`,
      [classId, teacherId, branchId]
    );

    if (check.rows.length === 0) {
      throw new Error('Assignment not found or access denied');
    }

    await pool.query(
      `DELETE FROM class_teachers WHERE class_id = $1 AND teacher_id = $2 AND branch_id = $3`,
      [classId, teacherId, branchId]
    );

    // Clean up any auto-created course for this class that isn't backed by schedule_structure.
    // This prevents the teacher from still seeing the class in Grade Entry after being unassigned.
    try {
      await pool.query(
        `UPDATE courses
         SET teacher_id = NULL
         WHERE class_id = $1 AND teacher_id = $2
           AND NOT EXISTS (
             SELECT 1 FROM schedule_structure ss
             WHERE ss.class_id = $1 AND ss.teacher_id = $2
           )`,
        [classId, teacherId]
      );
    } catch (cleanupErr: any) {
      console.error('⚠️ Could not clean up orphaned course on unassign:', cleanupErr.message);
    }

    return { message: 'Teacher unassigned from class' };
  }

  // Course Management
  async createCourse(data: {
    name: string;
    code: string;
    teacherId?: string;
    classId?: string;
  }) {
    const result = await pool.query(
      `INSERT INTO courses (name, code, teacher_id, class_id, progress)
       VALUES ($1, $2, $3, $4, 0)
       RETURNING *`,
      [data.name, data.code, data.teacherId || null, data.classId || null]
    );

    return result.rows[0];
  }

  async getCourses(branchId: string, classId?: string) {
    let query = `
      SELECT 
        c.*,
        u.name as teacher_name,
        cl.name as class_name
      FROM courses c
      LEFT JOIN teachers t ON c.teacher_id = t.id
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN classes cl ON c.class_id = cl.id
      WHERE cl.branch_id = $1
    `;

    const params: any[] = [branchId];

    if (classId) {
      query += ' AND c.class_id = $2';
      params.push(classId);
    }

    query += ' ORDER BY c.name';

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Schedule Management
  async createSchedule(data: {
    teacherId: string;
    day: string;
    timeSlot: string;
    className: string;
    subject: string;
  }) {
    const result = await pool.query(
      `INSERT INTO schedules (teacher_id, day, time_slot, class_name, subject)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.teacherId, data.day, data.timeSlot, data.className, data.subject]
    );

    return result.rows[0];
  }

  async getSchedules(branchId: string, teacherId?: string, day?: string) {
    let query = `
      SELECT 
        s.*,
        u.name as teacher_name
      FROM schedules s
      JOIN teachers t ON s.teacher_id = t.id
      JOIN users u ON t.user_id = u.id
      WHERE t.branch_id = $1
    `;

    const params: any[] = [branchId];
    let paramCount = 1;

    if (teacherId) {
      paramCount++;
      query += ` AND s.teacher_id = $${paramCount}`;
      params.push(teacherId);
    }

    if (day) {
      paramCount++;
      query += ` AND s.day = $${paramCount}`;
      params.push(day);
    }

    query += ' ORDER BY s.day, s.time_slot';

    const result = await pool.query(query, params);
    return result.rows;
  }

  async checkExistingApplication(digitalId: string | null, parentPhone: string, applicantName: string) {
    const query = `
      SELECT id FROM pending_applications 
      WHERE status != 'declined' AND (
        ($1::text IS NOT NULL AND digital_id IS NOT NULL AND digital_id = $1)
        OR (parent_phone = $2 AND LOWER(applicant_name) = LOWER($3))
      )
      LIMIT 1
    `;
    const result = await pool.query(query, [digitalId || null, parentPhone, applicantName.trim()]);
    return result.rows.length > 0;
  }

  // Student Application Management
  async createPendingApplication(data: any) {
    const result = await pool.query(
      `INSERT INTO pending_applications (
        branch_id,
        applicant_name,
        applicant_email,
        applicant_phone,
        digital_id,
        dob,
        gender,
        parent_name,
        parent_phone,
        address,
        previous_school,
        grade_applying,
        blood_group,
        allergies,
        chronic_conditions,
        current_medications,
        transcript_data,
        transcript_mime_type,
        transcript_file_name,
        transcript_file_size,
        status,
        notes,
        created_by,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        data.branchId,
        data.applicantName || 'Unknown Applicant',
        data.applicantEmail || null,
        data.applicantPhone || '0000000000',
        data.digitalId || null,
        data.dob || '2000-01-01',
        data.gender || null,
        data.parentName || 'Unknown Parent',
        data.parentPhone || null,
        data.address || null,
        data.previousSchool || null,
        data.gradeApplying,
        data.bloodGroup || null,
        data.allergies || null,
        data.chronicConditions || null,
        data.currentMedications || null,
        data.transcriptData || null,
        data.transcriptMimeType || null,
        data.transcriptFileName || null,
        data.transcriptFileSize || null,
        'pending',
        data.notes || null,
        data.createdBy || null
      ]
    );
    return result.rows[0];
  }

  // Return default branch id for public submissions
  async getDefaultBranchId(): Promise<string | null> {
    // Prefer "Main Branch" if present, otherwise return first branch id
    const tryMain = await pool.query(`SELECT id FROM branches WHERE name = $1 LIMIT 1`, ['Main Branch']);
    if (tryMain.rows.length > 0) return tryMain.rows[0].id;

    const first = await pool.query(`SELECT id FROM branches ORDER BY name LIMIT 1`);
    if (first.rows.length > 0) return first.rows[0].id;
    return null;
  }

  async getBranches() {
    const result = await pool.query(`SELECT id, name FROM branches ORDER BY name`);
    return result.rows;
  }

  async getBranchIdByName(branchName: string): Promise<string | null> {
    const cleanedName = branchName.trim();
    if (!cleanedName) return null;

    const result = await pool.query(
      `SELECT id FROM branches WHERE TRIM(LOWER(name)) = LOWER($1) LIMIT 1`,
      [cleanedName]
    );

    return result.rows.length > 0 ? result.rows[0].id : null;
  }

  // Get application transcript file binary data
  async getApplicationTranscript(applicationId: string, branchId: string) {
    const result = await pool.query(
      `SELECT transcript_data, transcript_mime_type, transcript_file_name 
       FROM pending_applications 
       WHERE id = $1 AND branch_id = $2`,
      [applicationId, branchId]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0];
  }

  async getPendingApplications(branchId: string, status?: string) {
    let query = `
            SELECT id, branch_id, applicant_name, applicant_email, applicant_phone, digital_id, dob, gender,
              parent_name, parent_phone, address, previous_school, grade_applying,
              blood_group, allergies, chronic_conditions, current_medications, 
              transcript_mime_type, transcript_file_name, transcript_file_size, 
              status, notes, finance_removal_reason, finance_removed_by, finance_removed_at, created_at, updated_at, created_by, finance_status, finance_user_id, 
              finance_approved_at, payment_amount, payment_reference, student_user_id, parent_user_id, 
              registration_completed_at
      FROM pending_applications WHERE branch_id = $1`;
    const params: any[] = [branchId];

    if (status) {
      query += ' AND status = $2';
      params.push(status);
    } else {
      // Active pipeline only — hide archived/closed applications from the default list
      query += ` AND status IN (
        'pending', 'exam-pending', 'exam-passed', 'awaiting-payment',
        'payment-confirmed'
      )`;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }


  async updateApplicationStatus(applicationId: string, status: string, reviewerId?: string, gradeApplying?: string) {
    const params: any[] = [status];
    let query = `UPDATE pending_applications SET status = $1`;

    if (typeof gradeApplying === 'string' && gradeApplying.trim().length > 0) {
      query += `, grade_applying = $${params.length + 1}`;
      params.push(gradeApplying.trim());
    }

    if (status === 'awaiting-payment' && reviewerId) {
      query += `, reviewed_by = $${params.length + 1}`;
      params.push(reviewerId);
    }

    query += `, updated_at = NOW() WHERE id = $${params.length + 1} RETURNING *`;
    params.push(applicationId);

    const result = await pool.query(query, params);
    if (result.rows.length === 0) {
      throw new Error('Application not found');
    }

    return result.rows[0];
  }

  // Finance: get applications assigned for finance review
  async getApplicationsForFinance(branchId: string, status?: string) {
    let query = `
            SELECT id, branch_id, applicant_name, applicant_email, applicant_phone, digital_id, dob, gender,
              parent_name, parent_phone, address, previous_school, grade_applying,
              blood_group, allergies, chronic_conditions, current_medications, 
              transcript_mime_type, transcript_file_name, transcript_file_size, 
              status, notes, finance_removal_reason, finance_removed_by, finance_removed_at, created_at, updated_at, created_by, finance_status, finance_user_id, 
              finance_approved_at, payment_amount, payment_reference, student_user_id, parent_user_id, 
              registration_completed_at
      FROM pending_applications WHERE branch_id = $1`;
    const params: any[] = [branchId];

    if (status) {
      query += ' AND status = $2';
      params.push(status);
    } else {
      // default to common awaiting-payment status
      query += " AND status IN ('awaiting-payment')";
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Finance: Approve application (record payment, create user accounts, finalize registration)
  async financeApproveApplication(applicationId: string, payment: { amount: number; reference?: string; parentDigitalId?: string }, financeUserId: string) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const appRes = await client.query('SELECT * FROM pending_applications WHERE id = $1 FOR UPDATE', [applicationId]);
      if (appRes.rows.length === 0) throw new Error('Application not found');
      const app = appRes.rows[0];

      // Lazy-require to avoid circular dependency (user.service → schoolAdmin.service)
      const userServiceInstance = require('./user.service').default;

      // Helper: generate a throwaway email for accounts that have no real email.
      // The @no-reply.local suffix is checked in user.service to suppress welcome emails
      // for these placeholder addresses.
      const genPlaceholderEmail = (prefix: string) =>
        `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}@no-reply.local`;

      // ── Create student account ──────────────────────────────────────────────
      const studentEmail = app.applicant_email || genPlaceholderEmail('student');
      const studentCreate = await userServiceInstance.createUser(
        {
          name: app.applicant_name,
          email: studentEmail,
          role: 'student',
          branchId: app.branch_id,
          grade: app.grade_applying,
        },
        financeUserId
      );

      let parentCreate;
      let parentUserId: string;
      let parentId: string;

      if (payment.parentDigitalId) {
        const parentRes = await client.query(
          `SELECT u.id as user_id, p.id as parent_id, u.digital_id, u.username, u.name, u.email, u.role, u.branch_id, u.status, u.is_active, u.staff_profile, u.created_at, u.updated_at
           FROM users u
           JOIN parents p ON p.user_id = u.id
           WHERE u.digital_id = $1
             AND u.role = 'parent'
             AND (p.branch_id = $2 OR p.branch_id IS NULL)
           LIMIT 1`,
          [payment.parentDigitalId, app.branch_id]
        );

        if (parentRes.rows.length === 0) {
          throw new Error('Parent ID not found or does not belong to this branch.');
        }

        parentUserId = parentRes.rows[0].user_id;
        parentId = parentRes.rows[0].parent_id;
        parentCreate = {
          user: {
            id: parentRes.rows[0].user_id,
            digital_id: parentRes.rows[0].digital_id,
            username: parentRes.rows[0].username,
            name: parentRes.rows[0].name,
            email: parentRes.rows[0].email,
            role: parentRes.rows[0].role,
            branch_id: parentRes.rows[0].branch_id,
            status: parentRes.rows[0].status,
            is_active: parentRes.rows[0].is_active,
            staff_profile: parentRes.rows[0].staff_profile,
            created_at: parentRes.rows[0].created_at,
            updated_at: parentRes.rows[0].updated_at,
          },
          temporaryPassword: undefined,
        };
      } else {
        // ── Create parent account ───────────────────────────────────────────────
        // Parents rarely have an email on the application form, so we always use a
        // placeholder. The parent receives their credentials via the student's email
        // (see sendAdmissionCredentialsEmail below).
        parentCreate = await userServiceInstance.createUser(
          {
            name: app.parent_name || `${app.applicant_name} Parent`,
            email: genPlaceholderEmail('parent'),
            role: 'parent',
            branchId: app.branch_id,
          },
          financeUserId
        );

        parentUserId = parentCreate.user.id;
        const parentIdRes = await client.query(
          'SELECT id FROM parents WHERE user_id = $1 LIMIT 1',
          [parentUserId]
        );
        if (parentIdRes.rows.length === 0) {
          throw new Error('Failed to locate created parent profile.');
        }
        parentId = parentIdRes.rows[0].id;
      }

      const studentIdRes = await client.query('SELECT id FROM students WHERE user_id = $1 LIMIT 1', [studentCreate.user.id]);
      if (studentIdRes.rows.length === 0) {
        throw new Error('Failed to locate created student profile.');
      }
      const studentId = studentIdRes.rows[0].id;

      await client.query(
        `INSERT INTO parent_student (parent_id, student_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [parentId, studentId]
      );

      // ── Persist payment + generated account IDs ─────────────────────────────
      const updateResult = await client.query(
        `UPDATE pending_applications
         SET status                    = $1,
             finance_status            = $2,
             finance_user_id           = $3,
             finance_approved_at       = NOW(),
             payment_amount            = $4,
             payment_reference         = $5,
             student_user_id           = $6,
             parent_user_id            = $7,
             credentials_generated_at  = NOW(),
             updated_at                = NOW()
         WHERE id = $8
         RETURNING *`,
        [
          'payment-confirmed',
          'approved',
          financeUserId,
          payment.amount,
          payment.reference || null,
          studentCreate.user.id,
          parentUserId,
          applicationId,
        ]
      );

      await client.query(
        `UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2`,
        ['Approved', studentCreate.user.id]
      );
      studentCreate.user.status = 'Approved';

      await client.query('COMMIT');

      // ── Send admission credentials email to the student's real email ─────────
      // We send one email that covers both the student login and notes the parent
      // account. This fires after COMMIT so a failure never rolls back the DB work.
      if (app.applicant_email && studentCreate.temporaryPassword) {
        sendAdmissionCredentialsEmail(
          app.applicant_name,
          app.applicant_email,
          'student',
          studentEmail,
          studentCreate.temporaryPassword,
          app.applicant_name,
          app.grade_applying
        ).catch((err) => {
          console.error('[financeApproveApplication] Failed to send student credentials email:', err);
        });
      }

      return {
        application: updateResult.rows[0],
        student: studentCreate,
        parent: parentCreate,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Financial Policy Management
  async setFinancialPolicy(data: {
    gradeLevel?: string;
    monthlyTuition: number;
    registrationFee: number;
    busFee: number;
    penaltyRate: number;
    academicYear: string;
    branchId: string;
  }) {
    const result = await pool.query(
      `INSERT INTO financial_policies 
       (grade_level, monthly_tuition, registration_fee, bus_fee, penalty_rate, academic_year, branch_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.gradeLevel || null,
        data.monthlyTuition,
        data.registrationFee,
        data.busFee,
        data.penaltyRate,
        data.academicYear,
        data.branchId
      ]
    );

    return result.rows[0];
  }

  async getFinancialPolicies(branchId: string) {
    const result = await pool.query(
      `SELECT * FROM financial_policies
       WHERE branch_id = $1
       ORDER BY academic_year DESC, grade_level`,
      [branchId]
    );

    return result.rows;
  }

  // Dashboard
  async getDashboard(branchId: string) {
    // Total students by grade
    const studentsResult = await pool.query(
      `SELECT grade, COUNT(*) as count
       FROM students
       WHERE branch_id = $1
       GROUP BY grade
       ORDER BY grade`,
      [branchId]
    );

    // Total teachers (branch teachers table, excluding revoked accounts)
    const teachersResult = await pool.query(
      `SELECT COUNT(*) AS count
       FROM teachers t
       JOIN users u ON t.user_id = u.id
       WHERE t.branch_id = $1 AND u.status != 'Revoked'`,
      [branchId]
    );

    // Total classes
    const classesResult = await pool.query(
      'SELECT COUNT(*) as count FROM classes WHERE branch_id = $1',
      [branchId]
    );

    // Pending applications — active admission pipeline (matches Pending Applications tab)
    const applicationsResult = await pool.query(
      `SELECT COUNT(*) AS count FROM pending_applications
       WHERE branch_id = $1
         AND status IN (
           'pending', 'exam-pending', 'exam-passed', 'awaiting-payment'
         )`,
      [branchId]
    );

    // Active academic year
    const academicYearResult = await pool.query(
      `SELECT * FROM academic_years 
       WHERE branch_id = $1 AND is_active = true
       LIMIT 1`,
      [branchId]
    );

    return {
      studentsByGrade: studentsResult.rows,
      totalStudents: studentsResult.rows.reduce((sum, row) => sum + parseInt(row.count, 10), 0),
      totalTeachers: parseInt(teachersResult.rows[0]?.count || '0', 10),
      totalClasses: parseInt(classesResult.rows[0]?.count || '0', 10),
      pendingApplications: parseInt(applicationsResult.rows[0]?.count || '0', 10),
      activeAcademicYear: academicYearResult.rows[0] || null
    };
  }

  // Reset user PIN (for teachers, students, parents, staff)
  async resetUserPIN(userId: string, branchId: string) {
    const userCheck = await pool.query(
      `SELECT id, role, name FROM users WHERE id = $1 AND branch_id = $2`,
      [userId, branchId]
    );

    if (userCheck.rows.length === 0) {
      throw new Error('User not found in your branch');
    }

    const user = userCheck.rows[0];

    const restrictedRoles = ['school-admin', 'vice-principal', 'auditor', 'super-admin'];
    if (restrictedRoles.includes(user.role)) {
      throw new Error('Cannot reset PIN for admin roles');
    }

    const newPIN = generate4DigitPIN();
    const hashedPIN = await hashPassword(newPIN);

    await pool.query(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [hashedPIN, userId]
    );

    return { userId, name: user.name, newPIN };
  }

  // Get branch teachers
  async getBranchTeachers(branchId: string) {
    const result = await pool.query(
      `SELECT 
        t.*,
        u.name, u.email, u.digital_id, u.status, u.staff_profile
      FROM teachers t
      JOIN users u ON t.user_id = u.id
      WHERE t.branch_id = $1
      ORDER BY u.name`,
      [branchId]
    );

    return result.rows;
  }

  // Get branch students with class info
  async getBranchStudents(branchId: string, grade?: string, status?: string) {
    let query = `
      SELECT 
        s.id as student_id,
        s.user_id,
        s.grade,
        s.section_id,
        s.monthly_fee,
        s.bus_fee,
        s.penalty_fee,
        s.fee_status,
        s.fee_approval_status,
        u.digital_id,
        u.name,
        u.email,
        COALESCE(s.status, 'Active') AS status,
        u.is_active,
        u.created_at,
        COALESCE(sc.id, gc.id) as class_id,
        COALESCE(sc.name, gc.name) as class_name,
        COALESCE(sc.section, gc.section) as class_section,
        COALESCE(sc.capacity, gc.capacity) as class_capacity,
        COALESCE(sc.student_count, gc.student_count) as class_student_count
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN classes sc ON s.section_id = sc.id
      LEFT JOIN classes gc ON s.section_id IS NULL AND s.grade = gc.name AND s.branch_id = gc.branch_id
      WHERE s.branch_id = $1
    `;

    const params: any[] = [branchId];
    let paramCount = 1;

    if (grade) {
      paramCount++;
      query += ` AND s.grade = $${paramCount}`;
      params.push(grade);
    }

    if (status) {
      paramCount++;
      query += ` AND COALESCE(s.status, 'Active') = $${paramCount}`;
      params.push(status);
    }

    query += ' ORDER BY s.grade, u.name';

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Get student by ID with full details
  async getStudentById(studentId: string, branchId: string) {
    const result = await pool.query(
      `SELECT 
        s.id as student_id,
        s.user_id,
        s.grade,
        s.monthly_fee,
        s.bus_fee,
        s.penalty_fee,
        s.fee_status,
        s.fee_approval_status,
        u.digital_id,
        u.name,
        u.email,
        u.status,
        u.is_active,
        u.created_at,
        u.updated_at,
        c.id as class_id,
        c.name as class_name,
        c.section as class_section,
        c.capacity as class_capacity,
        c.student_count as class_student_count,
        c.teacher_id,
        tu.name as teacher_name
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN classes c ON s.branch_id = c.branch_id AND (
        s.section_id = c.id
        OR (s.section_id IS NULL AND c.section IS NULL AND s.grade = c.name)
      )
      LEFT JOIN teachers t ON c.teacher_id = t.id
      LEFT JOIN users tu ON t.user_id = tu.id
      WHERE s.user_id = $1 AND s.branch_id = $2`,
      [studentId, branchId]
    );

    if (result.rows.length === 0) {
      throw new Error('Student not found in your branch');
    }

    return result.rows[0];
  }

  /** Full admission dossier for an enrolled student (students.id). */
  async getStudentAdmissionRecord(studentRecordId: string, branchId: string) {
    const studentResult = await pool.query(
      `SELECT
        s.id AS student_id,
        s.user_id,
        s.grade,
        s.section_id,
        s.branch_id,
        s.status AS student_status,
        s.created_at AS enrolled_at,
        u.digital_id,
        u.name,
        u.email,
        u.status,
        u.is_active,
        sc.name AS section_name,
        sc.section AS section_label
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN classes sc ON s.section_id = sc.id
      WHERE s.id = $1 AND s.branch_id = $2`,
      [studentRecordId, branchId]
    );

    if (studentResult.rows.length === 0) {
      throw new Error('Student not found in your branch');
    }

    const student = studentResult.rows[0];

    const appResult = await pool.query(
      `SELECT
        pa.id, pa.branch_id, pa.applicant_name, pa.applicant_email, pa.applicant_phone, pa.digital_id, pa.dob, pa.gender,
        pa.parent_name, pa.parent_phone, pa.address, pa.previous_school, pa.grade_applying, pa.last_grade_completed,
        pa.blood_group, pa.allergies, pa.chronic_conditions, pa.current_medications,
        pa.transcript_mime_type, pa.transcript_file_name, pa.transcript_file_size,
        pa.status, pa.notes,
        pa.finance_status, pa.finance_approved_at, pa.payment_amount, pa.payment_reference,
        pa.student_user_id, pa.parent_user_id, pa.registration_completed_at, pa.credentials_generated_at,
        pa.created_at, pa.updated_at,
        rec.exam_date, rec.exam_time, rec.location AS exam_location, rec.subjects AS exam_subjects, rec.notes AS exam_notes
      FROM pending_applications pa
      LEFT JOIN registration_exam_config rec ON rec.application_id = pa.id
      WHERE pa.branch_id = $1
        AND (
          pa.student_user_id = $2
          OR ($3::text IS NOT NULL AND pa.digital_id IS NOT NULL AND pa.digital_id = $3)
          OR ($4::text IS NOT NULL AND pa.applicant_email IS NOT NULL AND LOWER(pa.applicant_email) = LOWER($4))
        )
      ORDER BY pa.registration_completed_at DESC NULLS LAST, pa.created_at DESC
      LIMIT 1`,
      [branchId, student.user_id, student.digital_id, student.email]
    );

    const application = appResult.rows[0] || null;
    const documents: Array<{
      id: string;
      type: string;
      file_name: string;
      file_size: number | null;
      mime_type: string | null;
      uploaded_at: string | null;
      source: string;
    }> = [];

    if (application?.transcript_file_name) {
      documents.push({
        id: application.id,
        type: 'transcript',
        file_name: application.transcript_file_name,
        file_size: application.transcript_file_size ?? null,
        mime_type: application.transcript_mime_type ?? null,
        uploaded_at: application.created_at ?? null,
        source: 'application'
      });
    }

    if (application) {
      try {
        const extras = await pool.query(
          `SELECT id, file_name, file_size, file_mime_type, uploaded_at
           FROM application_transcripts
           WHERE application_id = $1
           ORDER BY uploaded_at ASC`,
          [application.id]
        );
        for (const row of extras.rows) {
          const alreadyListed =
            application.transcript_file_name &&
            row.file_name === application.transcript_file_name;
          if (!alreadyListed) {
            documents.push({
              id: row.id,
              type: 'attachment',
              file_name: row.file_name,
              file_size: row.file_size ?? null,
              mime_type: row.file_mime_type ?? null,
              uploaded_at: row.uploaded_at ?? null,
              source: 'application_transcripts'
            });
          }
        }
      } catch {
        // application_transcripts may not exist in older databases
      }
    }

    return {
      student,
      application,
      documents,
      hasApplication: !!application
    };
  }

  // ============================================================
  // DASHBOARD FEATURES
  // ============================================================

  // Get At-Risk Students (High/Medium risk levels)
  async getAtRiskStudents(branchId: string) {
    const result = await pool.query(
      `SELECT 
        s.id as student_id,
        s.user_id,
        s.risk_level,
        s.risk_factor,
        s.grade,
        s.monthly_fee,
        s.bus_fee,
        s.penalty_fee,
        s.fee_status,
        u.digital_id,
        u.name,
        u.email,
        u.created_at,
        -- Attendance count (last 30 days)
        COALESCE(
          (SELECT COUNT(*) 
           FROM student_attendance sa 
           WHERE sa.student_id = s.id 
             AND sa.status = 'absent'
             AND sa.date >= CURRENT_DATE - INTERVAL '30 days'),
          0
        ) as absence_count,
        -- Average grade across all courses
        COALESCE(
          (SELECT ROUND(AVG((g.score / g.total) * 100), 2)
           FROM grades g
           JOIN courses c ON g.course_id = c.id
           JOIN classes cl ON c.class_id = cl.id
           WHERE g.student_id = s.id 
             AND cl.branch_id = s.branch_id),
          0
        ) as average_grade
      FROM students s
      JOIN users u ON s.user_id = u.id
      WHERE s.branch_id = $1
        AND s.risk_level IN ('High', 'Medium')
        AND u.status = 'Approved'
      ORDER BY 
        CASE s.risk_level 
          WHEN 'High' THEN 1 
          WHEN 'Medium' THEN 2 
          ELSE 3 
        END,
        u.name`,
      [branchId]
    );

    // Calculate summary counts
    const summary = {
      high: result.rows.filter(s => s.risk_level === 'High').length,
      medium: result.rows.filter(s => s.risk_level === 'Medium').length
    };

    return {
      students: result.rows,
      summary
    };
  }

  // Get Upcoming Events for branch (includes global events)
  async getUpcomingEvents(branchId: string, limit: number = 10) {
    const result = await pool.query(
      `SELECT 
        id,
        title,
        date,
        type,
        description,
        branch_id,
        created_at
      FROM events
      WHERE (branch_id = $1 OR branch_id IS NULL)
        AND date >= CURRENT_DATE
      ORDER BY date ASC, created_at ASC
      LIMIT $2`,
      [branchId, limit]
    );

    return result.rows;
  }

  // Get ALL events for branch (for calendar view, includes global events)
  async getEvents(branchId: string) {
    const result = await pool.query(
      `SELECT id, title, date, type, description, branch_id, created_at
       FROM events
       WHERE branch_id = $1 OR branch_id IS NULL
       ORDER BY date ASC, created_at ASC`,
      [branchId]
    );
    return result.rows;
  }

  // Create Event
  async createEvent(data: {
    title: string;
    date: string;
    type: string;
    description?: string;
    branchId: string;
  }) {
    const result = await pool.query(
      `INSERT INTO events (title, date, type, description, branch_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.title, data.date, data.type, data.description || null, data.branchId]
    );

    return result.rows[0];
  }

  // Update Event
  async updateEvent(eventId: string, branchId: string, data: {
    title?: string;
    date?: string;
    type?: string;
    description?: string;
  }) {
    // Verify event belongs to branch
    const checkResult = await pool.query(
      'SELECT id FROM events WHERE id = $1 AND branch_id = $2',
      [eventId, branchId]
    );

    if (checkResult.rows.length === 0) {
      throw new Error('Event not found or access denied');
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (data.title) {
      paramCount++;
      fields.push(`title = $${paramCount}`);
      values.push(data.title);
    }

    if (data.date) {
      paramCount++;
      fields.push(`date = $${paramCount}`);
      values.push(data.date);
    }

    if (data.type) {
      paramCount++;
      fields.push(`type = $${paramCount}`);
      values.push(data.type);
    }

    if (data.description !== undefined) {
      paramCount++;
      fields.push(`description = $${paramCount}`);
      values.push(data.description);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    paramCount++;
    values.push(eventId);

    const result = await pool.query(
      `UPDATE events SET ${fields.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    return result.rows[0];
  }

  // Delete Event
  async deleteEvent(eventId: string, branchId: string) {
    const result = await pool.query(
      'DELETE FROM events WHERE id = $1 AND branch_id = $2 RETURNING id, title',
      [eventId, branchId]
    );

    if (result.rows.length === 0) {
      throw new Error('Event not found or access denied');
    }

    return result.rows[0];
  }

  // Finalize student registration after Finance Clerk approval
  // Assigns class and section, marks as fully registered
  async finalizeRegistration(applicationId: string, classId: string, sectionId: string, schoolAdminId: string) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get the application with finance approval
      const appRes = await client.query(
        'SELECT * FROM pending_applications WHERE id = $1 AND status = $2 FOR UPDATE',
        [applicationId, 'payment-confirmed']
      );
      if (appRes.rows.length === 0) {
        throw new Error('Application not found or payment not confirmed. Only payment-confirmed applications can be finalized.');
      }
      const app = appRes.rows[0];

      // Verify class and section exist and belong to the branch
      const classRes = await client.query(
        'SELECT id FROM classes WHERE id = $1 AND branch_id = $2',
        [classId, app.branch_id]
      );
      if (classRes.rows.length === 0) {
        throw new Error('Class not found in this branch');
      }

      const sectionRes = await client.query(
        'SELECT id FROM silo_sections WHERE id = $1',
        [sectionId]
      );
      if (sectionRes.rows.length === 0) {
        throw new Error('Section not found');
      }

      // Update application as registered with class/section assignment
      const updateResult = await client.query(
        `UPDATE pending_applications 
         SET status = $1,
             class_id = $2,
             section_id = $3,
             registration_finalized_at = NOW(),
             registered_by = $4,
             updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        ['registered', classId, sectionId, schoolAdminId, applicationId]
      );

      // Optionally: Create student enrollment record if needed
      // This depends on the specific enrollment tracking system you're using

      // Get digital IDs for student and parent
      let studentDigitalId = '';
      let parentDigitalId = '';
      if (app.student_user_id) {
        const studRes = await client.query('SELECT digital_id FROM users WHERE id = $1', [app.student_user_id]);
        if (studRes.rows.length > 0) studentDigitalId = studRes.rows[0].digital_id;
      }
      if (app.parent_user_id) {
        const parRes = await client.query('SELECT digital_id FROM users WHERE id = $1', [app.parent_user_id]);
        if (parRes.rows.length > 0) parentDigitalId = parRes.rows[0].digital_id;
      }

      await client.query('COMMIT');

      return {
        success: true,
        application: updateResult.rows[0],
        message: 'Student registration finalized successfully',
        registrationDetails: {
          studentId: studentDigitalId,
          parentId: parentDigitalId,
          classId,
          sectionId,
          applicantName: updateResult.rows[0].applicant_name,
          gradeApplying: updateResult.rows[0].grade_applying
        }
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Subject Management
  async getSubjects(branchId: string) {
    const result = await pool.query(
      `SELECT * FROM subjects WHERE branch_id = $1 ORDER BY grade_level, name`,
      [branchId]
    );
    return result.rows;
  }

  async createSubject(data: any) {
    const result = await pool.query(
      `INSERT INTO subjects (name, code, description, grade_level, branch_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.name, data.code, data.description || null, data.gradeLevel || data.grade_level, data.branchId]
    );
    return result.rows[0];
  }

  async updateSubject(id: string, branchId: string, data: any) {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (data.name) {
      paramCount++;
      fields.push(`name = $${paramCount}`);
      values.push(data.name);
    }

    if (data.code) {
      paramCount++;
      fields.push(`code = $${paramCount}`);
      values.push(data.code);
    }

    if (data.description !== undefined) {
      paramCount++;
      fields.push(`description = $${paramCount}`);
      values.push(data.description);
    }

    if (data.gradeLevel || data.grade_level) {
      paramCount++;
      fields.push(`grade_level = $${paramCount}`);
      values.push(data.gradeLevel || data.grade_level);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    paramCount++;
    values.push(id);
    paramCount++;
    values.push(branchId);

    const result = await pool.query(
      `UPDATE subjects 
       SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramCount - 1} AND branch_id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('Subject not found or access denied');
    }

    return result.rows[0];
  }

  async deleteSubject(id: string, branchId: string) {
    const result = await pool.query(
      `DELETE FROM subjects WHERE id = $1 AND branch_id = $2 RETURNING id`,
      [id, branchId]
    );
    if (result.rows.length === 0) {
      throw new Error('Subject not found or access denied');
    }
  }

  async promoteTeacher(userId: string, branchId: string, data: any) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Verify user exists, is a teacher, and belongs to this branch
      const userCheck = await client.query(
        `SELECT id, role, name, staff_profile FROM users WHERE id = $1 AND branch_id = $2`,
        [userId, branchId]
      );
      if (userCheck.rows.length === 0) {
        throw new Error('Teacher not found in your branch');
      }
      if (userCheck.rows[0].role !== 'teacher') {
        throw new Error('User is not a teacher');
      }

      // 2. Fetch or verify teacher record
      const teacherCheck = await client.query(
        `SELECT id FROM teachers WHERE user_id = $1`,
        [userId]
      );
      if (teacherCheck.rows.length === 0) {
        throw new Error('Teacher profile record not found');
      }
      const teacherId = teacherCheck.rows[0].id;

      const { promotionType, grades, subjects, sections, beforeSchool } = data;

      // 3. Update staff_profile in users table to store general promotion history/info
      const currentProfile = userCheck.rows[0].staff_profile || {};
      const updatedProfile = {
        ...currentProfile,
        promotion: {
          promotionType,
          grades: grades || [],
          subjects: subjects || [],
          sections: sections || {},
          beforeSchool: beforeSchool || {},
          promotedAt: new Date().toISOString()
        }
      };

      await client.query(
        `UPDATE users SET staff_profile = $1 WHERE id = $2`,
        [JSON.stringify(updatedProfile), userId]
      );

      // 4. Update teachers table based on promotion type
      if (promotionType === 'head-of-department') {
        // Subjects must be saved in the subjects TEXT[] column in teachers table
        await client.query(
          `UPDATE teachers 
           SET is_dean = true,
               is_room_teacher = false,
               assigned_room_class = NULL,
               subjects = $1,
               updated_at = NOW() 
           WHERE id = $2`,
          [subjects || [], teacherId]
        );
      } else if (promotionType === 'home-teacher') {
        // Grades and classes mapping
        // Set is_room_teacher to true
        // If there are grades and sections, set assigned_room_class to first select (e.g. 'Grade 10A')
        let assignedClass = '';
        if (grades && grades.length > 0) {
          const firstGrade = grades[0];
          const firstSectionList = sections && sections[firstGrade];
          const firstSection = firstSectionList && firstSectionList.length > 0 ? firstSectionList[0] : '';
          assignedClass = firstSection ? `${firstGrade}${firstSection}` : firstGrade;
        }

        await client.query(
          `UPDATE teachers 
           SET is_room_teacher = true,
               is_dean = false,
               subjects = $1,
               assigned_room_class = $2,
               updated_at = NOW() 
           WHERE id = $3`,
          [[], assignedClass || null, teacherId]
        );

        // Ensure class_teachers table exists
        await client.query(`
          CREATE TABLE IF NOT EXISTS class_teachers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
            teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
            branch_id UUID NOT NULL,
            assigned_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(class_id, teacher_id)
          )
        `);

        // Clean up previous homeroom assignments for this teacher
        await client.query(`DELETE FROM class_teachers WHERE teacher_id = $1`, [teacherId]);

        // Sync with class_teachers
        if (grades && sections) {
          for (const grade of grades) {
            const secList = sections[grade] || [];
            for (const sec of secList) {
              const clsRes = await client.query(
                `SELECT id FROM classes WHERE branch_id = $1 AND (name = $2 OR grade = $2) AND section = $3`,
                [branchId, grade, sec]
              );
              if (clsRes.rows.length > 0) {
                const classId = clsRes.rows[0].id;
                // Delete previous teacher for this specific class
                await client.query(`DELETE FROM class_teachers WHERE class_id = $1`, [classId]);
                // Insert new assignment
                await client.query(
                  `INSERT INTO class_teachers (class_id, teacher_id, branch_id) VALUES ($1, $2, $3) ON CONFLICT (class_id, teacher_id) DO NOTHING`,
                  [classId, teacherId, branchId]
                );
              }
            }
          }
        }
      } else if (promotionType === 'before-school-educator') {
        // Clear department/home teacher flags when promoting to before-school educator
        await client.query(
          `UPDATE teachers 
           SET is_room_teacher = false,
               is_dean = false,
               subjects = $1,
               assigned_room_class = NULL,
               updated_at = NOW() 
           WHERE id = $2`,
          [[], teacherId]
        );
      }

      await client.query('COMMIT');
      return { success: true, promotionType };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new SchoolAdminService();
