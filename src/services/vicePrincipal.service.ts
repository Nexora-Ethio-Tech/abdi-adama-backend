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

  // Get all grade submissions in a branch
  async getGradeSubmissions(branchId: string) {
    const result = await pool.query(
      `SELECT gs.*, c.name as course_name, c.code as course_code, u.name as teacher_name
       FROM grade_submissions gs
       JOIN courses c ON gs.course_id = c.id
       JOIN teachers t ON gs.teacher_id = t.id
       JOIN users u ON t.user_id = u.id
       WHERE t.branch_id = $1
       ORDER BY gs.submitted_at DESC`,
      [branchId]
    );
    return result.rows;
  }

  // Get individual student grades for a locked course grade submission
  async getSubmittedGrades(courseId: string, submissionType: string, branchId: string) {
    // Verify course belongs to this branch
    const courseCheck = await pool.query(
      `SELECT c.id FROM courses c
       JOIN classes cl ON c.class_id = cl.id
       WHERE c.id = $1 AND cl.branch_id = $2`,
      [courseId, branchId]
    );

    if (courseCheck.rows.length === 0) {
      throw new Error('Course not found or access denied');
    }

    const result = await pool.query(
      `SELECT g.*, u.name as student_name, u.digital_id
       FROM grades g
       JOIN students s ON g.student_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE g.course_id = $1 AND g.type = $2 AND g.is_submitted = true
       ORDER BY u.name`,
      [courseId, submissionType]
    );

    return result.rows;
  }

  async getStaffAbsentCount(branchId: string, date?: string) {
    const targetDate = date || new Date().toISOString().split('T')[0];

    const totalResult = await pool.query(
      `SELECT COUNT(*)::int as total
       FROM users u
       WHERE u.branch_id = $1
         AND u.is_active = true
         AND u.status != 'Revoked'
         AND u.role != 'student'
         AND u.role != 'parent'`,
      [branchId]
    );

    const presentResult = await pool.query(
      `SELECT COUNT(*)::int as present
       FROM employee_attendance ea
       JOIN users u ON ea.user_id = u.id
       WHERE u.branch_id = $1
         AND ea.date = $2
         AND ea.status IN ('present', 'late', 'excused', 'leave')`,
      [branchId, targetDate]
    );

    const total = totalResult.rows[0].total;
    const present = presentResult.rows[0].present;
    const absent = total - present;

    return {
      date: targetDate,
      totalStaff: total,
      presentCount: present,
      absentCount: absent > 0 ? absent : 0,
    };
  }

  // Get today's absent students with parent contact info
  async getTodayAbsentStudents(branchId: string) {
    const today = new Date().toISOString().split('T')[0];

    const result = await pool.query(
      `SELECT 
        s.id,
        s.user_id,
        u.name as student_name,
        s.grade,
        COALESCE(c.name, s.grade) as section_name,
        s.parent_phone,
        s.parent_name,
        t.id as teacher_id,
        tu.name as room_teacher
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN classes c ON s.section_id = c.id
      LEFT JOIN teachers t ON t.branch_id = s.branch_id AND (t.assigned_room_class = c.name OR t.assigned_room_class = s.grade)
      LEFT JOIN users tu ON t.user_id = tu.id
      WHERE s.branch_id = $1 
        AND s.id IN (
          SELECT DISTINCT student_id 
          FROM student_attendance sa
          WHERE sa.date = $2 AND sa.status = 'absent'
        )
      ORDER BY s.grade, COALESCE(c.name, s.grade), u.name`,
      [branchId, today]
    );

    return result.rows.map(row => ({
      id: row.id,
      name: row.student_name,
      grade: row.grade,
      section: row.section_name || 'General',
      parentName: row.parent_name || 'Not Assigned',
      parentPhone: row.parent_phone || 'N/A',
      studentId: row.user_id,
      roomTeacher: row.room_teacher || 'Not Assigned'
    }));
  }

  // Grade Management Methods
  async getGradesAndSections(branchId: string) {
    const result = await pool.query(
      `SELECT 
        c.id,
        c.name as class_name,
        COUNT(DISTINCT s.id) as student_count,
        c.capacity
      FROM classes c
      LEFT JOIN students s ON s.section_id = c.id
      WHERE c.branch_id = $1
      GROUP BY c.id, c.name, c.capacity
      ORDER BY c.name`,
      [branchId]
    );

    // Group by grade
    const gradesMap: Record<string, any> = {};
    for (const row of result.rows) {
      const className = row.class_name;
      const gradeMatch = className.match(/^(?:Grade\s*)?(\d{1,2})\s*([A-Za-z]*)$/i);
      const gradeName = gradeMatch ? `Grade ${gradeMatch[1]}` : className;
      const sectionName = gradeMatch ? (gradeMatch[2] || className.replace(gradeName, '').trim() || 'A') : className;
      if (!gradesMap[gradeName]) {
        gradesMap[gradeName] = {
          grade_name: gradeName,
          sections: []
        };
      }
      gradesMap[gradeName].sections.push({
        id: row.id,
        section_name: sectionName,
        student_count: parseInt(row.student_count) || 0,
        capacity: row.capacity || 0
      });
    }

    return Object.values(gradesMap);
  }

  async getStudentsBySection(sectionId: string, branchId: string) {
    const result = await pool.query(
      `SELECT 
        s.id,
        s.user_id,
        u.name as name,
        s.grade,
        COALESCE(c.name, s.grade) as section,
        s.created_at as enrollment_date
      FROM students s
      JOIN users u ON s.user_id = u.id
      JOIN classes c ON s.section_id = c.id
      WHERE c.id = $1 AND s.branch_id = $2
      ORDER BY u.name`,
      [sectionId, branchId]
    );

    return result.rows;
  }

  async getCoursesBySection(sectionId: string, branchId: string) {
    const result = await pool.query(
      `SELECT DISTINCT
        c.id,
        c.name,
        c.code,
        t.user_id as teacher_id,
        u.name as teacher_name
      FROM courses c
      LEFT JOIN teachers t ON c.teacher_id = t.id
      LEFT JOIN users u ON t.user_id = u.id
      JOIN classes cl ON c.class_id = cl.id
      WHERE cl.id = $1
      ORDER BY c.name`,
      [sectionId]
    );

    return result.rows;
  }

  async getSectionGrades(sectionId: string, branchId: string) {
    // Get students in the section
    const studentsResult = await pool.query(
      `SELECT s.id, s.user_id, u.name
       FROM students s
       JOIN users u ON s.user_id = u.id
       JOIN classes c ON s.section_id = c.id
       WHERE c.id = $1
       ORDER BY u.name`,
      [sectionId]
    );

    // Get courses for the branch
    const coursesResult = await pool.query(
      `SELECT id, name, code
       FROM courses
       WHERE class_id = $1
       ORDER BY name`,
      [sectionId]
    );

    // Get grades for all students in this section
    const gradesResult = await pool.query(
      `SELECT 
        g.id,
        g.student_id,
        g.course_id,
        g.score,
        g.total,
        g.type as submission_type
      FROM grades g
      WHERE g.student_id IN (SELECT id FROM students WHERE section_id = $1)
        AND g.course_id IN (SELECT id FROM courses WHERE class_id = $1)` ,
      [sectionId]
    );

    // Structure the data
    const gradesMap: Record<string, Record<string, any>> = {};
    for (const student of studentsResult.rows) {
      gradesMap[student.id] = {
        id: student.id,
        name: student.name,
        grades: {}
      };
    }

    for (const grade of gradesResult.rows) {
      if (gradesMap[grade.student_id]) {
        gradesMap[grade.student_id].grades[grade.course_id] = {
          id: grade.id,
          score: grade.score,
          total: grade.total,
          submission_type: grade.submission_type
        };
      }
    }

    return {
      students: studentsResult.rows,
      courses: coursesResult.rows,
      grades: Object.values(gradesMap)
    };
  }

  async generateSectionResults(sectionId: string, branchId: string) {
    // Get all students in the section
    const studentsResult = await pool.query(
      `SELECT s.id
       FROM students s
       JOIN classes c ON s.section_id = c.id
       WHERE c.id = $1`,
      [sectionId]
    );

    // Calculate totals, averages, and ranks for each student
    const results: any[] = [];
    for (const student of studentsResult.rows) {
      const gradesResult = await pool.query(
        `SELECT score, total
         FROM grades
         WHERE student_id = $1
           AND is_submitted = true
           AND course_id IN (SELECT id FROM courses WHERE class_id = $2)`,
        [student.id, sectionId]
      );

      if (gradesResult.rows.length > 0) {
        const total = gradesResult.rows.reduce((sum, g) => sum + (parseFloat(g.score) || 0), 0);
        const average = total / gradesResult.rows.length;

        results.push({
          student_id: student.id,
          total,
          average: parseFloat(average.toFixed(2))
        });
      }
    }

    // Calculate ranks
    results.sort((a, b) => b.total - a.total);
    results.forEach((result, index) => {
      result.rank = index + 1;
    });

    // Update the database with calculated values
    for (const result of results) {
      await pool.query(
        `UPDATE grades
         SET total = $1, average = $2, rank = $3
         WHERE student_id = $4
           AND course_id IN (SELECT id FROM courses WHERE class_id = $5)`,
        [result.total, result.average, result.rank, result.student_id, sectionId]
      );
    }

    return results;
  }

  // --- Teacher Leaderboard Methods ---
  
  async getLeaderboard(branchId: string) {
    const result = await pool.query(
      `SELECT 
        t.id as teacher_id,
        u.name as teacher_name,
        COALESCE(t.vp_rating, 0) as vp_rating,
        (
          SELECT COUNT(*)
          FROM teacher_of_week_votes v
          JOIN branches b ON v.branch_id = b.id
          WHERE v.teacher_id = t.id 
            AND v.created_at >= COALESCE(b.leaderboard_last_reset, '1970-01-01'::timestamptz)
        ) as student_votes,
        (
          SELECT COALESCE(SUM(dean_rating), 0)
          FROM weekly_plans wp
          JOIN branches b ON t.branch_id = b.id
          WHERE wp.teacher_id = t.id
            AND wp.created_at >= COALESCE(b.leaderboard_last_reset, '1970-01-01'::timestamptz)
        ) as plan_rating_sum,
        (
          SELECT STRING_AGG(DISTINCT COALESCE(cl.grade, cl.name), ', ' ORDER BY COALESCE(cl.grade, cl.name))
          FROM courses c
          JOIN classes cl ON c.class_id = cl.id
          WHERE c.teacher_id = t.id AND cl.branch_id = $1
        ) as grades_taught
      FROM teachers t
      JOIN users u ON t.user_id = u.id
      WHERE t.branch_id = $1 AND u.status != 'Revoked'
      ORDER BY u.name`,
      [branchId]
    );

    // Calculate total points
    const leaderboard = result.rows.map(row => {
      const studentVotes = parseInt(row.student_votes) || 0;
      const vpRating = parseInt(row.vp_rating) || 0;
      const planRatingSum = parseFloat(row.plan_rating_sum) || 0;
      const totalPoints = studentVotes + (vpRating * 100) + (planRatingSum * 10);
      
      // Parse grades_taught into a sorted unique array
      const gradesTaught: string[] = row.grades_taught
        ? row.grades_taught.split(', ').filter(Boolean)
        : [];

      return {
        ...row,
        student_votes: studentVotes,
        vp_rating: vpRating,
        plan_rating_sum: planRatingSum,
        total_points: totalPoints,
        grades_taught: gradesTaught
      };
    });

    // Sort by points descending
    return leaderboard.sort((a, b) => b.total_points - a.total_points);
  }

  async rateTeacher(teacherId: string, rating: number, branchId: string) {
    // Ensure teacher belongs to this branch
    const teacherCheck = await pool.query(
      'SELECT id FROM teachers WHERE id = $1 AND branch_id = $2',
      [teacherId, branchId]
    );

    if (teacherCheck.rows.length === 0) {
      throw new Error('Teacher not found or access denied');
    }

    const result = await pool.query(
      `UPDATE teachers SET vp_rating = $1 WHERE id = $2 RETURNING *`,
      [rating, teacherId]
    );

    return result.rows[0];
  }

  async resetLeaderboard(branchId: string) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update leaderboard_last_reset for the branch
      await client.query(
        `UPDATE branches SET leaderboard_last_reset = CURRENT_TIMESTAMP WHERE id = $1`,
        [branchId]
      );

      // Reset vp_rating for all teachers in this branch
      await client.query(
        `UPDATE teachers SET vp_rating = 0 WHERE branch_id = $1`,
        [branchId]
      );

      await client.query('COMMIT');
      return { success: true, message: 'Leaderboard reset successfully' };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

export default new VicePrincipalService();
