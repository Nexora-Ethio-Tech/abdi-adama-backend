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
 * Resolve a student row from either students.id or users.id (identity_id).
 */
const resolveStudentRecord = async (identityOrStudentId: string) => {
  const result = await pool.query(
    `SELECT s.id, s.user_id, s.grade, s.section_id, s.branch_id,
            u.name AS student_name,
            cl.name AS class_name,
            cl.section AS section_name
     FROM students s
     JOIN users u ON s.user_id = u.id
     LEFT JOIN classes cl ON s.section_id = cl.id
     WHERE s.id::text = $1 OR s.user_id::text = $1
     LIMIT 1`,
    [identityOrStudentId]
  );
  return result.rows[0] || null;
};

/**
 * Returns courses assigned to the student's class/section with teacher info.
 */
const fetchStudentCoursesForTerm = async (
  studentId: string,
  _sectionId: string | null,
  _grade: string,
  _branchId: string | null,
  subjectId?: string
) => {
  let subjectFilter = '';
  if (subjectId) {
    subjectFilter = 'AND c.id = $2';
  }

  const result = await pool.query(
    `SELECT DISTINCT ON (c.id)
       c.id,
       c.id AS subject_id,
       c.name,
       c.code,
       c.progress,
       tu.name AS teacher,
       cl.id AS class_id,
       cl.name AS class_name,
       cl.section AS section_name
     FROM students s
     JOIN classes cl ON (
       (s.section_id IS NOT NULL AND cl.id = s.section_id)
       OR (
         s.section_id IS NULL
         AND s.branch_id IS NOT DISTINCT FROM cl.branch_id
         AND (cl.name = s.grade OR cl.name ILIKE 'Grade ' || s.grade || '%' OR cl.grade = s.grade)
       )
     )
     JOIN courses c ON c.class_id = cl.id
     LEFT JOIN teachers t ON c.teacher_id = t.id
     LEFT JOIN users tu ON t.user_id = tu.id
     WHERE s.id = $1
       ${subjectFilter}
     ORDER BY c.id, c.name ASC`,
    subjectId ? [studentId, subjectId] : [studentId]
  );

  if (result.rows.length > 0) {
    return result.rows;
  }

  // Fallback: legacy silo enrollments (identity may be silo id in older datasets)
  const siloResult = await pool.query(
    `SELECT
       c.id,
       c.id AS subject_id,
       c.name,
       c.code,
       e.progress,
       i.full_name AS teacher,
       NULL AS class_id,
       NULL AS class_name,
       NULL AS section_name
     FROM silo_enrollments e
     JOIN silo_courses c ON c.id = e.course_id
     LEFT JOIN silo_identities i ON i.id = c.teacher_id
     WHERE e.student_id::text = $1::text
       ${subjectId ? 'AND c.id = $2' : ''}
     ORDER BY c.name ASC`,
    subjectId ? [studentId, subjectId] : [studentId]
  );
  return siloResult.rows;
};

/**
 * Returns courses enrolled for a specific academic year and semester.
 */
const fetchHistoricalCourses = async (
  studentId: string,
  userId: string,
  year: string,
  semester: number
) => {
  const siloResult = await pool.query(
    `SELECT
       c.id,
       c.name,
       c.code,
       i.full_name AS teacher
     FROM silo_enrollments e
     JOIN silo_courses c ON c.id = e.course_id
     LEFT JOIN silo_identities i ON i.id = c.teacher_id
     WHERE (e.student_id::text = $1 OR e.student_id::text = $2)
       AND e.academic_year = $3
       AND e.semester::text = $4::text
     ORDER BY c.name ASC`,
    [studentId, userId, year, semester]
  );

  if (siloResult.rows.length > 0) {
    return siloResult.rows;
  }

  const studentRow = await resolveStudentRecord(studentId);
  if (!studentRow) return [];

  return fetchStudentCoursesForTerm(
    studentRow.id,
    studentRow.section_id,
    studentRow.grade,
    studentRow.branch_id
  );
};

const fetchStudentGradeRows = async (
  studentId: string,
  academicYear: string,
  semester: number,
  courseIds: string[]
) => {
  if (courseIds.length === 0) return [];

  const result = await pool.query(
    `SELECT g.course_id, g.type, g.score, g.total, g.weight
     FROM grades g
     WHERE g.student_id = $1
       AND g.academic_year = $2
       AND g.semester = $3
       AND g.course_id = ANY($4::uuid[])
       AND g.score IS NOT NULL`,
    [studentId, academicYear, semester, courseIds]
  );
  return result.rows;
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

  if (!queryIdentityId) {
    return sendError(res, 'User identity not found. Please log in again.', 401);
  }

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
    const studentRow = await resolveStudentRecord(queryIdentityId);
    if (!studentRow) {
      return sendError(res, 'Student profile not found.', 404);
    }

    const gradeLevel = String(studentRow.grade || '').replace(/\D/g, '') || 'default';

    let configRes = await pool.query(
      `SELECT method_id, label, max_weight
       FROM grading_configs
       WHERE grade_level = $1
       ORDER BY created_at ASC`,
      [gradeLevel]
    );
    if (configRes.rows.length === 0) {
      configRes = await pool.query(
        `SELECT method_id, label, max_weight
         FROM grading_configs
         WHERE grade_level = 'default'
         ORDER BY created_at ASC`
      );
    }
    const gradingMethods = configRes.rows.map((r: any) => ({
      id: r.method_id,
      label: r.label,
      maxWeight: r.max_weight,
    }));

    const courses = await fetchStudentCoursesForTerm(
      studentRow.id,
      studentRow.section_id,
      studentRow.grade,
      studentRow.branch_id,
      subjectId
    );

    const courseIds = courses.map((c: any) => c.id);
    let dbGrades: any[] = [];
    try {
      dbGrades = await fetchStudentGradeRows(studentRow.id, year, semester, courseIds);
    } catch (gradeErr: any) {
      // Backward compatibility if semester columns are not migrated yet
      if (courseIds.length > 0) {
        const legacy = await pool.query(
          `SELECT g.course_id, g.type, g.score, g.total, g.weight
           FROM grades g
           WHERE g.student_id = $1
             AND g.course_id = ANY($2::uuid[])
             AND g.score IS NOT NULL`,
          [studentRow.id, courseIds]
        );
        dbGrades = legacy.rows;
      }
    }

    const mergedCourses = courses.map((course: any) => {
      const courseGrades: Record<string, number | null> = {};
      let calculatedTotal = 0;
      let submittedCount = 0;

      for (const method of gradingMethods) {
        const match = dbGrades.find(
          (dg: any) => dg.course_id === course.id && dg.type === method.id
        );
        if (match && match.score !== null && match.score !== undefined) {
          const score = Number(match.score);
          courseGrades[method.id] = score;
          calculatedTotal += score;
          submittedCount += 1;
        } else {
          courseGrades[method.id] = null;
        }
      }

      const legacyMid = dbGrades.find((dg: any) => dg.course_id === course.id && String(dg.type).toLowerCase().includes('mid'));
      const legacyFinal = dbGrades.find((dg: any) => dg.course_id === course.id && String(dg.type).toLowerCase().includes('final'));

      return {
        id: course.id,
        subject_id: course.subject_id || course.id,
        name: course.name,
        code: course.code,
        teacher: course.teacher || 'N/A',
        progress: course.progress ?? 0,
        class_name: course.class_name || studentRow.class_name || studentRow.grade,
        section_name: course.section_name || studentRow.section_name || null,
        grades: courseGrades,
        quiz_10: courseGrades.quiz ?? courseGrades.quiz_1 ?? null,
        assignment_10: courseGrades.test ?? courseGrades.assignment ?? null,
        mid_30: courseGrades.mid ?? (legacyMid ? Number(legacyMid.score) : null),
        final_50: courseGrades.final ?? (legacyFinal ? Number(legacyFinal.score) : null),
        total: submittedCount > 0 ? calculatedTotal : null,
      };
    });

    return sendSuccess(res, {
      semester,
      year,
      student: {
        id: studentRow.id,
        name: studentRow.student_name,
        grade: studentRow.grade,
        class_name: studentRow.class_name,
        section_name: studentRow.section_name,
      },
      gradingMethods,
      courses: mergedCourses,
      selected: subjectId ? (mergedCourses[0] ?? null) : null,
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
    const studentRow = await resolveStudentRecord(queryIdentityId);
    if (!studentRow) {
      return sendError(res, 'Student profile not found.', 404);
    }

    const courses = await fetchHistoricalCourses(
      studentRow.id,
      studentRow.user_id,
      year,
      semester ?? 2
    );
    const courseIds = courses.map((c: any) => c.id);

    let gradeRows: any[] = [];
    const semValue = semester ?? 2;
    try {
      gradeRows = await fetchStudentGradeRows(studentRow.id, year, semValue, courseIds);
    } catch {
      const legacy = await pool.query(
        `SELECT g.course_id, g.type, g.score
         FROM grades g
         WHERE g.student_id = $1 AND g.course_id = ANY($2::uuid[]) AND g.score IS NOT NULL`,
        [studentRow.id, courseIds]
      );
      gradeRows = legacy.rows;
    }

    const courseTotals = new Map<string, number>();
    for (const course of courses) {
      const rowsForCourse = gradeRows.filter((g: any) => g.course_id === course.id);
      if (rowsForCourse.length === 0) continue;
      const total = rowsForCourse.reduce((sum: number, g: any) => sum + Number(g.score || 0), 0);
      courseTotals.set(course.id, total);
    }

    const historyCourses = courses.map((c: any) => {
      const total = courseTotals.get(c.id);
      return {
        name: c.name,
        code: c.code || '',
        teacher: c.teacher || null,
        score: total !== undefined ? total.toFixed(1) : null,
        score_display: total !== undefined ? `${total.toFixed(1)}%` : 'Pending',
      };
    });

    const scoredCourses = historyCourses.filter(c => c.score !== null);
    const semesterLabel = semester !== null ? `Semester ${semester}` : 'All Semesters';
    const avg = scoredCourses.length > 0
      ? (scoredCourses.reduce((sum, c) => sum + parseFloat(String(c.score)), 0) / scoredCourses.length).toFixed(1) + '%'
      : 'N/A';

    const history = [{
      year,
      semester: semesterLabel,
      courses: historyCourses,
      average: avg,
      semester_average: avg,
    }];

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
