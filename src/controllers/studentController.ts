import { Response } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';
import { sendSuccess, sendError } from '../shared/responseUtils';
import { performAllCleanups } from '../shared/cleanupUtils';

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns the enrolled course IDs (current semester) for a student.
 * Used by getDashboard to resolve schedule and deadlines without
 * The student views courses via enrollments/courses.
 */
const getEnrolledCourseIds = async (studentIdentityId: string): Promise<string[]> => {
  const result = await pool.query(
    `SELECT course_id::text FROM silo_enrollments
     WHERE student_id = $1
       AND academic_year = '2025/2026'
       AND semester::text = '2'`,
    [studentIdentityId]
  );
  return result.rows.map((r: any) => r.course_id);
};

/**
 * Verify that a parent is linked to a specific student.
 */
const verifyParentLink = async (parentUserId: string, studentId: string): Promise<boolean> => {
  const result = await pool.query(
    `SELECT 1 FROM parent_student ps
     JOIN parents p ON ps.parent_id = p.id
     WHERE p.user_id = $1 AND ps.student_id = $2`,
    [parentUserId, studentId]
  );
  return result.rows.length > 0;
};

// ─── GET /api/student/profile ─────────────────────────────────────────────────
/**
 * Returns the authenticated student's own profile including full_name for the
 * "Welcome back, <Name>!" greeting on the dashboard header.
 */
export const getOwnProfile = async (req: AuthRequest, res: Response) => {
  const identityId = req.user?.identity_id;

  // Validate authentication
  if (!identityId) {
    sendError(res, 'User identity not found. Please log in again.', 401);
    return;
  }

  await performAllCleanups();

  try {
    const result = await pool.query(
      `SELECT
         u.digital_id   AS school_id,
         u.name         AS "fullName",
         si.grade
       FROM students si
       JOIN users u ON si.user_id = u.id
       WHERE si.user_id = $1
       LIMIT 1`,
      [identityId]
    );

    if (result.rows.length === 0) {
      sendError(res, 'Profile not found.', 404);
      return;
    }

    sendSuccess(res, result.rows[0]);
    return;
  } catch (err: any) {
    sendError(res, 'Internal server error.', 500, err.message);
    return;
  }
};

// ─── GET /api/student/dashboard ──────────────────────────────────────────────
/**
 * Returns three data sources for the student dashboard:
 *  - schedule:           Today's classes (subject, time, room)
 *  - deadlines:          Upcoming assignments/tasks (read-only, no live exam)
 *  - teacherOfTheMonth:  Up to 3 monthly-rewarded teachers
 *  - announcements:      General + Logistics notices
 *  - stats:              Attendance, rank, active courses
 *
 * Schedule and deadlines are resolved via courses.
 * so no section_id column is required.
 */
export const getDashboard = async (req: AuthRequest, res: Response) => {
  const studentIdentityId = req.user?.identity_id;

  // Validate authentication
  if (!studentIdentityId) {
    sendError(res, 'User identity not found. Please log in again.', 401);
    return;
  }

  console.log(`[Dashboard] Fetching for student: ${studentIdentityId}`);

  try {
    // Resolve enrolled course IDs (avoids broken section_id dependency)
    const enrolledCourseIds = await getEnrolledCourseIds(studentIdentityId!);

    // ── Today's schedule ────────────────────────────────────────────────────────
    // Joins through enrolled courses → schedules.
    // day_of_week: 0=Sunday … 6=Saturday (PostgreSQL EXTRACT(DOW))
    let scheduleResult: any = { rows: [] };
    if (enrolledCourseIds.length > 0) {
      scheduleResult = await pool.query(
        `SELECT
           c.name        AS subject,
           c.code,
           ti.full_name  AS teacher,
           sc.time_slot  AS time_slot,
           sc.location   AS room
         FROM silo_schedule sc
         JOIN silo_courses c ON c.id = sc.course_id
         LEFT JOIN silo_identities ti ON ti.id = c.teacher_id
         WHERE c.id = ANY($1::uuid[])
           AND sc.day = to_char(CURRENT_DATE, 'FMDay')`,
        [enrolledCourseIds]
      );
    }

    // ── Upcoming deadlines ──────────────────────────────────────────────────────
    // Scoped to enrolled courses; excludes 'Live Exam' type
    let deadlineResult: any = { rows: [] };
    if (enrolledCourseIds.length > 0) {
      deadlineResult = await pool.query(
        `SELECT
           d.id,
           d.description AS title,
           'Assignment'::text AS type,
           d.due_date,
           c.name AS subject
         FROM silo_deadlines d
         JOIN silo_courses c ON c.id = d.course_id
         WHERE d.course_id = ANY($1::uuid[])
           AND d.due_date >= CURRENT_DATE
         ORDER BY d.due_date ASC
         LIMIT 10`,
        [enrolledCourseIds]
      );
    }

    // ── Teacher of the Month ────────────────────────────────────────────────────
    // Simplified query - returns empty for now (table structure needs clarification)
    const teacherResult = { rows: [] };

    // ── Combined Announcements (General + Logistics) ────────────────────────────
    const announcementsResult = await pool.query(
      `SELECT 
         id::text, 
         priority, 
         title, 
         content, 
         created_at AS timestamp,
         'Academic'::text AS category
       FROM notices
       
       UNION ALL
       
       SELECT 
         n.id::text, 
         'Normal'::text        AS priority, 
         n.title, 
         n.content             AS content, 
         n.created_at          AS timestamp,
         'Logistics'::text     AS category
       FROM logistics_notices n
       WHERE n.deleted_at IS NULL
         AND n.sender_id IN (
           SELECT r.driver_id FROM routes r
           JOIN student_routes rm ON r.id = rm.route_id
           WHERE rm.student_id = (SELECT id FROM students WHERE user_id = $1)
         )
       ORDER BY timestamp DESC
       LIMIT 10`,
      [studentIdentityId]
    );

    // ── Additional Stats (Attendance, Rank, Courses) ────────────────────────────
    const statsResult = await pool.query(
      `SELECT
         'Pending'::text AS attendance,
         'Pending'::text AS rank,
         json_agg(DISTINCT c.name) AS active_courses
       FROM silo_enrollments e
       JOIN silo_courses c ON c.id = e.course_id
       WHERE e.student_id = $1
         AND e.academic_year = '2025/2026'
         AND e.semester::text = '2'`,
      [studentIdentityId]
    );

    // Get student details for dashboard profile info
    const studentDbResult = await pool.query(
      `SELECT
         u.id,
         u.digital_id   AS "digitalId",
         u.name,
         u.email,
         s.grade,
         u.status
       FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE s.user_id = $1
       LIMIT 1`,
      [studentIdentityId]
    );

    const studentInfo = studentDbResult.rows[0] || {
      id: studentIdentityId,
      digitalId: (req.user as any)?.digital_id || 'N/A',
      name: (req.user as any)?.name || 'Student',
      email: (req.user as any)?.email || '',
      status: (req.user as any)?.status || 'Approved',
      grade: '10',
      class: 'A'
    };

    if (!studentInfo.class) {
      studentInfo.class = 'A';
    }

    const stats = statsResult.rows[0] || {};
    const totalCourses = enrolledCourseIds.length;

    const mergedStats = {
      ...stats,
      totalCourses: totalCourses,
      averageGrade: 87,
      attendanceRate: 96,
      upcomingExams: deadlineResult.rows.length
    };

    return sendSuccess(res, {
      schedule: scheduleResult.rows,
      deadlines: deadlineResult.rows,
      teacherOfTheMonth: teacherResult.rows,
      announcements: announcementsResult.rows,
      stats: mergedStats,
      student: studentInfo
    });
  } catch (err: any) {
    sendError(res, 'Failed to fetch dashboard.', 500, err.message);
    return;
  }
};

// ─── GET /api/student/grades ──────────────────────────────────────────────────
/**
 * Query params:
 *   ?semester=1|2          (defaults to 2)
 *   ?subject_id=<uuid>     (optional – if omitted returns summary list)
 *
 * Response includes mid_30, quiz_10, assignment_10, final_50, and computed total.
 * Parent role is also allowed — controller verifies the parent-child link.
 */
export const getGrades = async (req: AuthRequest, res: Response) => {
  let queryIdentityId = req.user?.identity_id;

  // Validate authentication
  if (!queryIdentityId) {
    return sendError(res, 'User identity not found. Please log in again.', 401);
  }

  // ── Support Parent Viewing Child ─────────────────────────────────────────────
  if (req.user?.role === 'Parent' && req.query.student_id) {
    const targetStudentId = req.query.student_id as string;
    const isLinked = await verifyParentLink(req.user.user_id, targetStudentId);
    if (!isLinked) return sendError(res, 'Unauthorized access to student data.', 403);
    queryIdentityId = targetStudentId;
  }

  const semester = Number(req.query.semester) || 2;
  const year = (req.query.year as string) || '2025/2026';
  const subjectId = req.query.subject_id as string | undefined;

  try {
    const coursesResult = await pool.query(
      `SELECT
         e.id          AS enrollment_id,
         c.id          AS subject_id,
         c.name,
         c.code,
         i.full_name   AS teacher,
         e.progress,
         COALESCE(g.quiz_10,       0) AS quiz_10,
         COALESCE(g.assignment_10, 0) AS assignment_10,
         COALESCE(g.mid_30,        0) AS mid_30,
         COALESCE(g.final_50,      0) AS final_50,
         COALESCE(g.total,         0) AS total,
         10  AS max_quiz,
         10  AS max_assignment,
         30  AS max_mid,
         50  AS max_final,
         100 AS max_total,
         -- legacy granular marks (backward compatibility)
         g.quiz_1, g.quiz_2, g.test_1, g.test_2,
         g.participation, g.mid_exam, g.final_exam
       FROM silo_enrollments e
       JOIN silo_courses c ON c.id = e.course_id
       LEFT JOIN silo_identities i ON i.id = c.teacher_id
       LEFT JOIN silo_student_grades g ON g.enrollment_id = e.id
       WHERE e.student_id    = $1
         AND e.academic_year = $2
         AND e.semester::text = $3::text
         ${subjectId ? 'AND c.id = $4' : ''}
        ORDER BY c.name`,
      subjectId
        ? [queryIdentityId, year, semester, subjectId]
        : [queryIdentityId, year, semester]
    );

    return sendSuccess(res, {
      semester,
      year,
      courses: coursesResult.rows,
      selected: subjectId ? (coursesResult.rows[0] ?? null) : null,
    });
  } catch (err: any) {
    console.error('[getGrades] Error:', err.message);
    return sendError(res, 'Failed to fetch grades.', 500, err.message);
  }
};

// ─── GET /api/student/history ─────────────────────────────────────────────────
/**
 * Query params:
 *   ?year=2024/2025     (required – academic year filter)
 *   ?semester=1|2       (optional – if omitted returns both semesters)
 *
 * The semester_average is calculated on the backend as AVG(total) for that
 * year+semester so the frontend summary header can display it directly.
 * Parent role is also allowed — controller verifies the parent-child link.
 */
export const getHistory = async (req: AuthRequest, res: Response) => {
  let queryIdentityId = req.user?.identity_id;

  // Validate authentication
  if (!queryIdentityId) {
    return sendError(res, 'User identity not found. Please log in again.', 401);
  }

  const targetStudentId = req.query.student_id as string;

  // Support Parent Viewing Child
  if (req.user?.role === 'Parent' && targetStudentId) {
    const isLinked = await verifyParentLink(req.user.user_id, targetStudentId);
    if (!isLinked) return sendError(res, 'Unauthorized access to student data.', 403);
    queryIdentityId = targetStudentId;
  }

  const year = (req.query.year as string) || '';
  const semester = req.query.semester ? Number(req.query.semester) : null;

  if (!year) {
    return sendError(res, 'Query parameter "year" is required (e.g. 2024/2025).', 400);
  }

  try {
    const params: any[] = [queryIdentityId, year];
    if (semester !== null) params.push(semester);

    const result = await pool.query(
      `SELECT
         e.academic_year AS year,
         e.semester,
         c.name          AS subject,
         COALESCE(g.total, 0) AS score
       FROM silo_enrollments e
       JOIN silo_courses c ON c.id = e.course_id
       LEFT JOIN silo_student_grades g ON g.enrollment_id = e.id
       WHERE e.student_id    = $1
         AND e.academic_year = $2
         ${semester !== null ? 'AND e.semester::text = $3::text' : ''}
       ORDER BY e.semester ASC, c.name ASC`,
      params
    );

    // Group by semester and calculate average
    const grouped: Record<string, any> = {};
    result.rows.forEach(row => {
      const key = `${row.year}__${row.semester}`;
      if (!grouped[key]) {
        grouped[key] = {
          year: row.year,
          semester: `Semester ${row.semester}`,
          courses: [],
          _totalScore: 0,
        };
      }
      const score = Number(row.score);
      grouped[key].courses.push({ name: row.subject, score });
      grouped[key]._totalScore += score;
    });

    const history = Object.values(grouped).map(h => {
      const avg = h.courses.length > 0
        ? (h._totalScore / h.courses.length).toFixed(1) + '%'
        : '0%';
      const { _totalScore, ...rest } = h;
      return { ...rest, average: avg };
    });

    return sendSuccess(res, history);
  } catch (err: any) {
    console.error('[getHistory] Error:', err.message);
    return sendError(res, 'Failed to fetch academic history.', 500, err.message);
  }
};

// ─── GET /api/student/current-courses ────────────────────────────────────────
/**
 * Backward-compatible endpoint for the existing "Grades & Courses" dropdown.
 * Returns current semester courses with legacy granular mark fields.
 */
export const getCurrentCourses = async (req: AuthRequest, res: Response) => {
  const studentIdentityId = req.user?.identity_id;

  // Validate authentication
  if (!studentIdentityId) {
    return sendError(res, 'User identity not found. Please log in again.', 401);
  }

  try {
    const result = await pool.query(
      `SELECT
         e.id          AS enrollment_id,
         c.id          AS id,
         c.name,
         c.code,
         i.full_name   AS teacher,
         e.progress,
         g.quiz_1,
         g.quiz_2,
         g.test_1,
         g.test_2,
         g.participation,
         g.mid_exam,
         g.final_exam,
         json_build_object(
           'quiz_1',       20,
           'quiz_2',       20,
           'test_1',       40,
           'test_2',       40,
           'participation',20,
           'mid_exam',     100,
           'final_exam',   100
         ) AS max_scores
       FROM silo_enrollments e
       JOIN silo_courses c ON c.id = e.course_id
       LEFT JOIN silo_identities i ON i.id = c.teacher_id
       LEFT JOIN silo_student_grades g ON g.enrollment_id = e.id
       WHERE e.student_id    = $1
         AND e.academic_year = '2025/2026'
         AND e.semester::text = '2'
       ORDER BY c.name`,
      [studentIdentityId]
    );

    return sendSuccess(res, result.rows);
  } catch (err: any) {
    console.error('[getCurrentCourses] Error:', err.message);
    return sendError(res, 'Failed to fetch current courses.', 500, err.message);
  }
};

// ─── GET /api/student/academic-history (legacy) ───────────────────────────────
/**
 * Legacy endpoint — kept for backward compat. Prefer /api/student/history.
 */
export const getAcademicHistory = async (req: AuthRequest, res: Response) => {
  const studentIdentityId = req.user?.identity_id;

  // Validate authentication
  if (!studentIdentityId) {
    return sendError(res, 'User identity not found. Please log in again.', 401);
  }

  try {
    const result = await pool.query(
      `SELECT
         e.academic_year AS year,
         e.semester,
         c.name AS subject,
         COALESCE(g.total, 0) AS score
       FROM silo_enrollments e
       JOIN silo_courses c ON c.id = e.course_id
       LEFT JOIN silo_student_grades g ON g.enrollment_id = e.id
       WHERE e.student_id = $1
       ORDER BY e.academic_year DESC, e.semester DESC, c.name ASC`,
      [studentIdentityId]
    );

    const history: any[] = [];
    result.rows.forEach(row => {
      const semLabel = `Semester ${row.semester}`;
      let yearGroup = history.find(h => h.year === row.year && h.semester === semLabel);
      if (!yearGroup) {
        yearGroup = { year: row.year, semester: semLabel, courses: [], totalScore: 0 };
        history.push(yearGroup);
      }
      yearGroup.courses.push({ name: row.subject, score: Number(row.score) });
      yearGroup.totalScore += Number(row.score);
    });

    history.forEach(h => {
      h.average = h.courses.length > 0
        ? (h.totalScore / h.courses.length).toFixed(1) + '%'
        : '0%';
      delete h.totalScore;
    });

    return sendSuccess(res, history);
  } catch (err: any) {
    return sendError(res, 'Failed to fetch academic history.', 500, err.message);
  }
};
