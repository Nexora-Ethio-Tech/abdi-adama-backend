import pool from '../config/database';

class VicePrincipalService {
  // Absence Queue Management
  async getAbsenceQueue(branchId: string, status?: string) {
    let query = `
      SELECT aq.*, s.grade, u.name as student_name
      FROM absence_queue aq
      JOIN students s ON aq.student_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE s.branch_id = $1
    `;

    const params: any[] = [branchId];

    if (status) {
      query += ' AND aq.status = $2';
      params.push(status);
    }

    query += ' ORDER BY aq.reported_at DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  async updateAbsenceStatus(absenceId: string, status: string) {
    const result = await pool.query(
      `UPDATE absence_queue 
       SET status = $1
       WHERE id = $2
       RETURNING *`,
      [status, absenceId]
    );

    if (result.rows.length === 0) {
      throw new Error('Absence record not found');
    }

    return result.rows[0];
  }

  // Lesson Plan Review
  async getWeeklyPlans(branchId: string, status?: string, teacherId?: string) {
    let query = `
      SELECT 
        wp.*,
        u.name as teacher_name,
        u.email as teacher_email
      FROM weekly_plans wp
      JOIN teachers t ON wp.teacher_id = t.id
      JOIN users u ON t.user_id = u.id
      WHERE t.branch_id = $1
    `;

    const params: any[] = [branchId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      query += ` AND wp.status = $${paramCount}`;
      params.push(status);
    }

    if (teacherId) {
      paramCount++;
      query += ` AND wp.teacher_id = $${paramCount}`;
      params.push(teacherId);
    }

    query += ' ORDER BY wp.date DESC, wp.created_at DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  async reviewWeeklyPlan(planId: string, reviewedBy: string, reviewData: {
    status: string;
    deanFeedback?: string;
    deanRating?: number;
  }) {
    // Get teacher record for reviewed_by
    const teacherResult = await pool.query(
      'SELECT id FROM teachers WHERE user_id = $1',
      [reviewedBy]
    );

    if (teacherResult.rows.length === 0) {
      throw new Error('Reviewer not found');
    }

    const result = await pool.query(
      `UPDATE weekly_plans 
       SET status = $1, dean_feedback = $2, dean_rating = $3, 
           reviewed_by = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [
        reviewData.status,
        reviewData.deanFeedback || null,
        reviewData.deanRating || null,
        teacherResult.rows[0].id,
        planId
      ]
    );

    if (result.rows.length === 0) {
      throw new Error('Lesson plan not found');
    }

    return result.rows[0];
  }

  // Grade Locking
  async getGradeLocks(branchId: string) {
    const result = await pool.query(
      `SELECT 
        gl.*,
        u.name as locked_by_name,
        ay.year_name as academic_year_name
      FROM grade_locks gl
      LEFT JOIN users u ON gl.locked_by = u.id
      LEFT JOIN academic_years ay ON gl.academic_year_id = ay.id
      WHERE gl.branch_id = $1
      ORDER BY gl.grade_level`,
      [branchId]
    );

    return result.rows;
  }

  async toggleGradeLock(data: {
    gradeLevel: string;
    isLocked: boolean;
    branchId: string;
    lockedBy: string;
    academicYearId?: string;
  }) {
    const result = await pool.query(
      `INSERT INTO grade_locks (grade_level, is_locked, locked_by, locked_at, branch_id, academic_year_id)
       VALUES ($1, $2, $3, NOW(), $4, $5)
       ON CONFLICT (grade_level, branch_id, academic_year_id)
       DO UPDATE SET 
         is_locked = $2, 
         locked_by = $3, 
         locked_at = CASE WHEN $2 = true THEN NOW() ELSE NULL END
       RETURNING *`,
      [data.gradeLevel, data.isLocked, data.lockedBy, data.branchId, data.academicYearId || null]
    );

    return result.rows[0];
  }

  // Teacher Monitoring
  async getBranchTeachers(branchId: string) {
    const result = await pool.query(
      `SELECT 
        t.*,
        u.name, u.email, u.digital_id, u.status,
        COUNT(DISTINCT c.id) as classes_assigned,
        COUNT(DISTINCT wp.id) as plans_submitted,
        COUNT(DISTINCT CASE WHEN wp.status = 'Pending' THEN wp.id END) as plans_pending
      FROM teachers t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN classes c ON t.id = c.teacher_id
      LEFT JOIN weekly_plans wp ON t.id = wp.teacher_id
      WHERE t.branch_id = $1
      GROUP BY t.id, u.name, u.email, u.digital_id, u.status
      ORDER BY u.name`,
      [branchId]
    );

    return result.rows;
  }

  // Attendance Summary
  async getAttendanceSummary(branchId: string, date?: string, gradeLevel?: string) {
    const targetDate = date || new Date().toISOString().split('T')[0];

    let query = `
      SELECT 
        s.grade,
        COUNT(DISTINCT s.id) as total_students,
        COUNT(DISTINCT CASE WHEN sa.status = 'present' THEN sa.student_id END) as present,
        COUNT(DISTINCT CASE WHEN sa.status = 'absent' THEN sa.student_id END) as absent,
        COUNT(DISTINCT CASE WHEN sa.status = 'late' THEN sa.student_id END) as late,
        COUNT(DISTINCT CASE WHEN sa.status = 'excused' THEN sa.student_id END) as excused
      FROM students s
      LEFT JOIN student_attendance sa ON s.id = sa.student_id AND sa.date = $2
      WHERE s.branch_id = $1
    `;

    const params: any[] = [branchId, targetDate];

    if (gradeLevel) {
      query += ' AND s.grade = $3';
      params.push(gradeLevel);
    }

    query += ' GROUP BY s.grade ORDER BY s.grade';

    const result = await pool.query(query, params);
    return {
      date: targetDate,
      summary: result.rows
    };
  }

  // Academic Performance
  async getAcademicPerformance(branchId: string, gradeLevel?: string, courseId?: string) {
    let query = `
      SELECT 
        c.name as course_name,
        s.grade,
        COUNT(DISTINCT g.student_id) as students_graded,
        AVG(g.score) as average_score,
        MIN(g.score) as min_score,
        MAX(g.score) as max_score
      FROM grades g
      JOIN courses c ON g.course_id = c.id
      JOIN students s ON g.student_id = s.id
      WHERE s.branch_id = $1
    `;

    const params: any[] = [branchId];
    let paramCount = 1;

    if (gradeLevel) {
      paramCount++;
      query += ` AND s.grade = $${paramCount}`;
      params.push(gradeLevel);
    }

    if (courseId) {
      paramCount++;
      query += ` AND c.id = $${paramCount}`;
      params.push(courseId);
    }

    query += ' GROUP BY c.name, s.grade ORDER BY s.grade, c.name';

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Dashboard
  async getDashboard(branchId: string) {
    // Pending lesson plans
    const plansResult = await pool.query(
      `SELECT COUNT(*) as count FROM weekly_plans wp
       JOIN teachers t ON wp.teacher_id = t.id
       WHERE t.branch_id = $1 AND wp.status = 'Pending'`,
      [branchId]
    );

    // Pending absences
    const absencesResult = await pool.query(
      `SELECT COUNT(*) as count FROM absence_queue aq
       JOIN students s ON aq.student_id = s.id
       WHERE s.branch_id = $1 AND aq.status = 'pending'`,
      [branchId]
    );

    // Today's attendance rate
    const today = new Date().toISOString().split('T')[0];
    const attendanceResult = await pool.query(
      `SELECT 
        COUNT(DISTINCT s.id) as total_students,
        COUNT(DISTINCT CASE WHEN sa.status = 'present' THEN sa.student_id END) as present
       FROM students s
       LEFT JOIN student_attendance sa ON s.id = sa.student_id AND sa.date = $2
       WHERE s.branch_id = $1`,
      [branchId, today]
    );

    const totalStudents = parseInt(attendanceResult.rows[0].total_students);
    const present = parseInt(attendanceResult.rows[0].present);
    const attendanceRate = totalStudents > 0 ? ((present / totalStudents) * 100).toFixed(2) : 0;

    // Recent lesson plans
    const recentPlansResult = await pool.query(
      `SELECT wp.*, u.name as teacher_name
       FROM weekly_plans wp
       JOIN teachers t ON wp.teacher_id = t.id
       JOIN users u ON t.user_id = u.id
       WHERE t.branch_id = $1 AND wp.status = 'Pending'
       ORDER BY wp.created_at DESC
       LIMIT 5`,
      [branchId]
    );

    return {
      pendingPlansCount: parseInt(plansResult.rows[0].count),
      pendingAbsencesCount: parseInt(absencesResult.rows[0].count),
      todayAttendanceRate: parseFloat(attendanceRate as string),
      recentPendingPlans: recentPlansResult.rows
    };
  }

  // Get student transcript
  async getStudentTranscript(studentId: string, branchId: string) {
    // Get student info
    const studentResult = await pool.query(
      `SELECT 
        s.id, s.grade, s.status,
        u.name, u.email, u.digital_id
      FROM students s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = $1 AND s.branch_id = $2`,
      [studentId, branchId]
    );

    if (studentResult.rows.length === 0) {
      throw new Error('Student not found or not in your branch');
    }

    const student = studentResult.rows[0];

    // Get all grades grouped by course
    const gradesResult = await pool.query(
      `SELECT 
        g.id, g.type, g.score, g.total, g.weight, g.created_at,
        c.id as course_id, c.name as course_name, c.code as course_code,
        t.id as teacher_id,
        u.name as teacher_name
      FROM grades g
      JOIN courses c ON g.course_id = c.id
      LEFT JOIN teachers t ON c.teacher_id = t.id
      LEFT JOIN users u ON t.user_id = u.id
      WHERE g.student_id = $1
      ORDER BY c.name, g.created_at DESC`,
      [studentId]
    );

    // Group grades by course and calculate averages
    const courseMap = new Map();
    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (const grade of gradesResult.rows) {
      const courseId = grade.course_id;

      if (!courseMap.has(courseId)) {
        courseMap.set(courseId, {
          courseId: grade.course_id,
          courseName: grade.course_name,
          courseCode: grade.course_code,
          teacherId: grade.teacher_id,
          teacherName: grade.teacher_name,
          grades: [],
          totalScore: 0,
          totalPossible: 0,
          average: 0,
          gradeCount: 0
        });
      }

      const course = courseMap.get(courseId);
      const percentage = grade.total > 0 ? (grade.score / grade.total) * 100 : 0;

      course.grades.push({
        id: grade.id,
        type: grade.type,
        score: grade.score,
        total: grade.total,
        weight: grade.weight,
        percentage: parseFloat(percentage.toFixed(2)),
        createdAt: grade.created_at
      });

      course.totalScore += grade.score;
      course.totalPossible += grade.total;
      course.gradeCount++;

      // Calculate weighted contribution for overall average
      if (grade.weight) {
        const weight = parseFloat(grade.weight);
        totalWeightedScore += percentage * weight;
        totalWeight += weight;
      }
    }

    // Calculate course averages
    const courses = Array.from(courseMap.values()).map(course => {
      course.average = course.totalPossible > 0 
        ? parseFloat(((course.totalScore / course.totalPossible) * 100).toFixed(2))
        : 0;
      return course;
    });

    // Calculate overall average
    const overallAverage = totalWeight > 0 
      ? parseFloat((totalWeightedScore / totalWeight).toFixed(2))
      : courses.length > 0
        ? parseFloat((courses.reduce((sum, c) => sum + c.average, 0) / courses.length).toFixed(2))
        : 0;

    return {
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        digitalId: student.digital_id,
        grade: student.grade,
        status: student.status
      },
      courses,
      summary: {
        totalCourses: courses.length,
        totalGrades: gradesResult.rows.length,
        overallAverage,
        gradeStatus: overallAverage >= 50 ? 'Passing' : 'Needs Improvement'
      }
    };
  }
}

export default new VicePrincipalService();
