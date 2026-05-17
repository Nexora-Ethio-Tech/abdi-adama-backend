import { Response } from 'express';
import pool from '../../config/db';
import { AuthRequest } from '../../middleware/authMiddleware';
import { sendSuccess, sendError } from '../../shared/responseUtils';

// ─── Helper ──────────────────────────────────────────────────────────────────
/**
 * Resolve a student's section_id from their identity_id.
 * Returns the section UUID, or null if not found.
 */
const getStudentSection = async (studentIdentityId: string): Promise<string | null> => {
  const result = await pool.query<{ section_id: string }>(
    `SELECT DISTINCT section_id
       FROM silo_enrollments
      WHERE student_id = $1
        AND section_id IS NOT NULL
        AND academic_year = '2025/2026'
      LIMIT 1`,
    [studentIdentityId]
  );
  return result.rows[0]?.section_id ?? null;
};

/**
 * Resolve a school_id or UUID to a student's identity UUID.
 */
const getStudentIdentityId = async (schoolIdOrUuid: string): Promise<string | null> => {
  const result = await pool.query(
    `SELECT id FROM silo_identities WHERE school_id = $1 OR id::text = $1`,
    [schoolIdOrUuid]
  );
  return result.rows[0]?.id ?? null;
};

/**
 * Verify that a parent is linked to a specific student.
 */
const verifyParentLink = async (parentUserId: string, studentId: string): Promise<boolean> => {
  const result = await pool.query(
    'SELECT 1 FROM silo_family_links WHERE parent_user_id = $1 AND student_identity_id = $2',
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

  try {
    const result = await pool.query(
      `SELECT
         si.school_id,
         si.full_name   AS "fullName",
         ss.name        AS section,
         ss.grade
       FROM silo_identities si
       LEFT JOIN silo_enrollments se ON se.student_id = si.id
                                    AND se.academic_year = '2025/2026'
                                    AND se.semester = 2
       LEFT JOIN silo_sections ss ON ss.id = se.section_id
       WHERE si.id = $1
       LIMIT 1`,
      [identityId]
    );

    if (result.rows.length === 0) {
      return sendError(res, 'Profile not found.', 404);
    }

    return sendSuccess(res, result.rows[0]);
  } catch (err: any) {
    return sendError(res, 'Internal server error.', 500, err.message);
  }
};

// ─── GET /api/student/dashboard ───────────────────────────────────────────────
/**
 * Returns three data sources for the student dashboard:
 *  - schedule:           Today's classes (subject, time, room)
 *  - deadlines:          Upcoming assignments/tasks (NOT exam logic — read-only)
 *  - teacherOfTheMonth:  Up to 3 monthly-rewarded teachers
 */
export const getDashboard = async (req: AuthRequest, res: Response) => {
  const studentIdentityId = req.user?.identity_id;

  try {
    const sectionId = await getStudentSection(studentIdentityId!);

    // ── Today's schedule ─────────────────────────────────────────────────────
    // day_of_week: 0=Sunday … 6=Saturday, matching JavaScript / PostgreSQL EXTRACT
    const scheduleResult = await pool.query(
      `SELECT
         c.name        AS subject,
         c.code,
         i.full_name   AS teacher,
         to_char(sc.start_time, 'HH24:MI') AS start_time,
         to_char(sc.end_time,   'HH24:MI') AS end_time,
         sc.room
       FROM silo_schedule sc
       JOIN silo_courses c ON c.id = sc.course_id
       LEFT JOIN silo_identities i ON i.id = c.teacher_id
       WHERE sc.section_id = $1
         AND sc.day_of_week = EXTRACT(DOW FROM CURRENT_DATE)::int
       ORDER BY sc.start_time`,
      [sectionId]
    );

    // ── Upcoming deadlines ────────────────────────────────────────────────────
    // Excludes 'Live Exam' type — exam logic is reserved for future work
    const deadlineResult = await pool.query(
      `SELECT
         d.id,
         d.title,
         d.type,
         d.due_date,
         c.name AS subject
       FROM silo_deadlines d
       LEFT JOIN silo_courses c ON c.id = d.course_id
       WHERE d.section_id = $1
         AND d.due_date >= CURRENT_DATE
       ORDER BY d.due_date ASC
       LIMIT 10`,
      [sectionId]
    );

    // ── Teacher of the Month ──────────────────────────────────────────────────
    const teacherResult = await pool.query(
      `SELECT
         i.full_name   AS name,
         tr.award_label,
         tr.reward_month,
         tr.reward_year
       FROM silo_teacher_rewards tr
       JOIN silo_identities i ON i.id = tr.teacher_identity_id
       WHERE tr.reward_month = EXTRACT(MONTH FROM CURRENT_DATE)::int
         AND tr.reward_year  = EXTRACT(YEAR  FROM CURRENT_DATE)::int
       ORDER BY tr.created_at DESC
       LIMIT 3`
    );

    // ── Combined Announcements (General + Logistics) ───────────────────────────
    const announcementsResult = await pool.query(
      `SELECT 
         id::text, 
         priority, 
         title, 
         content, 
         timestamp,
         'Academic'::text AS category
       FROM silo_announcements
       
       UNION ALL
       
       SELECT 
         n.id::text, 
         'Normal'::text AS priority, 
         n.title, 
         n.message      AS content, 
         n.published_at AS timestamp,
         'Logistics'::text AS category
       FROM silo_logistics_notices n
       WHERE n.deleted_at IS NULL
         AND (n.expires_at IS NULL OR n.expires_at > CURRENT_TIMESTAMP)
         AND EXISTS (
           SELECT 1 
           FROM silo_route_manifest rm
           JOIN silo_routes r ON r.id = rm.route_id
           WHERE rm.student_id = $1
             AND r.driver_id = n.sender_id
         )
       ORDER BY timestamp DESC
       LIMIT 10`,
      [studentIdentityId]
    );

    // ── Additional Stats (Attendance, Rank, Courses) ─────────────────────────
    const statsResult = await pool.query(
      `SELECT
         -- Dynamic Attendance: calculate from silo_student_attendance (defaults to 100% if no records)
         COALESCE(
           (SELECT ROUND(
             COUNT(*) FILTER (WHERE sa.status = 'present') * 100.0 / NULLIF(COUNT(*), 0)
           )::text || '%'
           FROM silo_student_attendance sa WHERE sa.student_id = $1),
           '100%'
         ) AS attendance,

         -- Dynamic Rank: compute from average grade total across all enrolled courses
         COALESCE(
           (SELECT '#' || ranked.rnk::text
            FROM (
              SELECT e.student_id,
                     RANK() OVER (ORDER BY AVG(g.total) DESC) AS rnk
              FROM silo_student_grades g
              JOIN silo_enrollments e ON e.id = g.enrollment_id
              GROUP BY e.student_id
            ) ranked
            WHERE ranked.student_id = $1),
           'Pending'
         ) AS rank,

         -- Active Courses: list of enrolled course names
         (SELECT json_agg(c.name) FROM silo_enrollments e JOIN silo_courses c ON e.course_id = c.id WHERE e.student_id = $1) AS active_courses
       FROM silo_identities i
       WHERE i.id = $1`,
      [studentIdentityId]
    );

    return sendSuccess(res, {
      schedule:           scheduleResult.rows,
      deadlines:          deadlineResult.rows,
      teacherOfTheMonth:  teacherResult.rows,
      announcements:      announcementsResult.rows,
      stats:              statsResult.rows[0]
    });
  } catch (err: any) {
    return sendError(res, 'Failed to fetch dashboard.', 500, err.message);
  }
};

// ─── GET /api/student/grades ──────────────────────────────────────────────────
/**
 * Query params:
 *   ?semester=1|2          (defaults to 2)
 *   ?subject_id=<uuid>     (optional — if omitted returns summary list)
 *
 * Response includes mid_30, quiz_10, assignment_10, final_50, and computed total.
 */
export const getGrades = async (req: AuthRequest, res: Response) => {
  let studentIdentityId = req.user?.identity_id;
  const targetStudentId = req.query.student_id as string;

  // ── Support Parent Viewing Child ───────────────────────────────────────────
  if (req.user?.role === 'Parent' && targetStudentId) {
    const resolvedId = await getStudentIdentityId(targetStudentId);
    if (!resolvedId) return sendError(res, 'Student not found.', 404);
    
    const isLinked = await verifyParentLink(req.user.user_id, resolvedId);
    if (!isLinked) return sendError(res, 'Unauthorized access to student data.', 403);
    studentIdentityId = resolvedId;
  }

  const semester  = Number(req.query.semester)  || 2;
  const subjectId = req.query.subject_id as string | undefined;

  try {
    // ── Course list for this semester ─────────────────────────────────────────
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
         -- max possible per component
         10  AS max_quiz,
         10  AS max_assignment,
         30  AS max_mid,
         50  AS max_final,
         100 AS max_total,
         -- legacy granular marks (for backward compatibility)
         g.quiz_1, g.quiz_2, g.test_1, g.test_2,
         g.participation, g.mid_exam, g.final_exam
       FROM silo_enrollments e
       JOIN silo_courses c ON c.id = e.course_id
       LEFT JOIN silo_identities i ON i.id = c.teacher_id
       LEFT JOIN silo_student_grades g ON g.enrollment_id = e.id
       WHERE e.student_id    = $1
         AND e.academic_year = '2025/2026'
         AND e.semester      = $2
         ${subjectId ? 'AND c.id = $3' : ''}
       ORDER BY c.name`,
      subjectId
        ? [studentIdentityId, semester, subjectId]
        : [studentIdentityId, semester]
    );

    return sendSuccess(res, {
      semester,
      courses:  coursesResult.rows,
      // If a specific subject was requested, surface it at the top level too
      selected: subjectId ? (coursesResult.rows[0] ?? null) : null,
    });
  } catch (err: any) {
    return sendError(res, 'Failed to fetch grades.', 500, err.message);
  }
};

// ─── GET /api/student/history ─────────────────────────────────────────────────
/**
 * Query params:
 *   ?year=2024/2025     (required — academic year filter)
 *   ?semester=1|2       (optional — if omitted returns both semesters)
 *
 * The semester_average is calculated on the backend as AVG(total) for that
 * year+semester so the frontend summary header can display it directly.
 */
export const getHistory = async (req: AuthRequest, res: Response) => {
  let studentIdentityId = req.user?.identity_id;
  const targetStudentId = req.query.student_id as string;

  // ── Support Parent Viewing Child ───────────────────────────────────────────
  if (req.user?.role === 'Parent' && targetStudentId) {
    const resolvedId = await getStudentIdentityId(targetStudentId);
    if (!resolvedId) return sendError(res, 'Student not found.', 404);
    
    const isLinked = await verifyParentLink(req.user.user_id, resolvedId);
    if (!isLinked) return sendError(res, 'Unauthorized access to student data.', 403);
    studentIdentityId = resolvedId;
  }

  const year     = (req.query.year     as string) || '';
  const semester = req.query.semester  ? Number(req.query.semester) : null;

  if (!year) {
    return sendError(res, 'Query parameter "year" is required (e.g. 2024/2025).', 400);
  }

  try {
    const params: any[] = [studentIdentityId, year];
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
         ${semester !== null ? 'AND e.semester = $3' : ''}
       ORDER BY e.semester ASC, c.name ASC`,
      params
    );

    // Group by semester and calculate average
    const grouped: Record<string, any> = {};
    result.rows.forEach(row => {
      const key = `${row.year}__${row.semester}`;
      if (!grouped[key]) {
        grouped[key] = {
          year:     row.year,
          semester: `Semester ${row.semester}`,
          courses:  [],
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
         AND e.semester      = 2
       ORDER BY c.name`,
      [studentIdentityId]
    );

    return sendSuccess(res, result.rows);
  } catch (err: any) {
    return sendError(res, 'Failed to fetch current courses.', 500, err.message);
  }
};

// ─── GET /api/student/academic-history (legacy) ───────────────────────────────
/**
 * Legacy endpoint — kept for backward compat. Prefer /api/student/history.
 */
export const getAcademicHistory = async (req: AuthRequest, res: Response) => {
  const studentIdentityId = req.user?.identity_id;

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
