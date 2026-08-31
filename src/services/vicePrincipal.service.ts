import pool from '../config/database';
import {
  canUnlockGradeSubmission,
  getCurrentAcademicPeriod,
  getGradeUnlockWindowDays,
} from '../shared/gradeSubmissionPolicy';
import { formatSemester, ethiopianToGregorianIso } from '../shared/ethiopianCalendar';
import { getEthiopianNow } from './schoolAdmin.service';

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
  async getBranchTeachers(branchId: string, date?: string) {
    const targetDate = date || new Date().toLocaleDateString('en-CA');
    const result = await pool.query(
      `SELECT 
        t.id,
        t.user_id,
        t.branch_id,
        t.subjects,
        t.branch,
        t.classes_count,
        t.is_in_class,
        t.is_dean,
        t.is_room_teacher,
        t.assigned_room_class,
        t.department,
        t.hire_date,
        t.experience,
        t.bio,
        t.is_examiner,
        t.vp_rating,
        u.name,
        u.email,
        u.digital_id,
        u.status,
        u.staff_profile,
        u.zk_device_id,
        u.document_file_name,
        u.document_file_size,
        u.document_mime_type,
        COALESCE((SELECT COUNT(*) FROM classes c WHERE c.teacher_id = t.id), 0)::int as classes_assigned,
        COALESCE((SELECT COUNT(*) FROM weekly_plans wp WHERE wp.teacher_id = t.id), 0)::int as plans_submitted,
        COALESCE((SELECT COUNT(*) FROM weekly_plans wp WHERE wp.teacher_id = t.id AND wp.status = 'Pending'), 0)::int as plans_pending,
        ea.status as today_attendance_status,
        COALESCE((SELECT COUNT(*)::int
                  FROM employee_attendance ea2
                  JOIN users u2 ON ea2.user_id = u2.id
                  WHERE u2.branch_id = $1 AND ea2.date = $2), 0) as today_attendance_count
      FROM teachers t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN employee_attendance ea ON ea.user_id = u.id AND ea.date = $2
      WHERE t.branch_id = $1
      ORDER BY u.name`,
      [branchId, targetDate]
    );

    return result.rows;
  }

  /**
   * Returns all branch staff members with their biometric attendance status for a given date.
   * Excludes students and parents. Used by Vice Principal for dashboard monitoring and proxy suggestions.
   */
  async getStaffAttendance(branchId: string, startDate?: string, endDate?: string) {
    const ethNow = getEthiopianNow();

    // Fallback to today's Ethiopian date if no start date is provided
    const targetStart = startDate || ethNow.dateStr;
    // If no end date is provided, treat it as a single date query
    const targetEnd = endDate || targetStart;

    // We only need the Gregorian start date for the single-date ISODOW/calendar calculations
    const gregStartStr = ethiopianToGregorianIso(targetStart);

    const result = await pool.query(
      `SELECT
          u.id,
          u.name,
          u.email,
          u.digital_id,
          u.role,
          u.zk_device_id,
          u.status,
          b.name AS branch_name,
          COALESCE(
            t.department,
            CASE u.role
              WHEN 'teacher'        THEN 'Academics'
              WHEN 'finance-clerk'  THEN 'Finance'
              WHEN 'librarian'      THEN 'Library'
              WHEN 'clinic-admin'   THEN 'Clinic'
              WHEN 'driver'         THEN 'Transport'
              WHEN 'auditor'        THEN 'Audit'
              WHEN 'school-admin'   THEN 'Administration'
              WHEN 'vice-principal' THEN 'Administration'
              ELSE u.role::text
            END
          ) AS department,
          t.subjects,
          COALESCE(t.classes_count, 0)::int AS classes_count,
          CASE 
            WHEN $2::date = $3::date THEN COALESCE(ea.date::text, $2::text)
            ELSE ea.date::text 
          END                              AS attendance_date,
          CASE
            WHEN $2::date = $3::date THEN
              CASE
                WHEN EXTRACT(ISODOW FROM $6::date) IN (6, 7) THEN 'Weekend'
                WHEN EXISTS (
                  SELECT 1 FROM school_calendar sc
                  WHERE $6::date BETWEEN sc.start_date AND sc.end_date
                    AND (sc.branch_id = u.branch_id OR sc.branch_id IS NULL)
                    AND sc.day_type IN ('holiday', 'summer_break', 'semester_break', 'exam_day', 'half_day')
                ) THEN 'Holiday'
                ELSE 'Pending'
              END
            ELSE 'Range'
          END                              AS day_off_type,
          -- Effective status: staff auto-absent when past 02:20 AM Ethiopian time with no punch
          -- AND it is a teaching day (not a weekend, holiday, or school break)
          CASE
            WHEN ea.status IS NOT NULL THEN ea.status
            WHEN ea.id IS NULL
              AND $2::date = $3::date
              AND u.role::text IN ('teacher', 'vice-principal')
              -- Not a weekend (based on Gregorian calendar)
              AND EXTRACT(ISODOW FROM $6::date) NOT IN (6, 7)
              -- Not a holiday or break in the school calendar (based on Gregorian calendar)
              AND NOT EXISTS (
                SELECT 1 FROM school_calendar sc
                WHERE $6::date BETWEEN sc.start_date AND sc.end_date
                  AND (sc.branch_id = u.branch_id OR sc.branch_id IS NULL)
                  AND sc.day_type IN ('holiday', 'summer_break', 'semester_break', 'exam_day', 'half_day')
              )
              AND (
                $2::date < $4::date
                OR ($2::date = $4::date AND $5::time > TIME '02:20:00')
              )
            THEN 'absent'
            ELSE NULL
          END                              AS attendance_status,
          COALESCE(ea.is_late_arrival, false) AS is_late_arrival,
          ea.sign_in_time,
          ea.lunch_out_time,
          ea.lunch_in_time,
          ea.sign_out_time,
          ea.recorded_by,
          ea.created_at                    AS attendance_recorded_at,
          CASE
            WHEN ea.recorded_by = 'zk-machine' THEN true
            ELSE false
          END                              AS is_biometric
       FROM users u
       LEFT JOIN branches b ON b.id = u.branch_id
       LEFT JOIN teachers t ON t.user_id = u.id
       LEFT JOIN employee_attendance ea
              ON ea.user_id = u.id AND ea.date BETWEEN $2::date AND $3::date
       WHERE u.branch_id = $1
         AND u.role NOT IN ('student', 'parent', 'super-admin')
         AND u.status = 'Approved'
       ORDER BY
         -- Absent first (VP can act on them), then late, half-day, present, no-punch
         CASE
           WHEN COALESCE(ea.status,
             CASE
               WHEN ea.id IS NULL AND $2::date = $3::date AND u.role::text IN ('teacher', 'vice-principal')
                 AND EXTRACT(ISODOW FROM $6::date) NOT IN (6, 7)
                 AND NOT EXISTS (
                   SELECT 1 FROM school_calendar sc
                   WHERE $6::date BETWEEN sc.start_date AND sc.end_date
                     AND (sc.branch_id = u.branch_id OR sc.branch_id IS NULL)
                     AND sc.day_type IN ('holiday', 'summer_break', 'semester_break')
                 )
                 AND ($2::date < $4::date OR ($2::date = $4::date AND $5::time > TIME '02:20:00'))
               THEN 'absent' ELSE 'zzz' END
           ) = 'absent'   THEN 1
           WHEN COALESCE(ea.status,'zzz') = 'late'     THEN 2
           WHEN COALESCE(ea.status,'zzz') = 'half-day' THEN 3
           WHEN COALESCE(ea.status,'zzz') = 'present'  THEN 4
           ELSE 5
         END,
         u.name,
         ea.date DESC`,
      [branchId, targetStart, targetEnd, ethNow.dateStr, ethNow.time24, gregStartStr]
    );

    return result.rows;
  }

  async getTeacherAttendanceDetail(branchId: string, userId: string, startDate: string, endDate: string) {
    const teacherResult = await pool.query(
      `SELECT 
        u.id as user_id,
        t.id as teacher_id,
        u.name,
        u.email,
        u.digital_id
       FROM users u
       JOIN teachers t ON t.user_id = u.id
       WHERE u.id = $1 AND t.branch_id = $2`,
      [userId, branchId]
    );

    if (teacherResult.rows.length === 0) {
      throw new Error('Teacher not found or access denied');
    }

    const attendanceResult = await pool.query(
      `SELECT ea.date, ea.status
       FROM employee_attendance ea
       WHERE ea.user_id = $1
         AND ea.date BETWEEN $2 AND $3
       ORDER BY ea.date ASC`,
      [userId, startDate, endDate]
    );

    const branchDailyCountsResult = await pool.query(
      `SELECT ea.date, COUNT(*)::int as record_count
       FROM employee_attendance ea
       JOIN users u ON ea.user_id = u.id
       WHERE u.branch_id = $1
         AND ea.date BETWEEN $2 AND $3
       GROUP BY ea.date
       ORDER BY ea.date ASC`,
      [branchId, startDate, endDate]
    );

    return {
      teacher: teacherResult.rows[0],
      attendance: attendanceResult.rows,
      branchDailyCounts: branchDailyCountsResult.rows
    };
  }

  // Attendance Summary
  async getAttendanceSummary(branchId: string, date?: string, gradeLevel?: string) {
    const targetDate = date || getEthiopianNow().dateStr;

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
        AND COALESCE(g.is_finalized, false) = true
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
    const today = getEthiopianNow().dateStr;
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
  async getStudentTranscript(studentId: string, branchId: string, academicYear?: string, semester?: number) {
    const activeYear = academicYear || this.getActiveAcademicYear();
    const activeSem = semester !== undefined ? semester : this.getActiveSemester();

    // Resolve the student using either the internal UUID or the visible school identifier.
    const studentResult = await pool.query(
      `SELECT 
        s.id, s.grade, s.status, s.section_id,
        u.name, u.email, u.digital_id
      FROM students s
      JOIN users u ON s.user_id = u.id
      WHERE s.branch_id = $2
        AND (
          s.id::text = $1
          OR u.digital_id = $1
          OR COALESCE(u.username, '') = $1
        )
      LIMIT 1`,
      [studentId, branchId]
    );

    if (studentResult.rows.length === 0) {
      throw new Error('Student not found or not in your branch');
    }

    const student = studentResult.rows[0];

    // Get grades grouped by course for the specified academic year and semester
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
        AND g.academic_year = $2
        AND g.semester = $3
        AND COALESCE(g.is_finalized, false) = true
      ORDER BY c.name, g.created_at DESC`,
      [student.id, activeYear, activeSem]
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

    // Calculate student's rank in their section for the specified academic year and semester
    let studentRank = 0;
    let sectionId = null;

    // 1. Try to find the section the student was in during that academic year
    const sectionCheck = await pool.query(
      `SELECT DISTINCT c.class_id
       FROM grades g
       JOIN courses c ON g.course_id = c.id
       WHERE g.student_id = $1 AND g.academic_year = $2
       LIMIT 1`,
      [student.id, activeYear]
    );

    if (sectionCheck.rows.length > 0) {
      sectionId = sectionCheck.rows[0].class_id;
    } else {
      sectionId = student.section_id;
    }

    let className = student.grade;
    let sectionName = '';

    if (sectionId) {
      const classCheck = await pool.query(
        `SELECT name, section, grade FROM classes WHERE id = $1`,
        [sectionId]
      );
      if (classCheck.rows.length > 0) {
        const cls = classCheck.rows[0];
        className = cls.grade || cls.name || student.grade;
        sectionName = cls.section ? `Section ${cls.section}` : '';
      }

      // Get all students who were in this section in this year
      const sectionStudents = await pool.query(
        `SELECT DISTINCT s.id
         FROM students s
         LEFT JOIN classes cl ON s.section_id = cl.id
         WHERE s.branch_id = $2
           AND (
             s.section_id = $1
             OR
             s.id IN (
               SELECT DISTINCT g.student_id 
               FROM grades g
               JOIN courses co ON g.course_id = co.id
               WHERE co.class_id = $1 AND g.academic_year = $3
             )
           )`,
        [sectionId, branchId, activeYear]
      );

      const studentAverages: Array<{ studentId: string; average: number }> = [];

      for (const sRow of sectionStudents.rows) {
        const courseAgg = await pool.query(
          `SELECT c.id as course_id,
                  COALESCE(SUM(NULLIF(COALESCE(g.score::text, ''), '')::numeric), 0) AS score,
                  COALESCE(SUM(NULLIF(COALESCE(g.total::text, ''), '')::numeric), 0) AS total
           FROM grades g
           JOIN courses c ON g.course_id = c.id
           WHERE g.student_id = $1
             AND COALESCE(g.is_finalized, false) = true
             AND c.class_id = $2
             AND g.academic_year = $3
             AND g.semester = $4
           GROUP BY c.id`,
          [sRow.id, sectionId, activeYear, activeSem]
        );

        let sumPercent = 0;
        let subjectCount = 0;

        for (const r of courseAgg.rows) {
          const sVal = parseFloat(r.score) || 0;
          const tVal = parseFloat(r.total) || 0;
          const pct = tVal > 0 ? (sVal / tVal) * 100 : 0;
          sumPercent += pct;
          subjectCount++;
        }

        const averagePct = subjectCount > 0 ? sumPercent / subjectCount : 0;
        studentAverages.push({ studentId: sRow.id, average: averagePct });
      }

      studentAverages.sort((a, b) => b.average - a.average);

      const index = studentAverages.findIndex(sa => sa.studentId === student.id);
      if (index !== -1) {
        studentRank = index + 1;
      }
    }

    return {
      studentId: student.id,
      studentName: student.name,
      className: className,
      section: sectionName,
      academicYear: `${activeYear}`,
      semester: activeSem === 1 ? 'First Semester' : 'Second Semester',
      overallAverage: overallAverage,
      overallRank: studentRank,
      courses: courses.map(course => ({
        courseId: course.courseId,
        courseName: course.courseName,
        courseCode: course.courseCode,
        teacherId: course.teacherId,
        teacherName: course.teacherName,
        grades: course.grades
      }))
    };
  }

  async searchStudents(branchId: string, query: string) {
    const searchTerm = `%${query.trim()}%`;

    const result = await pool.query(
      `SELECT 
        s.id,
        u.name,
        u.digital_id,
        u.username,
        s.grade,
        COALESCE(c.name, s.grade) as section_name
       FROM students s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN classes c ON s.section_id = c.id
       WHERE s.branch_id = $1
         AND (
           u.name ILIKE $2
           OR u.digital_id ILIKE $2
           OR COALESCE(u.username, '') ILIKE $2
           OR s.id::text ILIKE $2
         )
       ORDER BY u.name
       LIMIT 20`,
      [branchId, searchTerm]
    );

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      digitalId: row.digital_id,
      username: row.username,
      grade: row.grade,
      section: row.section_name || 'General'
    }));
  }

  // Get every expected assessment in a branch, including assessments that have
  // not been submitted yet. Each row is scoped to one exact academic period.
  async getGradeSubmissions(branchId: string, academicYear?: string, semester?: number) {
    const activePeriod = getCurrentAcademicPeriod();
    const selectedYear = academicYear && /^\d{4}\/\d{4}$/.test(academicYear)
      ? academicYear
      : activePeriod.academicYear;
    const selectedSemester = semester === 1 || semester === 2
      ? semester
      : activePeriod.semester;

    const result = await pool.query(
      `SELECT
         COALESCE(gs.id::text, c.id::text || ':' || gc.method_id || ':' || $2 || ':' || $3::text) AS id,
         c.id AS course_id,
         c.name AS course_name,
         c.code AS course_code,
         t.id AS teacher_id,
         u.name AS teacher_name,
         COALESCE(cl.grade, cl.name) AS grade_level,
         COALESCE(NULLIF(TRIM(cl.section), ''), '1') AS section_name,
         gc.method_id AS submission_type,
         $2::varchar AS academic_year,
         $3::smallint AS semester,
         gs.submitted_at,
         COALESCE(gs.is_locked, false) AS is_locked,
         COALESCE(gs.submission_stage, 'not_submitted') AS submission_stage
       FROM courses c
       JOIN classes cl ON c.class_id = cl.id
       JOIN teachers t ON c.teacher_id = t.id
       JOIN users u ON t.user_id = u.id
       JOIN LATERAL (
         SELECT configured.method_id, configured.label, configured.max_weight
         FROM grading_configs configured
         WHERE regexp_replace(LOWER(TRIM(configured.grade_level)), '^grade\\s*', '', 'i') =
               regexp_replace(LOWER(TRIM(COALESCE(cl.grade, cl.name))), '^grade\\s*', '', 'i')
            OR (
              LOWER(TRIM(configured.grade_level)) = 'default'
              AND NOT EXISTS (
                SELECT 1
                FROM grading_configs exact_config
                WHERE regexp_replace(LOWER(TRIM(exact_config.grade_level)), '^grade\\s*', '', 'i') =
                      regexp_replace(LOWER(TRIM(COALESCE(cl.grade, cl.name))), '^grade\\s*', '', 'i')
              )
            )
       ) gc ON true
       LEFT JOIN grade_submissions gs
         ON gs.course_id = c.id
        AND gs.teacher_id = t.id
        AND gs.submission_type = gc.method_id
        AND gs.academic_year = $2
        AND gs.semester = $3
       WHERE cl.branch_id = $1
       ORDER BY COALESCE(cl.grade, cl.name), cl.section, c.name, gc.method_id`,
      [branchId, selectedYear, selectedSemester]
    );
    return result.rows;
  }

  getGradeSubmissionPolicy() {
    return {
      unlockWindowDays: getGradeUnlockWindowDays(),
      activeSemesterOnly: true,
      activePeriod: getCurrentAcademicPeriod(),
    };
  }

  async setGradeSubmissionOpen(open: boolean, updatedBy: string) {
    await pool.query(
      `INSERT INTO system_settings (key, value, updated_by, updated_at)
       VALUES ('grade_submission_open', $1, $2, NOW())
       ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
      [String(open), updatedBy]
    );
    return { open };
  }

  async unlockGradeSubmission(branchId: string, unlockedBy: string, data: {
    courseId: string;
    submissionType: string;
    academicYear: string;
    semester: number;
  }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const submissionResult = await client.query(
        `SELECT gs.*
         FROM grade_submissions gs
         JOIN teachers t ON gs.teacher_id = t.id
         JOIN courses c ON gs.course_id = c.id
         JOIN classes cl ON c.class_id = cl.id
         WHERE gs.course_id = $1
           AND gs.submission_type = $2
           AND gs.academic_year = $3
           AND gs.semester = $4
           AND t.branch_id = $5
           AND cl.branch_id = $5
         FOR UPDATE`,
        [data.courseId, data.submissionType, data.academicYear, data.semester, branchId]
      );

      const submission = submissionResult.rows[0];
      if (!submission) {
        const error: any = new Error('Grade submission not found or access denied.');
        error.statusCode = 404;
        throw error;
      }
      if (!submission.is_locked || !submission.submitted_at) {
        const error: any = new Error('This assessment is already unlocked.');
        error.statusCode = 409;
        throw error;
      }

      if (!canUnlockGradeSubmission({
        academicYear: data.academicYear,
        semester: data.semester as 1 | 2,
        submittedAt: submission.submitted_at,
      })) {
        const error: any = new Error(
          `Unlock denied: only submissions from the active semester and within ${getGradeUnlockWindowDays()} days can be unlocked.`
        );
        error.statusCode = 403;
        throw error;
      }

      const unlockedResult = await client.query(
        `UPDATE grade_submissions
         SET is_locked = false, submission_stage = 'saved', updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [submission.id]
      );

      await client.query(
        `UPDATE grades
         SET is_submitted = false,
             is_finalized = false,
             status = 'draft',
             submitted_at = NULL,
             submitted_by = NULL
         WHERE course_id = $1
           AND type = $2
           AND academic_year = $3
           AND semester = $4`,
        [data.courseId, data.submissionType, data.academicYear, data.semester]
      );

      await client.query(
        `DELETE FROM grade_submission_locks
         WHERE course_id = $1
           AND grading_component = $2
           AND academic_year = $3
           AND semester = $4
           AND branch_id = $5`,
        [data.courseId, data.submissionType, data.academicYear, data.semester, branchId]
      );

      await client.query('COMMIT');
      return {
        ...unlockedResult.rows[0],
        unlocked_by: unlockedBy,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Get individual student grades for a locked course grade submission
  async getSubmittedGrades(
    courseId: string,
    submissionType: string,
    branchId: string,
    academicYear?: string,
    semester?: number
  ) {
    const periodConditions: string[] = [];
    const submissionParams: Array<string | number> = [courseId, submissionType, branchId];
    if (academicYear) {
      submissionParams.push(academicYear);
      periodConditions.push(`gs.academic_year = $${submissionParams.length}`);
    }
    if (semester !== undefined) {
      submissionParams.push(semester);
      periodConditions.push(`gs.semester = $${submissionParams.length}`);
    }

    // Verify course belongs to this branch and find the matching finalized submission period
    const submissionResult = await pool.query(
      `SELECT gs.academic_year, gs.semester
       FROM grade_submissions gs
       JOIN teachers t ON gs.teacher_id = t.id
       WHERE gs.course_id = $1
         AND gs.submission_type = $2
         AND gs.submission_stage = 'finalized'
         AND gs.is_locked = true
         AND t.branch_id = $3
         ${periodConditions.length ? `AND ${periodConditions.join(' AND ')}` : ''}
       ORDER BY gs.academic_year DESC, gs.semester DESC, gs.submitted_at DESC
       LIMIT 1`,
      submissionParams
    );

    if (submissionResult.rows.length === 0) {
      throw new Error('Grade submission not found or access denied');
    }

    const {
      academic_year: resolvedAcademicYear,
      semester: resolvedSemester,
    } = submissionResult.rows[0];

    const result = await pool.query(
      `SELECT g.*, u.name as student_name, u.digital_id
       FROM grades g
       JOIN students s ON g.student_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE g.course_id = $1
         AND g.type = $2
         AND g.academic_year = $3
         AND g.semester = $4
         AND g.score IS NOT NULL
         AND COALESCE(g.is_finalized, false) = true
       ORDER BY u.name`,
      [courseId, submissionType, resolvedAcademicYear, resolvedSemester]
    );

    return result.rows;
  }

  async getStaffAbsentCount(branchId: string, date?: string) {
    const targetDate = date || new Date().toLocaleDateString('en-CA');

    const totalResult = await pool.query(
      `SELECT COUNT(*)::int as total
       FROM users u
       WHERE u.branch_id = $1
         AND u.is_active = true
         AND u.status != 'Revoked'
         AND u.role != 'student'
         AND u.role != 'parent'
         AND u.role != 'super-admin'`,
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
  async getTodayAbsentStudents(branchId: string, date?: string) {
    const targetDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : getEthiopianNow().dateStr;

    const result = await pool.query(
      `SELECT 
        s.id,
        s.user_id,
        u.name as student_name,
        COALESCE(c.name, CASE WHEN s.grade ~ '^[0-9]+$' THEN 'Grade ' || s.grade ELSE s.grade END) as grade_name,
        COALESCE(c.section, 'General') as section_name,
        COALESCE(s.parent_phone, (SELECT pa.parent_phone FROM pending_applications pa WHERE pa.student_user_id = s.user_id LIMIT 1)) as parent_phone,
        COALESCE(s.parent_name, (SELECT pa.parent_name FROM pending_applications pa WHERE pa.student_user_id = s.user_id LIMIT 1)) as parent_name,
        (
          SELECT tu.name
          FROM teachers t
          JOIN users tu ON t.user_id = tu.id
          WHERE t.branch_id = s.branch_id 
            AND t.is_room_teacher = true 
            AND (
              t.assigned_room_class = (c.name || c.section) 
              OR t.assigned_room_section_id = c.id
              OR t.assigned_room_class = c.name
            )
          LIMIT 1
        ) as room_teacher,
        sa.status
      FROM students s
      JOIN users u ON s.user_id = u.id
      JOIN student_attendance sa ON s.id = sa.student_id AND sa.date = $2
      LEFT JOIN classes c ON s.section_id = c.id
      WHERE s.branch_id = $1 
        AND sa.status IN ('absent', 'excused')
      ORDER BY 
        COALESCE(c.name, s.grade), 
        COALESCE(c.section, ''), 
        u.name`,
      [branchId, targetDate]
    );

    return result.rows.map(row => ({
      id: row.id,
      name: row.student_name,
      grade: row.grade_name,
      section: row.section_name,
      parentName: row.parent_name || 'Not Assigned',
      parentPhone: row.parent_phone || 'N/A',
      studentId: row.user_id,
      roomTeacher: row.room_teacher || 'Not Assigned',
      status: row.status
    }));
  }

  // Grade Management Methods
  async getGradesAndSections(branchId: string) {
    const result = await pool.query(
      `SELECT 
        c.id,
        COALESCE(c.grade, c.name) as grade_name,
        COALESCE(NULLIF(TRIM(c.section), ''), '1') as section_name,
        COUNT(DISTINCT s.id) as student_count,
        COALESCE(c.capacity, 0) as capacity
      FROM classes c
      LEFT JOIN students s ON s.section_id = c.id
      WHERE c.branch_id = $1
      GROUP BY c.id, COALESCE(c.grade, c.name), COALESCE(NULLIF(TRIM(c.section), ''), '1'), c.capacity
      ORDER BY 
        COALESCE(c.grade, c.name),
        CASE
          WHEN COALESCE(NULLIF(TRIM(c.section), ''), '1') ~ '^[0-9]+$' THEN COALESCE(NULLIF(TRIM(c.section), ''), '1')::int
          ELSE 9999
        END,
        COALESCE(NULLIF(TRIM(c.section), ''), '1')`,
      [branchId]
    );

    // Group by grade
    const gradesMap: Record<string, any> = {};
    for (const row of result.rows) {
      const gradeName = row.grade_name || 'Unknown Grade';
      const sectionName = row.section_name || '1';

      if (!gradesMap[gradeName]) {
        gradesMap[gradeName] = {
          grade_name: gradeName,
          sections: []
        };
      }

      const existingSection = gradesMap[gradeName].sections.find((section: any) => section.section_name === sectionName);
      if (existingSection) {
        existingSection.student_count += parseInt(row.student_count) || 0;
        existingSection.capacity = Math.max(existingSection.capacity || 0, row.capacity || 0);
        if (!existingSection.id) {
          existingSection.id = row.id;
        }
      } else {
        gradesMap[gradeName].sections.push({
          id: row.id,
          section_name: sectionName,
          student_count: parseInt(row.student_count) || 0,
          capacity: row.capacity || 0
        });
      }
    }

    return Object.values(gradesMap).map((group: any) => ({
      ...group,
      sections: group.sections.sort((a: any, b: any) => {
        const aValue = Number.parseInt(String(a.section_name), 10);
        const bValue = Number.parseInt(String(b.section_name), 10);
        if (Number.isFinite(aValue) && Number.isFinite(bValue)) {
          return aValue - bValue;
        }
        return String(a.section_name).localeCompare(String(b.section_name), undefined, { numeric: true, sensitivity: 'base' });
      })
    }));
  }

  async getStudentsBySection(sectionId: string, branchId: string, academicYear?: string) {
    let result;
    if (academicYear) {
      result = await pool.query(
        `SELECT DISTINCT
          s.id,
          s.user_id,
          u.name as name,
          s.grade,
          COALESCE(c.name, s.grade) as section,
          s.created_at as enrollment_date
        FROM students s
        JOIN users u ON s.user_id = u.id
        LEFT JOIN classes c ON s.section_id = c.id
        WHERE s.branch_id = $2
          AND (
            s.section_id = $1
            OR
            s.id IN (
              SELECT DISTINCT g.student_id 
              FROM grades g
              JOIN courses co ON g.course_id = co.id
              WHERE co.class_id = $1 AND g.academic_year = $3
            )
          )
        ORDER BY u.name`,
        [sectionId, branchId, academicYear]
      );
    } else {
      result = await pool.query(
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
    }

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
        AND cl.branch_id = $2
      ORDER BY c.name`,
      [sectionId, branchId]
    );

    return result.rows;
  }

  private getActiveSemester(): number {
    const now = new Date();
    const m = now.getMonth() + 1;
    const d = now.getDate();
    if ((m === 9 && d >= 11) || m >= 10 || m === 1) return 1;
    if (m >= 2 && m <= 6) return 2;
    return 2; // Jul–Sep 10 summer
  }

  private getActiveAcademicYear(): string {
    const now = new Date();
    const m = now.getMonth() + 1;
    const d = now.getDate();
    const gYear = now.getFullYear();
    const ecYear = (m > 9 || (m === 9 && d >= 11)) ? gYear - 7 : gYear - 8;
    return `${ecYear + 7}/${ecYear + 8}`;
  }

  async getSectionGrades(sectionId: string, branchId: string, academicYear?: string, semester?: number) {
    const activeYear = academicYear || this.getActiveAcademicYear();
    const activeSem = semester !== undefined ? semester : this.getActiveSemester();

    // Get students in the section for the specified academic year
    const students = await this.getStudentsBySection(sectionId, branchId, activeYear);

    // Get courses for the section
    const coursesResult = await pool.query(
      `SELECT c.id, c.name, c.code
       FROM courses c
       JOIN classes cl ON c.class_id = cl.id
       WHERE cl.id = $1
         AND cl.branch_id = $2
       ORDER BY c.name`,
      [sectionId, branchId]
    );

    // Get grades for all students in this section.
    // VP Principal should see course-level totals built from finalized grade items.
    // If no grades exist for the requested semester, try to get them from any available semester.
    let gradesResult = await pool.query(
      `SELECT 
        g.student_id,
        g.course_id,
        COALESCE(SUM(NULLIF(COALESCE(g.score::text, ''), '')::numeric), 0) AS score,
        COALESCE(SUM(NULLIF(COALESCE(g.total::text, ''), '')::numeric), 0) AS total,
        MAX(g.academic_year) AS academic_year,
        MAX(g.semester) AS semester
      FROM grades g
      JOIN students s ON g.student_id = s.id
      JOIN courses c ON g.course_id = c.id
      JOIN classes cl ON c.class_id = cl.id
      WHERE cl.id = $1
        AND cl.branch_id = $2
        AND g.academic_year = $3
        AND g.semester = $4
        AND COALESCE(g.is_finalized, false) = true
      GROUP BY g.student_id, g.course_id`,
      [sectionId, branchId, activeYear, activeSem]
    );

    // If no grades found for the requested semester, try to find what semesters have data
    if (gradesResult.rows.length === 0) {
      const availableSemesters = await pool.query(
        `SELECT DISTINCT g.semester
        FROM grades g
        JOIN students s ON g.student_id = s.id
        JOIN courses c ON g.course_id = c.id
        JOIN classes cl ON c.class_id = cl.id
        WHERE cl.id = $1
          AND cl.branch_id = $2
          AND g.academic_year = $3
          AND COALESCE(g.is_finalized, false) = true
        ORDER BY g.semester DESC
        LIMIT 1`,
        [sectionId, branchId, activeYear]
      );

      // If we found grades in a different semester, fetch those instead
      if (availableSemesters.rows.length > 0) {
        const availableSemester = availableSemesters.rows[0].semester;
        gradesResult = await pool.query(
          `SELECT 
            g.student_id,
            g.course_id,
            COALESCE(SUM(NULLIF(COALESCE(g.score::text, ''), '')::numeric), 0) AS score,
            COALESCE(SUM(NULLIF(COALESCE(g.total::text, ''), '')::numeric), 0) AS total,
            MAX(g.academic_year) AS academic_year,
            MAX(g.semester) AS semester
          FROM grades g
          JOIN students s ON g.student_id = s.id
          JOIN courses c ON g.course_id = c.id
          JOIN classes cl ON c.class_id = cl.id
          WHERE cl.id = $1
            AND cl.branch_id = $2
            AND g.academic_year = $3
            AND g.semester = $4
            AND COALESCE(g.is_finalized, false) = true
          GROUP BY g.student_id, g.course_id`,
          [sectionId, branchId, activeYear, availableSemester]
        );
      }
    }

    // Structure the data
    const gradesMap: Record<string, Record<string, any>> = {};
    for (const student of students) {
      gradesMap[student.id] = {
        id: student.id,
        name: student.name,
        grades: {}
      };
    }

    for (const grade of gradesResult.rows) {
      if (gradesMap[grade.student_id]) {
        gradesMap[grade.student_id].grades[grade.course_id] = {
          score: grade.score !== null ? Number(grade.score) : 0,
          total: grade.total !== null ? Number(grade.total) : 0
        };
      }
    }

    return {
      students: students,
      courses: coursesResult.rows,
      grades: Object.values(gradesMap),
      queriedSemester: activeSem,
      queriedYear: activeYear,
      availableDataSemester: gradesResult.rows.length > 0 ? gradesResult.rows[0].semester : null
    };
  }

  async generateSectionResults(sectionId: string, branchId: string, academicYear?: string, semester?: number) {
    const activeYear = academicYear || this.getActiveAcademicYear();
    const activeSem = semester !== undefined ? semester : this.getActiveSemester();

    // Get all students in the section and branch for the specified academic year
    const students = await this.getStudentsBySection(sectionId, branchId, activeYear);

    // Calculate totals, averages, and ranks for each student
    const results: any[] = [];
    for (const student of students) {
      const gradesResult = await pool.query(
        `SELECT score, total
         FROM grades g
         JOIN courses c ON g.course_id = c.id
         JOIN classes cl ON c.class_id = cl.id
         WHERE g.student_id = $1
           AND COALESCE(g.is_finalized, false) = true
           AND cl.id = $2
           AND cl.branch_id = $3
           AND g.academic_year = $4
           AND g.semester = $5`,
        [student.id, sectionId, branchId, activeYear, activeSem]
      );

      if (gradesResult.rows.length > 0) {
        // Aggregate percentages per subject/course then average across subjects
        const courseAgg = await pool.query(
          `SELECT c.id as course_id,
                  COALESCE(SUM(NULLIF(COALESCE(g.score::text, ''), '')::numeric), 0) AS score,
                  COALESCE(SUM(NULLIF(COALESCE(g.total::text, ''), '')::numeric), 0) AS total
           FROM grades g
           JOIN courses c ON g.course_id = c.id
           JOIN classes cl ON c.class_id = cl.id
           WHERE g.student_id = $1
             AND COALESCE(g.is_finalized, false) = true
             AND cl.id = $2
             AND cl.branch_id = $3
             AND g.academic_year = $4
             AND g.semester = $5
           GROUP BY c.id`,
          [student.id, sectionId, branchId, activeYear, activeSem]
        );

        let sumPercent = 0;
        let subjectCount = 0;

        for (const r of courseAgg.rows) {
          const s = parseFloat(r.score) || 0;
          const t = parseFloat(r.total) || 0;
          const pct = t > 0 ? (s / t) * 100 : 0;
          sumPercent += pct;
          subjectCount++;
        }

        const averagePct = subjectCount > 0 ? sumPercent / subjectCount : 0;

        results.push({
          student_id: student.id,
          // total is sum of subject percentages (useful for debugging/export); average is the mean percentage across subjects
          total: parseFloat(sumPercent.toFixed(2)),
          average: parseFloat(averagePct.toFixed(2))
        });
      }
    }

    // Calculate ranks (sort by average percentage)
    results.sort((a, b) => b.average - a.average);
    results.forEach((result, index) => {
      result.rank = index + 1;
    });

    // Return the calculated results without mutating per-grade records.
    // The caller updates the frontend row state directly.
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
            AND v.branch_id = $1
            AND v.created_at >= COALESCE(b.leaderboard_last_reset, '1970-01-01'::timestamptz)
        ) as student_votes,
        (
          SELECT COALESCE(SUM(r.rating_value), 0)
          FROM teacher_ratings r
          JOIN branches b ON t.branch_id = b.id
          WHERE r.teacher_id = t.id
            AND r.created_at >= COALESCE(b.leaderboard_last_reset, '1970-01-01'::timestamptz)
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
      const totalPoints = studentVotes + (vpRating * 100) + planRatingSum;

      // Parse grades_taught into a sorted unique array, stripping sections
      const extractedGrades = new Set<string>();
      if (row.grades_taught) {
        row.grades_taught.split(', ').forEach((g: string) => {
          const trimmed = g.trim();
          const match = trimmed.match(/(\d{1,2})/);
          if (match) {
            extractedGrades.add(`Grade ${match[1]}`);
          } else {
            // For non-numeric grades like KG, remove trailing single letters if they look like sections
            const noSection = trimmed.replace(/\s+[A-Z]$/i, '');
            extractedGrades.add(noSection);
          }
        });
      }

      const gradesTaught: string[] = Array.from(extractedGrades).sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.replace(/\D/g, '')) || 0;
        if (numA && numB) return numA - numB;
        return a.localeCompare(b);
      });

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

  async getCommunicationSummary(sectionId: string, weekEnding: string, branchId: string) {
    // 1. Get homeroom teacher
    const teacherResult = await pool.query(
      `SELECT u.name as teacher_name
       FROM classes c
       LEFT JOIN class_teachers ct ON ct.class_id = c.id
       LEFT JOIN teachers t ON ct.teacher_id = t.id OR (t.is_room_teacher = true AND t.assigned_room_class = c.name)
       LEFT JOIN users u ON t.user_id = u.id
       WHERE c.id = $1 AND c.branch_id = $2
       ORDER BY ct.assigned_at DESC, t.updated_at DESC
       LIMIT 1`,
      [sectionId, branchId]
    );

    const homeroomTeacher = teacherResult.rows[0]?.teacher_name || 'Not Assigned';

    // 2. Get all students in the section with their parent name
    const studentsResult = await pool.query(
      `SELECT 
        s.id,
        s.user_id,
        u.name as student_name,
        COALESCE(
          (SELECT up.name 
           FROM parent_student ps 
           JOIN parents p ON ps.parent_id = p.id 
           JOIN users up ON p.user_id = up.id 
           WHERE ps.student_id = s.id 
           LIMIT 1),
          s.parent_name,
          (SELECT pa.parent_name FROM pending_applications pa WHERE pa.student_user_id = s.user_id LIMIT 1),
          'Not Assigned'
        ) as parent_name
       FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE s.section_id = $1 AND s.branch_id = $2
       ORDER BY u.name`,
      [sectionId, branchId]
    );

    // 3. For each student, check if they have a communication log submitted for this weekEnding
    const logsResult = await pool.query(
      `SELECT student_id, created_at
       FROM communication_logs
       WHERE DATE(week_ending) = $1::date`,
      [weekEnding]
    );

    const logsMap = new Set(logsResult.rows.map(row => row.student_id));
    const logsDateMap = new Map(logsResult.rows.map(row => [row.student_id, row.created_at]));

    const students = studentsResult.rows.map(student => {
      const sent = logsMap.has(student.id);
      return {
        id: student.id,
        name: student.student_name,
        parentName: student.parent_name,
        sent,
        sentAt: sent ? logsDateMap.get(student.id) : null
      };
    });

    const totalStudents = students.length;
    const sentCount = students.filter(s => s.sent).length;

    return {
      homeroomTeacher,
      totalStudents,
      sentCount,
      students
    };
  }

  async getTeacherAttendanceOversight(branchId: string, date?: string) {
    const ethNow = getEthiopianNow();
    const targetDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : ethNow.dateStr;
    const gregDateStr = ethiopianToGregorianIso(targetDate);
    if (!gregDateStr) {
      throw new Error('Invalid Ethiopian date format');
    }

    // Check weekend or calendar
    const calendarCheck = await pool.query(
      `SELECT 
        CASE 
          WHEN EXTRACT(ISODOW FROM $1::date) IN (6, 7) THEN 'Weekend'
          ELSE NULL
        END as weekend_type,
        (
          SELECT json_build_object('day_type', sc.day_type, 'title', sc.title, 'description', sc.description)
          FROM school_calendar sc
          WHERE $1::date BETWEEN sc.start_date AND sc.end_date
            AND (sc.branch_id = $2 OR sc.branch_id IS NULL)
            AND sc.day_type IN ('holiday', 'summer_break', 'semester_break')
          LIMIT 1
        ) as calendar_event`,
      [gregDateStr, branchId]
    );

    const row = calendarCheck.rows[0];
    if (row && (row.weekend_type || row.calendar_event)) {
      return {
        isWorkingDay: false,
        reason: row.weekend_type || row.calendar_event.day_type,
        title: row.weekend_type ? 'Weekend' : row.calendar_event.title,
        teachers: [],
        proxies: [],
        schedules: []
      };
    }

    // Working day! Get teachers and their attendance status
    const teachersResult = await pool.query(
      `SELECT 
        t.id AS teacher_id,
        u.id AS user_id,
        u.name,
        u.email,
        t.department,
        t.subjects,
        COALESCE(ea.status, 'present') AS attendance_status,
        ea.id AS attendance_id
      FROM public.users u
      JOIN public.teachers t ON t.user_id = u.id
      LEFT JOIN public.employee_attendance ea ON ea.user_id = u.id AND ea.date = $2::date
      WHERE u.branch_id = $1 AND u.role = 'teacher' AND u.status = 'Approved'
      ORDER BY u.name ASC`,
      [branchId, targetDate]
    );

    // Fetch proxy assignments for today
    const proxiesResult = await pool.query(
      `SELECT 
        pa.id,
        pa.absent_teacher_id,
        pa.proxy_teacher_id,
        pa.period_number,
        pa.class_name,
        pa.section,
        pa.subject,
        u_proxy.name as proxy_teacher_name
      FROM public.teacher_proxy_assignments pa
      JOIN public.teachers t_proxy ON pa.proxy_teacher_id = t_proxy.id
      JOIN public.users u_proxy ON t_proxy.user_id = u_proxy.id
      WHERE pa.date = $2::date AND pa.branch_id = $1`,
      [branchId, targetDate]
    );

    // Fetch schedules for the weekday of gregDateStr
    const dayOfWeekName = new Date(gregDateStr as string).toLocaleDateString('en-US', { weekday: 'long' });

    const schedulesResult = await pool.query(
      `SELECT 
        s.id,
        s.teacher_id,
        s.class_name,
        s.section,
        s.subject,
        s.period_number,
        s.time_slot
      FROM public.schedules s
      JOIN public.teachers t ON s.teacher_id = t.id
      JOIN public.users u ON t.user_id = u.id
      WHERE u.branch_id = $1 AND s.day = $2
      ORDER BY s.period_number ASC`,
      [branchId, dayOfWeekName]
    );

    return {
      isWorkingDay: true,
      teachers: teachersResult.rows,
      proxies: proxiesResult.rows,
      schedules: schedulesResult.rows,
      dayOfWeek: dayOfWeekName
    };
  }

  async recordTeacherAttendance(branchId: string, userId: string, date: string, status: string, recordedBy: string) {
    const ethNow = getEthiopianNow();
    const targetDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : ethNow.dateStr;
    const gregDateStr = ethiopianToGregorianIso(targetDate);
    if (!gregDateStr) {
      throw new Error('Invalid Ethiopian date format');
    }

    // Reconcile user belongs to branch
    const userResult = await pool.query('SELECT id, role FROM public.users WHERE id = $1 AND branch_id = $2', [userId, branchId]);
    if (userResult.rows.length === 0) {
      throw new Error('Teacher not found in this branch');
    }

    const validStatuses = ['present', 'absent', 'late', 'half-day', 'excused', 'leave'];
    const statusClean = status ? status.toLowerCase().trim() : '';

    if (statusClean && !validStatuses.includes(statusClean)) {
      await pool.query(
        `DELETE FROM public.employee_attendance WHERE user_id = $1 AND date = $2::date`,
        [userId, targetDate]
      );
      return null;
    }

    const result = await pool.query(
      `INSERT INTO public.employee_attendance (user_id, date, status, recorded_by)
       VALUES ($1, $2::date, $3, $4)
       ON CONFLICT (user_id, date) 
       DO UPDATE SET 
         status = EXCLUDED.status,
         recorded_by = EXCLUDED.recorded_by,
         created_at = NOW()
       RETURNING *`,
      [userId, targetDate, status, recordedBy]
    );

    // If marked present, delete any proxy schedules for this teacher as absent_teacher
    if (status === 'present') {
      const teacherRes = await pool.query('SELECT id FROM public.teachers WHERE user_id = $1', [userId]);
      if (teacherRes.rows.length > 0) {
        await pool.query(
          `DELETE FROM public.teacher_proxy_assignments 
           WHERE absent_teacher_id = $1 AND date = $2::date`,
          [teacherRes.rows[0].id, targetDate]
        );
      }
    }

    return result.rows[0];
  }

  async getProxyCandidates(
    branchId: string,
    date: string,
    className: string,
    section: string,
    periodNumber: number,
    absentTeacherId: string
  ) {
    const ethNow = getEthiopianNow();
    const targetDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : ethNow.dateStr;
    const gregDateStr = ethiopianToGregorianIso(targetDate);
    if (!gregDateStr) {
      throw new Error('Invalid Ethiopian date format');
    }
    const dayOfWeekName = new Date(gregDateStr as string).toLocaleDateString('en-US', { weekday: 'long' });

    // Parse class name and section dynamically from combined string
    let parsedClass = className;
    let parsedSection = section || '';
    const sectionIndex = className.indexOf('Section');
    if (sectionIndex > 0) {
      parsedClass = className.substring(0, sectionIndex).trim();
      parsedSection = className.substring(sectionIndex).trim();
    } else {
      const match = className.match(/^(\d+)([A-Z])$/i);
      if (match) {
        parsedClass = match[1];
        parsedSection = match[2];
      }
    }

    const result = await pool.query(
      `WITH present_teachers AS (
          SELECT 
            t.id AS teacher_id,
            u.id AS user_id,
            u.name,
            t.department,
            EXISTS (
              SELECT 1 FROM public.class_teachers ct
              JOIN public.classes c ON ct.class_id = c.id
              WHERE ct.teacher_id = t.id 
                AND (
                  (c.name = $2 AND c.section = $3) OR
                  (c.name || c.section = $7)
                )
              
              UNION
              
              SELECT 1 FROM public.classes c
              WHERE c.teacher_id = t.id 
                AND (
                  (c.name = $2 AND c.section = $3) OR
                  (c.name || c.section = $7)
                )
              
              UNION
              
              SELECT 1 FROM public.courses co
              JOIN public.classes c ON co.class_id = c.id
              WHERE co.teacher_id = t.id 
                AND (
                  (c.name = $2 AND c.section = $3) OR
                  (c.name || c.section = $7)
                )
              
              UNION
              
              SELECT 1 FROM public.schedules s
              WHERE s.teacher_id = t.id 
                AND (
                  (s.class_name = $2 AND s.section = $3) OR
                  (s.class_name = $7)
                )
            ) AS teaches_section
          FROM public.teachers t
          JOIN public.users u ON t.user_id = u.id
          LEFT JOIN public.employee_attendance ea ON ea.user_id = u.id AND ea.date = $8::date
          WHERE u.branch_id = $1
            AND u.role = 'teacher'
            AND u.status = 'Approved'
            AND t.id <> $5::uuid
            AND COALESCE(ea.status, 'present') NOT IN ('absent', 'excused', 'leave')
      ),
      free_teachers AS (
          SELECT pt.*
          FROM present_teachers pt
          WHERE NOT EXISTS (
              SELECT 1 FROM public.schedules s
              WHERE s.teacher_id = pt.teacher_id
                AND s.day = $4
                AND s.period_number = $6
          )
          AND NOT EXISTS (
              SELECT 1 FROM public.teacher_proxy_assignments pa
              WHERE pa.proxy_teacher_id = pt.teacher_id
                AND pa.date = $8::date
                AND pa.period_number = $6
          )
      )
      SELECT * 
      FROM free_teachers
      ORDER BY teaches_section DESC, name ASC`,
      [branchId, parsedClass, parsedSection, dayOfWeekName, absentTeacherId, periodNumber, className, targetDate]
    );

    return result.rows;
  }

  async saveProxyAssignment(
    branchId: string,
    absentTeacherId: string,
    proxyTeacherId: string,
    date: string,
    periodNumber: number,
    className: string,
    section: string,
    subject: string
  ) {
    const ethNow = getEthiopianNow();
    const targetDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : ethNow.dateStr;
    const gregDateStr = ethiopianToGregorianIso(targetDate);
    if (!gregDateStr) {
      throw new Error('Invalid Ethiopian date format');
    }

    // Parse class name and section dynamically from combined string if needed
    let parsedClass = className;
    let parsedSection = section || '';
    const sectionIndex = className.indexOf('Section');
    if (sectionIndex > 0) {
      parsedClass = className.substring(0, sectionIndex).trim();
      parsedSection = className.substring(sectionIndex).trim();
    } else {
      const match = className.match(/^(\d+)([A-Z])$/i);
      if (match) {
        parsedClass = match[1];
        parsedSection = match[2];
      }
    }

    const result = await pool.query(
      `INSERT INTO public.teacher_proxy_assignments 
         (branch_id, absent_teacher_id, proxy_teacher_id, date, period_number, class_name, section, subject)
       VALUES ($1, $2, $3, $4::date, $5, $6, $7, $8)
       ON CONFLICT (proxy_teacher_id, date, period_number) 
       DO UPDATE SET 
         absent_teacher_id = EXCLUDED.absent_teacher_id,
         class_name = EXCLUDED.class_name,
         section = EXCLUDED.section,
         subject = EXCLUDED.subject
       RETURNING *`,
      [branchId, absentTeacherId, proxyTeacherId, targetDate, periodNumber, parsedClass, parsedSection, subject]
    );
    return result.rows[0];
  }

  async deleteProxyAssignment(assignmentId: string, branchId: string) {
    const result = await pool.query(
      `DELETE FROM public.teacher_proxy_assignments 
       WHERE id = $1 AND branch_id = $2 
       RETURNING *`,
      [assignmentId, branchId]
    );
    if (result.rows.length === 0) {
      throw new Error('Proxy assignment not found');
    }
    return result.rows[0];
  }

}

export default new VicePrincipalService();
