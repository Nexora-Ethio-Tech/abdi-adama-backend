import pool from '../config/database';
import userService from './user.service';

class SchoolAdminService {
  // User Management (existing methods)
  async registerUser(userData: any) {
    // School admin creates users, so use 'school-admin' as createdBy
    return await userService.createUser(userData, 'school-admin');
  }

  async getBranchUsers(branchId: string, role?: string, status?: string) {
    let query = `
      SELECT u.*, b.name as branch_name
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
      `SELECT u.*, b.name as branch_name
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

    // Verify teacher belongs to branch
    const teacherCheck = await pool.query(
      'SELECT id FROM teachers WHERE id = $1 AND branch_id = $2',
      [teacherId, branchId]
    );

    if (teacherCheck.rows.length === 0) {
      throw new Error('Teacher not found or not in this branch');
    }

    const result = await pool.query(
      'UPDATE classes SET teacher_id = $1 WHERE id = $2 RETURNING *',
      [teacherId, classId]
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
}

export default new SchoolAdminService();
