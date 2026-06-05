import { Response } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';
import { sendSuccess, sendError } from '../shared/responseUtils';
import { performAllCleanups } from '../shared/cleanupUtils';
import teacherOfWeekService from '../services/teacherOfWeek.service';

// ─── Dynamic Academic Period (Ethiopian Calendar) ────────────────────────────
// Ethiopian New Year (Enkutatash) ≈ September 11.
// Academic year starts Meskerem (Sep 11) and the EC year label = Gregorian year − 7.
// Gregorian academic year string = "${ecYear + 7}/${ecYear + 8}"
//
// First Semester : Sep 11 – Jan 31  (EC Meskerem – Tir)
// Second Semester: Feb 1  – Jun 30  (EC Yekatit – Sene)
// Jul–Sep 10     : summer – treat as end of second semester

function getActiveSemester(): 1 | 2 {
  const now = new Date();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  if ((m === 9 && d >= 11) || m >= 10 || m === 1) return 1;
  if (m >= 2 && m <= 6) return 2;
  return 2; // Jul–Sep 10 summer
}

function getActiveAcademicYear(): string {
  const now = new Date();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const gYear = now.getFullYear();
  // After Enkutatash → EC year = gYear − 7
  const ecYear = (m > 9 || (m === 9 && d >= 11)) ? gYear - 7 : gYear - 8;
  return `${ecYear + 7}/${ecYear + 8}`;
}

const CURRENT_ACADEMIC_YEAR = getActiveAcademicYear();
const CURRENT_SEMESTER: 1 | 2 = getActiveSemester();

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns the enrolled course IDs (current semester) for a student.
 * Legacy silo path — used by getCurrentCourses only.
 */
const getEnrolledCourseIds = async (studentIdentityId: string): Promise<string[]> => {
  const result = await pool.query(
    `SELECT course_id::text FROM silo_enrollments
     WHERE student_id = $1
       AND academic_year = $2
       AND semester::text = $3::text`,
    [studentIdentityId, CURRENT_ACADEMIC_YEAR, String(CURRENT_SEMESTER)]
  );
  return result.rows.map((r: any) => r.course_id);
};

/** Build class_name values used in the Schedule Builder `schedules` table. */
const buildScheduleClassMatchers = (
  className: string | null,
  sectionName: string | null,
  grade: string | null
): string[] => {
  const patterns = new Set<string>();
  const cls = (className || '').trim();
  const sec = (sectionName || '').trim();
  const grd = (grade || '').trim();

  if (cls) {
    patterns.add(cls);
    if (sec) {
      patterns.add(`${cls}${sec}`);
      patterns.add(`${cls} ${sec}`);
      patterns.add(`${cls}-${sec}`);
    }
  }
  if (grd && sec) {
    patterns.add(`${grd}${sec}`);
    patterns.add(`Grade ${grd}${sec}`);
    patterns.add(`Grade ${grd} ${sec}`);
  }
  return [...patterns].filter(Boolean);
};

/** Weekly timetable from approved Schedule Builder entries (Mon–Fri). */
const fetchStudentWeeklySchedule = async (studentRow: {
  id: string;
  branch_id: string | null;
  class_name: string | null;
  section_name: string | null;
  grade: string | null;
}) => {
  if (!studentRow.branch_id) return [];

  const classMatchers = buildScheduleClassMatchers(
    studentRow.class_name,
    studentRow.section_name,
    studentRow.grade
  );
  if (classMatchers.length === 0) return [];

  try {
    const result = await pool.query(
      `SELECT
       s.day,
       s.time_slot,
       s.subject,
       COALESCE(u.name, 'TBA') AS teacher
     FROM schedules s
     JOIN teachers t ON s.teacher_id = t.id
     JOIN users u ON t.user_id = u.id
     WHERE t.branch_id = $1
       AND s.day IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')
       AND s.class_name = ANY($2::text[])
     ORDER BY
       CASE s.day
         WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3
         WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5
       END,
       s.time_slot`,
      [studentRow.branch_id, classMatchers]
    );

    return result.rows.map((row: any) => ({
      day: row.day,
      timeSlot: row.time_slot,
      subject: row.subject,
      teacher: row.teacher,
      room: '',
    }));
  } catch {
    return [];
  }
};

/** Attendance percentage from student_attendance records. */
const computeAttendanceRate = async (studentId: string): Promise<number | null> => {
  const result = await pool.query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status IN ('present', 'late'))::int AS attended
     FROM student_attendance
     WHERE student_id = $1`,
    [studentId]
  );
  const { total, attended } = result.rows[0] || { total: 0, attended: 0 };
  if (!total) return null;
  return Math.round((attended / total) * 1000) / 10;
};

/** First-semester course average (used on dashboard during semester 2). */
const computeFirstSemesterAverage = async (
  studentRow: {
    id: string;
    user_id: string;
    section_id: string | null;
    grade: string;
    branch_id: string | null;
  },
  year: string
): Promise<number | null> => {
  const courses = await fetchHistoricalCourses(studentRow.id, studentRow.user_id, year, 1);
  const courseIds = courses.map((c: any) => c.id);
  if (courseIds.length === 0) return null;

  let gradeRows: any[] = [];
  try {
    gradeRows = await fetchStudentGradeRows(studentRow.id, year, 1, courseIds, true);
  } catch {
    if (courseIds.length > 0) {
      const legacy = await pool.query(
        `SELECT g.course_id, g.type, g.score
         FROM grades g
         WHERE g.student_id = $1 AND g.course_id = ANY($2::uuid[]) AND g.score IS NOT NULL`,
        [studentRow.id, courseIds]
      );
      gradeRows = legacy.rows;
    }
  }

  const gradingMethods = await loadGradingMethods(studentRow.grade);
  const courseTotals: number[] = [];
  for (const course of courses) {
    const score = computeHistoricalCourseScore(course.id, gradeRows, gradingMethods);
    if (score !== null) courseTotals.push(score);
  }
  if (courseTotals.length === 0) return null;
  const avg = courseTotals.reduce((a, b) => a + b, 0) / courseTotals.length;
  return Math.round(avg * 10) / 10;
};

/** School announcements posted by super-admin or school-admin for the student's branch. */
const fetchSchoolAnnouncementsForStudent = async (branchId: string | null) => {
  const params: unknown[] = [];
  let branchFilter = '';
  if (branchId) {
    branchFilter = 'AND (n.branch_id = $1 OR n.branch_id IS NULL)';
    params.push(branchId);
  }

  const result = await pool.query(
    `SELECT
       n.id::text,
       COALESCE(n.priority, 'Normal') AS priority,
       n.title,
       n.content,
       n.created_at AS timestamp,
       'School'::text AS category
     FROM notices n
     JOIN users u ON n.posted_by = u.id
     WHERE u.role IN ('super-admin', 'school-admin')
       AND n.created_at > NOW() - INTERVAL '60 days'
       ${branchFilter}
     ORDER BY n.created_at DESC
     LIMIT 20`,
    params
  );
  return result.rows;
};

/** Logistics and driver notices for the student's assigned bus route(s). */
const fetchLogisticsAnnouncementsForStudent = async (studentId: string) => {
  const result = await pool.query(
    `SELECT
       n.id::text,
       'Normal'::text AS priority,
       n.title,
       n.content,
       n.created_at AS timestamp,
       'Logistics'::text AS category,
       n.driver_name AS "driverName"
     FROM logistics_notices n
     WHERE n.created_at > NOW() - INTERVAL '60 days'
       AND n.driver_id IN (
         SELECT r.driver_id
         FROM routes r
         JOIN student_routes rm ON r.id = rm.route_id
         WHERE rm.student_id = $1
       )
     ORDER BY n.created_at DESC
     LIMIT 20`,
    [studentId]
  );
  return result.rows;
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
       0 AS progress,
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
  try {
    const siloResult = await pool.query(
      `SELECT
         c.id,
         c.id AS subject_id,
         c.name,
         c.code,
         0 AS progress,
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
  } catch {
    return [];
  }
};

/**
 * Returns courses enrolled for a specific academic year and semester.
 * Past years never fall back to the student's current class roster.
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

  const gradeCourseResult = await pool.query(
    `SELECT DISTINCT ON (c.id)
       c.id,
       c.name,
       c.code,
       tu.name AS teacher
     FROM grades g
     JOIN courses c ON c.id = g.course_id
     LEFT JOIN teachers t ON c.teacher_id = t.id
     LEFT JOIN users tu ON t.user_id = tu.id
     WHERE g.student_id = $1
       AND g.academic_year = $2
       AND g.semester = $3
     ORDER BY c.id, c.name ASC`,
    [studentId, year, semester]
  );

  if (gradeCourseResult.rows.length > 0) {
    return gradeCourseResult.rows;
  }

  if (year === CURRENT_ACADEMIC_YEAR) {
    const studentRow = await resolveStudentRecord(studentId);
    if (!studentRow) return [];
    return fetchStudentCoursesForTerm(
      studentRow.id,
      studentRow.section_id,
      studentRow.grade,
      studentRow.branch_id
    );
  }

  return [];
};

/** Only grades the teacher has FINALIZED and locked for release to students. */
const SUBMITTED_GRADE_FILTER = `
  AND COALESCE(g.is_finalized, false) = true`;

const fetchStudentGradeRows = async (
  studentId: string,
  academicYear: string,
  semester: number,
  courseIds: string[],
  submittedOnly = true
) => {
  if (courseIds.length === 0) return [];

  const submittedClause = submittedOnly ? SUBMITTED_GRADE_FILTER : '';

  const result = await pool.query(
    `SELECT g.course_id, g.type, g.score, g.total, g.weight
     FROM grades g
     WHERE g.student_id = $1
       AND g.academic_year = $2
       AND g.semester = $3
       AND g.course_id = ANY($4::uuid[])
       AND g.score IS NOT NULL
       ${submittedClause}`,
    [studentId, academicYear, semester, courseIds]
  );
  return result.rows;
};

const loadGradingMethods = async (gradeLevel: string) => {
  const rawGrade = String(gradeLevel || '').trim();
  const caseSort = `
    ORDER BY
      CASE method_id
        WHEN 'quiz-1'         THEN 1
        WHEN 'quiz-2'         THEN 2
        WHEN 'test-1'         THEN 3
        WHEN 'mid-exam'       THEN 4
        WHEN 'mid-assignment' THEN 4
        WHEN 'assignment'     THEN 5
        WHEN 'final-exam'     THEN 10
        ELSE 6
      END ASC, created_at ASC`;

  // 1. Exact match
  let configRes = await pool.query(
    `SELECT method_id, label, max_weight
     FROM grading_configs
     WHERE grade_level = $1
     ${caseSort}`,
    [rawGrade]
  );
  let rows = configRes.rows;

  // 2. Numeric fallback (e.g. "Grade 12" -> "12")
  if (rows.length === 0) {
    const numericGrade = rawGrade.replace(/[^0-9]/g, '');
    if (numericGrade && numericGrade !== rawGrade) {
      configRes = await pool.query(
        `SELECT method_id, label, max_weight
         FROM grading_configs
         WHERE grade_level = $1
         ${caseSort}`,
        [numericGrade]
      );
      rows = configRes.rows;
    }
  }

  // 3. Default fallback
  if (rows.length === 0) {
    configRes = await pool.query(
      `SELECT method_id, label, max_weight
       FROM grading_configs
       WHERE grade_level = 'default'
       ${caseSort}`
    );
    rows = configRes.rows;
  }

  return rows.map((r: any) => ({
    id: r.method_id,
    label: r.label,
    maxWeight: r.max_weight,
  }));
};

/** Merge teacher-submitted grade rows into per-course summaries for the student UI. */
const buildCourseGradeSummaries = (
  courses: any[],
  dbGrades: any[],
  gradingMethods: Array<{ id: string; label: string; maxWeight: number }>,
  studentRow: { class_name?: string | null; section_name?: string | null; grade?: string }
) =>
  courses.map((course: any) => {
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

    const legacyMid = dbGrades.find(
      (dg: any) => dg.course_id === course.id && String(dg.type).toLowerCase().includes('mid')
    );
    const legacyFinal = dbGrades.find(
      (dg: any) => dg.course_id === course.id && String(dg.type).toLowerCase().includes('final')
    );

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
      total: submittedCount > 0 ? Math.round(calculatedTotal * 10) / 10 : null,
    };
  });

/** Final course score for academic history (submitted components only). */
const computeHistoricalCourseScore = (
  courseId: string,
  dbGrades: any[],
  gradingMethods: Array<{ id: string; label: string; maxWeight: number }>
): number | null => {
  let total = 0;
  let count = 0;

  for (const method of gradingMethods) {
    const match = dbGrades.find((g) => g.course_id === courseId && g.type === method.id);
    if (match?.score != null) {
      total += Number(match.score);
      count += 1;
    }
  }

  if (count === 0) {
    const legacyRows = dbGrades.filter((g) => g.course_id === courseId);
    if (legacyRows.length === 0) return null;
    return Math.round(legacyRows.reduce((s, g) => s + Number(g.score || 0), 0) * 10) / 10;
  }

  return Math.round(total * 10) / 10;
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
 * Student My Dashboard — welcome stats, weekly schedule, and announcements.
 */
export const getDashboard = async (req: AuthRequest, res: Response) => {
  const studentIdentityId = req.user?.identity_id;

  if (!studentIdentityId) {
    sendError(res, 'User identity not found. Please log in again.', 401);
    return;
  }

  try {
    const studentRow = await resolveStudentRecord(studentIdentityId);
    if (!studentRow) {
      sendError(res, 'Student profile not found.', 404);
      return;
    }

    const [courses, weeklySchedule, attendanceRate, schoolAnnouncements, logisticsAnnouncements] =
      await Promise.all([
        fetchStudentCoursesForTerm(
          studentRow.id,
          studentRow.section_id,
          studentRow.grade,
          studentRow.branch_id
        ),
        fetchStudentWeeklySchedule(studentRow),
        computeAttendanceRate(studentRow.id),
        fetchSchoolAnnouncementsForStudent(studentRow.branch_id),
        fetchLogisticsAnnouncementsForStudent(studentRow.id),
      ]);

    let averageGrade: number | null = null;
    let averageGradeDisplay = 'Pending';
    if (CURRENT_SEMESTER === 2) {
      averageGrade = await computeFirstSemesterAverage(studentRow, CURRENT_ACADEMIC_YEAR);
      averageGradeDisplay =
        averageGrade !== null ? `${averageGrade}%` : 'Pending';
    }

    const studentInfo = {
      id: studentRow.id,
      digitalId: (req.user as any)?.digital_id || '',
      name: studentRow.student_name || (req.user as any)?.name || 'Student',
      email: (req.user as any)?.email || '',
      grade: studentRow.grade,
      class: studentRow.section_name || studentRow.class_name || '',
      status: (req.user as any)?.status || 'Active',
    };

    return sendSuccess(res, {
      student: studentInfo,
      stats: {
        totalCourses: courses.length,
        attendanceRate,
        averageGrade,
        averageGradeDisplay,
        currentSemester: CURRENT_SEMESTER,
        academicYear: CURRENT_ACADEMIC_YEAR,
      },
      weeklySchedule,
      schoolAnnouncements,
      logisticsAnnouncements,
    });
  } catch (err: any) {
    sendError(res, 'Failed to fetch dashboard.', 500, err.message);
    return;
  }
};

// ─── GET /api/student/schedule ───────────────────────────────────────────────
/** Full Mon–Fri timetable from Schedule Builder for the logged-in student. */
export const getSchedule = async (req: AuthRequest, res: Response) => {
  const studentIdentityId = req.user?.identity_id;

  if (!studentIdentityId) {
    return sendError(res, 'User identity not found. Please log in again.', 401);
  }

  try {
    const studentRow = await resolveStudentRecord(studentIdentityId);
    if (!studentRow) {
      return sendError(res, 'Student profile not found.', 404);
    }

    const weeklySchedule = await fetchStudentWeeklySchedule(studentRow);
    return sendSuccess(res, weeklySchedule);
  } catch (err: any) {
    return sendError(res, 'Failed to fetch schedule.', 500, err.message);
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

  const userRole = (req.user?.role || '').toLowerCase();
  if (userRole === 'parent' && req.query.student_id) {
    const targetStudentId = req.query.student_id as string;
    const isLinked = await verifyParentLink(req.user?.user_id || '', targetStudentId);
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

    const gradingMethods = await loadGradingMethods(studentRow.grade);

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
      // Include not-yet-locked grades so students/parents see partial submissions immediately
      dbGrades = await fetchStudentGradeRows(
        studentRow.id,
        year,
        semester,
        courseIds,
        false
      );
    } catch (gradeErr: any) {
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

    const mergedCourses = buildCourseGradeSummaries(
      courses,
      dbGrades,
      gradingMethods,
      studentRow
    );

    return sendSuccess(res, {
      semester,
      year,
      currentSemester: CURRENT_SEMESTER,
      currentAcademicYear: CURRENT_ACADEMIC_YEAR,
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
  const userRole = (req.user?.role || '').toLowerCase();
  if (userRole === 'parent' && targetStudentId) {
    const isLinked = await verifyParentLink(req.user?.user_id || '', targetStudentId);
    if (!isLinked) return sendError(res, 'Unauthorized access to student data.', 403);
    queryIdentityId = targetStudentId;
  }

  const year = (req.query.year as string) || '';
  const semester = req.query.semester ? Number(req.query.semester) : null;

  if (!year) {
    return sendError(res, 'Query parameter "year" is required (e.g. 2024/2025).', 400);
  }
  if (!semester || (semester !== 1 && semester !== 2)) {
    return sendError(res, 'Query parameter "semester" is required (1 or 2).', 400);
  }

  try {
    const studentRow = await resolveStudentRecord(queryIdentityId);
    if (!studentRow) {
      return sendError(res, 'Student profile not found.', 404);
    }

    const gradingMethods = await loadGradingMethods(studentRow.grade);

    const courses = await fetchHistoricalCourses(
      studentRow.id,
      studentRow.user_id,
      year,
      semester
    );
    const courseIds = courses.map((c: any) => c.id);

    let gradeRows: any[] = [];
    try {
      // For history view also include incremental submissions (not only locked)
      gradeRows = await fetchStudentGradeRows(
        studentRow.id,
        year,
        semester,
        courseIds,
        false
      );
    } catch {
      if (courseIds.length > 0) {
        const legacy = await pool.query(
          `SELECT g.course_id, g.type, g.score
           FROM grades g
           WHERE g.student_id = $1
             AND g.course_id = ANY($2::uuid[])
             AND g.score IS NOT NULL`,
          [studentRow.id, courseIds]
        );
        gradeRows = legacy.rows;
      }
    }

    const historyCourses = courses.map((c: any) => {
      const finalScore = computeHistoricalCourseScore(c.id, gradeRows, gradingMethods);
      return {
        name: c.name,
        code: c.code || '',
        teacher: c.teacher || null,
        score: finalScore !== null ? finalScore.toFixed(1) : null,
        score_display: finalScore !== null ? `${finalScore.toFixed(1)}%` : 'Pending',
      };
    });

    const scoredCourses = historyCourses.filter((c) => c.score !== null);
    const semesterLabel = `Semester ${semester}`;
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
         0 AS progress,
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

// ─── Teacher of the Week (Ethiopian Sat–Wed voting window) ───────────────────

export const getTeacherOfWeek = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.user_id;
  if (!userId) {
    return sendError(res, 'User identity not found. Please log in again.', 401);
  }
  try {
    const data = await teacherOfWeekService.getStudentVoteContext(userId);
    return sendSuccess(res, data);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to load Teacher of the Week.', 500);
  }
};

export const submitTeacherOfWeekVote = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.user_id;
  const { teacherId } = req.body;
  if (!userId) {
    return sendError(res, 'User identity not found. Please log in again.', 401);
  }
  if (!teacherId) {
    return sendError(res, 'teacherId is required.', 400);
  }
  try {
    const result = await teacherOfWeekService.submitStudentVote(userId, teacherId);
    return sendSuccess(res, result, 'Vote recorded successfully');
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to submit vote.', 400);
  }
};
