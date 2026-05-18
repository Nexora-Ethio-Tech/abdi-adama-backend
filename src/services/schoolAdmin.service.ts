import pool from '../config/database';
import userService from './user.service';
import { generate4DigitPIN, hashPassword } from '../utils/password';

class SchoolAdminService {
  // User Management (existing methods)
  async registerUser(userData: any) {
    // School admin creates users, so use 'school-admin' as createdBy
    return await userService.createUser(userData, 'school-admin');
  }

  async getBranchUsers(branchId: string, role?: string, status?: string) {
    let query = `
      SELECT u.id, u.digital_id, u.username, u.name, u.email, u.role, 
             u.branch_id, u.status, u.is_active, u.created_at, u.updated_at,
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
              u.branch_id, u.status, u.is_active, u.created_at, u.updated_at,
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

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    paramCount++;
    fields.push(`updated_at = NOW()`);
    values.push(userId);

    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, digital_id, name, email, role, status, branch_id`,
      values
    );

    // If student, update grade in students table
    if (user.role === 'student' && updateData.grade) {
      await pool.query(
        `UPDATE students SET grade = $1 WHERE user_id = $2`,
        [updateData.grade, userId]
      );
    }

    return result.rows[0];
  }

  // Assign Student to Class
  async assignStudentToClass(studentId: string, classId: string, branchId: string) {
    // Verify student exists and belongs to branch
    const studentCheck = await pool.query(
      `SELECT s.id, s.user_id, u.role 
       FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE s.user_id = $1 AND s.branch_id = $2`,
      [studentId, branchId]
    );

    if (studentCheck.rows.length === 0) {
      throw new Error('Student not found in your branch');
    }

    // Verify class exists and belongs to branch
    const classCheck = await pool.query(
      'SELECT id, name FROM classes WHERE id = $1 AND branch_id = $2',
      [classId, branchId]
    );

    if (classCheck.rows.length === 0) {
      throw new Error('Class not found in your branch');
    }

    const className = classCheck.rows[0].name;

    // Update student's grade to match class name
    const result = await pool.query(
      `UPDATE students 
       SET grade = $1, updated_at = NOW()
       WHERE user_id = $2
       RETURNING *`,
      [className, studentId]
    );

    // Update class student count
    await pool.query(
      `UPDATE classes 
       SET student_count = (SELECT COUNT(*) FROM students WHERE grade = $1 AND branch_id = $2)
       WHERE id = $3`,
      [className, branchId, classId]
    );

    return {
      student: result.rows[0],
      class: classCheck.rows[0]
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
    const result = await pool.query(
      `INSERT INTO classes (name, capacity, section, branch_id, student_count)
       VALUES ($1, $2, $3, $4, 0)
       RETURNING *`,
      [data.name, data.capacity || 0, data.section || null, data.branchId]
    );

    return result.rows[0];
  }

  async getClasses(branchId: string) {
    const result = await pool.query(
      `SELECT 
        c.*,
        u.name as teacher_name,
        COUNT(DISTINCT s.id) as actual_student_count
      FROM classes c
      LEFT JOIN teachers t ON c.teacher_id = t.id
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN students s ON s.grade = c.name AND s.branch_id = c.branch_id
      WHERE c.branch_id = $1
      GROUP BY c.id, u.name
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
       JOIN classes c ON s.grade = c.name AND s.branch_id = c.branch_id
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

  // Teacher Assignment
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

    const result = await pool.query(
      'UPDATE classes SET teacher_id = $1 WHERE id = $2 RETURNING *',
      [actualTeacherId, classId]
    );

    return result.rows[0];
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

  // Academic Year Management
  async createAcademicYear(data: {
    yearName: string;
    startDate: string;
    endDate: string;
    branchId: string;
  }) {
    const result = await pool.query(
      `INSERT INTO academic_years (year_name, start_date, end_date, branch_id, is_active)
       VALUES ($1, $2, $3, $4, false)
       RETURNING *`,
      [data.yearName, data.startDate, data.endDate, data.branchId]
    );

    return result.rows[0];
  }

  async getAcademicYears(branchId: string) {
    const result = await pool.query(
      `SELECT * FROM academic_years
       WHERE branch_id = $1
       ORDER BY start_date DESC`,
      [branchId]
    );

    return result.rows;
  }

  async activateAcademicYear(yearId: string, branchId: string) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Deactivate all other years for this branch
      await client.query(
        'UPDATE academic_years SET is_active = false WHERE branch_id = $1',
        [branchId]
      );

      // Activate the selected year
      const result = await client.query(
        `UPDATE academic_years 
         SET is_active = true, updated_at = NOW()
         WHERE id = $1 AND branch_id = $2
         RETURNING *`,
        [yearId, branchId]
      );

      if (result.rows.length === 0) {
        throw new Error('Academic year not found or access denied');
      }

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Student Application Management
  async getPendingApplications(branchId: string, status?: string) {
    let query = 'SELECT * FROM pending_applications WHERE branch_id = $1';
    const params: any[] = [branchId];

    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  async updateApplicationStatus(applicationId: string, status: string) {
    const result = await pool.query(
      `UPDATE pending_applications 
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, applicationId]
    );

    if (result.rows.length === 0) {
      throw new Error('Application not found');
    }

    return result.rows[0];
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

    // Total teachers
    const teachersResult = await pool.query(
      'SELECT COUNT(*) as count FROM teachers WHERE branch_id = $1',
      [branchId]
    );

    // Total classes
    const classesResult = await pool.query(
      'SELECT COUNT(*) as count FROM classes WHERE branch_id = $1',
      [branchId]
    );

    // Pending applications
    const applicationsResult = await pool.query(
      `SELECT COUNT(*) as count FROM pending_applications 
       WHERE branch_id = $1 AND status = 'pending'`,
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
      totalStudents: studentsResult.rows.reduce((sum, row) => sum + parseInt(row.count), 0),
      totalTeachers: parseInt(teachersResult.rows[0].count),
      totalClasses: parseInt(classesResult.rows[0].count),
      pendingApplications: parseInt(applicationsResult.rows[0].count),
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
        u.name, u.email, u.digital_id, u.status
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
        c.id as class_id,
        c.name as class_name,
        c.section as class_section,
        c.capacity as class_capacity,
        c.student_count as class_student_count
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN classes c ON s.grade = c.name AND s.branch_id = c.branch_id
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
      query += ` AND u.status = $${paramCount}`;
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
      LEFT JOIN classes c ON s.grade = c.name AND s.branch_id = c.branch_id
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

  // Get Upcoming Events for branch
  async getUpcomingEvents(branchId: string, limit: number = 10) {
    const result = await pool.query(
      `SELECT 
        id,
        title,
        date,
        type,
        description,
        created_at
      FROM events
      WHERE branch_id = $1
        AND date >= CURRENT_DATE
      ORDER BY date ASC, created_at ASC
      LIMIT $2`,
      [branchId, limit]
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
}

export default new SchoolAdminService();
