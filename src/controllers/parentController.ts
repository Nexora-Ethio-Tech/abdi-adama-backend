import { Response } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';
import { sendSuccess, sendError } from '../shared/responseUtils';
import { performAllCleanups } from '../shared/cleanupUtils';
import { getActiveCommLogSQL } from '../shared/commBookUtils';

const getParentProfileId = async (userId: string): Promise<string | null> => {
  const result = await pool.query(
    `SELECT id FROM parents WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  return result.rows.length > 0 ? result.rows[0].id : null;
};

/**
 * Helper: Verify parent-child relationship
 */
const verifyParentStudentAccess = async (
  parentUserId: string,
  studentId: string
): Promise<{ authorized: boolean; parentId?: string; error?: string }> => {
  const parentId = await getParentProfileId(parentUserId);
  if (!parentId) {
    return { authorized: false, error: 'Parent account not found.' };
  }

  const checkResult = await pool.query(
    `SELECT 1 FROM parent_student WHERE parent_id = $1 AND student_id = $2`,
    [parentId, studentId]
  );

  if (checkResult.rows.length === 0) {
    return { authorized: false, error: 'Access denied: student not linked to your account.' };
  }

  return { authorized: true, parentId };
};

/**
 * GET /api/parent/dashboard
 * Returns the parent's linked children list + recent announcements.
 */
export const getParentDashboard = async (req: AuthRequest, res: Response) => {
  const parentUserId = req.user?.user_id;

  if (!parentUserId) {
    return sendError(res, 'User not found. Please log in again.', 401);
  }

  try {
    const parentId = await getParentProfileId(parentUserId);
    if (!parentId) {
      return sendError(res, 'Parent account not found.', 404);
    }

    const childrenResult = await pool.query(
      `SELECT
         s.id,
         u.name AS "fullName",
         s.grade,
         CASE 
           WHEN COUNT(sa.id) = 0 THEN 'N/A' 
           ELSE ROUND(COUNT(sa.id) FILTER (WHERE sa.status = 'present')::numeric / COUNT(sa.id) * 100, 1)::text || '%' 
         END AS attendance,
         COALESCE(
           (
             SELECT 'Avg: ' || ROUND(AVG(g.score / g.total * 100), 1)::text || '%'
             FROM grades g
             WHERE g.student_id = s.id
               AND g.is_submitted = true
           ),
           'Pending'
         ) AS performance,
         COALESCE(
           (
             SELECT COUNT(c.id)
             FROM courses c
             JOIN classes cl ON c.class_id = cl.id
             WHERE (
               (s.section_id IS NOT NULL AND cl.id = s.section_id)
               OR (
                 s.section_id IS NULL
                 AND cl.branch_id = s.branch_id
                 AND (cl.name = s.grade OR cl.name ILIKE 'Grade ' || s.grade || '%' OR cl.grade = s.grade)
               )
             )
           ),
           0
         ) AS course_count,
         '[]'::json AS courses
       FROM parent_student ps
       JOIN students s ON ps.student_id = s.id
       JOIN users u ON s.user_id = u.id
       LEFT JOIN student_attendance sa ON sa.student_id = s.id
       WHERE ps.parent_id = $1
       GROUP BY s.id, u.name, s.grade
       ORDER BY u.name ASC`,
      [parentId]
    );

    const announcementsResult = await pool.query(
      `SELECT
         n.id::text,
         COALESCE(n.priority, 'Normal') AS priority,
         n.title,
         n.content,
         n.created_at AS timestamp,
         'School'::text AS category,
         NULL::text AS "driverName"
       FROM notices n
       WHERE n.created_at > NOW() - INTERVAL '30 days'
         AND (n.audience = 'all' OR n.audience = 'parent-student' OR n.audience LIKE '%parent%')
         AND (n.branch_id IN (
           SELECT DISTINCT s2.branch_id
           FROM students s2
           JOIN parent_student ps2 ON s2.id = ps2.student_id
           WHERE ps2.parent_id = $1
         ) OR n.branch_id IS NULL)

       UNION ALL

       SELECT
         n.id::text,
         'Normal'::text AS priority,
         n.title,
         n.content,
         n.created_at AS timestamp,
         'Logistics'::text AS category,
         n.driver_name AS "driverName"
       FROM logistics_notices n
       WHERE n.created_at > NOW() - INTERVAL '30 days'

       UNION ALL

       SELECT
         m.id::text,
         'High'::text AS priority,
         'Clinic: ' || su.name AS title,
         m.text AS content,
         m.created_at AS timestamp,
         'Clinic'::text AS category,
         NULL::text AS "driverName"
       FROM clinic_chat_messages m
       JOIN students s ON s.id = m.student_id
       JOIN users su ON s.user_id = su.id
       WHERE m.sender_role = 'clinic'
         AND m.student_id IN (
           SELECT student_id FROM parent_student WHERE parent_id = $1
         )
         AND m.created_at > NOW() - INTERVAL '7 days'

       ORDER BY timestamp DESC
       LIMIT 15`,
      [parentId]
    );

    return sendSuccess(res, {
      children: childrenResult.rows,
      announcements: announcementsResult.rows,
    });
  } catch (err: any) {
    console.error('[parentController] getParentDashboard error:', err.message || err);
    return sendError(res, 'Failed to load parent dashboard.', 500, err.message);
  }
};

/**
 * GET /api/parent/child/:studentId/communication
 * Returns the current week's communication book log for a specific child.
 * Implements Thursday cleanup: Removes old logs and only returns the current week's update.
 */
export const getChildCommunicationLogs = async (req: AuthRequest, res: Response) => {
  const { studentId } = req.params;
  const parentUserId = req.user?.user_id;

  if (!parentUserId) {
    return sendError(res, 'User not found. Please log in again.', 401);
  }

  try {
    const parentId = await getParentProfileId(parentUserId);
    if (!parentId) {
      return sendError(res, 'Parent account not found.', 404);
    }

    const checkResult = await pool.query(
      `SELECT 1 FROM parent_student WHERE parent_id = $1 AND student_id = $2`,
      [parentId, studentId]
    );
    if (checkResult.rows.length === 0) {
      return sendError(res, 'Access denied: student not linked to your account.', 403);
    }

    await performAllCleanups();

    const result = await pool.query(
      `SELECT
         cl.id,
         cl.week_ending,
         cl.rating_uniform,
         cl.rating_materials,
         cl.rating_homework,
         cl.rating_participation,
         cl.rating_conduct,
         cl.rating_social,
         cl.rating_punctuality,
         cl.rating_note_taking,
         cl.rating_excellent,
         cl.teacher_note,
         to_char(cl.week_ending, 'YYYY-MM-DD') AS week_ending_formatted,
         u.name AS teacher_name
       FROM communication_logs cl
       LEFT JOIN teachers t ON cl.teacher_id = t.id
       LEFT JOIN users u ON t.user_id = u.id
       WHERE cl.student_id = $1
         AND cl.week_ending >= (
           -- Start of current cycle: most recent Friday
           CURRENT_DATE - (((EXTRACT(ISODOW FROM CURRENT_DATE)::int + 2) % 7))::int * INTERVAL '1 day'
         )
       ORDER BY cl.week_ending DESC
       LIMIT 1`,
      [studentId]
    );

    return sendSuccess(res, result.rows);
  } catch (err: any) {
    console.error('[parentController] getChildCommunicationLogs error:', err.message || err);
    return sendError(res, 'Failed to fetch communication logs.', 500, err.message);
  }
};

/**
 * GET /api/parent/child/:studentId/teachers
 * Returns the list of teachers assigned to a student's courses
 */
export const getChildTeachers = async (req: AuthRequest, res: Response) => {
  const { studentId } = req.params;
  const parentUserId = req.user?.user_id;

  if (!parentUserId) {
    return sendError(res, 'User not found. Please log in again.', 401);
  }

  try {
    const access = await verifyParentStudentAccess(parentUserId, studentId);
    if (!access.authorized) {
      return sendError(res, access.error || 'Access denied', 403);
    }

    // Get teachers assigned to the courses of this student's section or grade
    const result = await pool.query(
      `SELECT
         t.id::text,
         u.name,
         u.email,
         ARRAY_AGG(DISTINCT c.name) AS courses,
         ARRAY_AGG(DISTINCT c.code) AS course_codes
       FROM students st
       JOIN classes cl ON (
         (st.section_id IS NOT NULL AND cl.id = st.section_id)
         OR (
           st.section_id IS NULL
           AND cl.branch_id = st.branch_id
           AND (cl.name = st.grade OR cl.name ILIKE 'Grade ' || st.grade || '%' OR cl.grade = st.grade)
         )
       )
       JOIN courses c ON c.class_id = cl.id
       JOIN teachers t ON c.teacher_id = t.id
       JOIN users u ON t.user_id = u.id
       WHERE st.id = $1
       GROUP BY t.id, u.name, u.email
       ORDER BY u.name ASC`,
      [studentId]
    );

    return sendSuccess(res, result.rows);
  } catch (err: any) {
    console.error('[parentController] getChildTeachers error:', err.message || err);
    return sendError(res, 'Failed to fetch teachers.', 500, err.message);
  }
};

/**
 * GET /api/parent/child/:studentId/attendance
 * Returns attendance records for a student
 */
export const getChildAttendance = async (req: AuthRequest, res: Response) => {
  const { studentId } = req.params;
  const parentUserId = req.user?.user_id;
  const { month, year } = req.query;

  if (!parentUserId) {
    return sendError(res, 'User not found. Please log in again.', 401);
  }

  try {
    const access = await verifyParentStudentAccess(parentUserId, studentId);
    if (!access.authorized) {
      return sendError(res, access.error || 'Access denied', 403);
    }

    // Build date filter
    let dateFilter = '';
    const params: any[] = [studentId];

    if (month && year) {
      dateFilter = `
        AND EXTRACT(MONTH FROM sa.date) = $2
        AND EXTRACT(YEAR FROM sa.date) = $3
      `;
      params.push(parseInt(month as string), parseInt(year as string));
    }

    const result = await pool.query(
      `SELECT
         sa.id,
         sa.date,
         sa.status,
         sa.recorded_by,
         u.name AS recorded_by_name
       FROM student_attendance sa
       LEFT JOIN users u ON sa.recorded_by = u.id
       WHERE sa.student_id = $1
         ${dateFilter}
       ORDER BY sa.date DESC`,
      params
    );

    // Calculate attendance percentage
    const statsResult = await pool.query(
      `SELECT
         COUNT(*) AS total_days,
         COUNT(*) FILTER (WHERE status = 'present') AS present_days,
         COUNT(*) FILTER (WHERE status = 'absent') AS absent_days,
         COUNT(*) FILTER (WHERE status = 'late') AS late_days,
         COUNT(*) FILTER (WHERE status = 'excused') AS excused_days,
         ROUND(
           COUNT(*) FILTER (WHERE status = 'present')::numeric / COUNT(*) * 100,
           2
         ) AS attendance_percentage
       FROM student_attendance
       WHERE student_id = $1
         ${dateFilter}`,
      params
    );

    const statsRow = statsResult.rows[0] || {};
    const totalDays = Number(statsRow.total_days || 0);
    const presentDays = Number(statsRow.present_days || 0);
    const absentDays = Number(statsRow.absent_days || 0);
    const lateDays = Number(statsRow.late_days || 0);
    const excusedDays = Number(statsRow.excused_days || 0);
    const attendancePercentage = totalDays > 0
      ? Math.round((presentDays / totalDays) * 1000) / 10
      : 0;

    return sendSuccess(res, {
      records: result.rows,
      statistics: {
        total_days: totalDays,
        present_days: presentDays,
        absent_days: absentDays,
        late_days: lateDays,
        excused_days: excusedDays,
        attendance_percentage: attendancePercentage,
      },
    });
  } catch (err: any) {
    console.error('[parentController] getChildAttendance error:', err.message || err);
    return sendError(res, 'Failed to fetch attendance.', 500, err.message);
  }
};

/**
 * GET /api/parent/child/:studentId/academic-history
 * Returns academic history and transcripts for a student
 */
export const getChildAcademicHistory = async (req: AuthRequest, res: Response) => {
  const { studentId } = req.params;
  const parentUserId = req.user?.user_id;

  if (!parentUserId) {
    return sendError(res, 'User not found. Please log in again.', 401);
  }

  try {
    const access = await verifyParentStudentAccess(parentUserId, studentId);
    if (!access.authorized) {
      return sendError(res, access.error || 'Access denied', 403);
    }

    let result = await pool.query(
      `SELECT
         ah.id,
         ah.year,
         ah.semester,
         ah.grade_level,
         ah.average,
         ah.rank,
         ah.gpa,
         ah.created_at,
         json_agg(json_build_object(
           'course_name', ahc.course_name,
           'grade', ahc.grade,
           'score', ahc.score
         )) AS courses
       FROM academic_history ah
       LEFT JOIN academic_history_courses ahc ON ah.id = ahc.history_id
       WHERE ah.student_id = $1
       GROUP BY ah.id, ah.year, ah.semester, ah.grade_level, ah.average, ah.rank, ah.gpa, ah.created_at
       ORDER BY ah.year DESC, ah.semester DESC`,
      [studentId]
    );

    if (result.rows.length === 0) {
      // Fallback: build historical summaries from live grades table if academic_history table is empty
      result = await pool.query(
        `WITH course_scores AS (
           SELECT
             g.student_id,
             g.academic_year AS year,
             g.semester,
             g.course_id,
             c.name AS course_name,
             s.grade AS grade_level,
             ROUND(AVG(g.score / g.total * 100), 2) AS course_score
           FROM grades g
           JOIN students s ON g.student_id = s.id
           JOIN courses c ON g.course_id = c.id
           WHERE g.is_submitted = true
           GROUP BY g.student_id, g.academic_year, g.semester, g.course_id, c.name, s.grade
         )
         SELECT
           NULL AS id,
           year,
           semester::text,
           grade_level,
           ROUND(AVG(course_score), 2)::text AS average,
           'N/A'::text AS rank,
           NULL::text AS gpa,
           NOW() AS created_at,
           json_agg(json_build_object(
             'course_name', course_name,
             'grade', 
               CASE 
                 WHEN course_score >= 90 THEN 'A'
                 WHEN course_score >= 80 THEN 'B'
                 WHEN course_score >= 70 THEN 'C'
                 WHEN course_score >= 60 THEN 'D'
                 ELSE 'F'
               END,
             'score', course_score
           )) AS courses
         FROM course_scores
         WHERE student_id = $1
         GROUP BY year, semester, grade_level
         ORDER BY year DESC, semester DESC`,
        [studentId]
      );
    }

    return sendSuccess(res, result.rows);
  } catch (err: any) {
    console.error('[parentController] getChildAcademicHistory error:', err.message || err);
    return sendError(res, 'Failed to fetch academic history.', 500, err.message);
  }
};

/**
 * GET /api/parent/child/:studentId/clinic-updates
 * Returns health records and clinic visits for a student
 */
export const getChildClinicUpdates = async (req: AuthRequest, res: Response) => {
  const { studentId } = req.params;
  const parentUserId = req.user?.user_id;

  if (!parentUserId) {
    return sendError(res, 'User not found. Please log in again.', 401);
  }

  try {
    const access = await verifyParentStudentAccess(parentUserId, studentId);
    if (!access.authorized) {
      return sendError(res, access.error || 'Access denied', 403);
    }

    // Get clinic visits
    const visitsResult = await pool.query(
      `SELECT
         cv.id,
         cv.date,
         cv.time,
         cv.reason,
         cv.treatment,
         cv.status,
         cv.parent_notified,
         cv.created_at,
         u.name AS logged_by_name
       FROM clinic_visits cv
       LEFT JOIN users u ON cv.logged_by = u.id
       WHERE cv.student_id = $1
       ORDER BY cv.date DESC
       LIMIT 20`,
      [studentId]
    );

    // Get health profile from students table
    const healthResult = await pool.query(
      `SELECT
         blood_group,
         allergies,
         medications,
         chronic_conditions,
         vaccination_status,
         home_medications,
         dob,
         gender
       FROM students
       WHERE id = $1`,
      [studentId]
    );

    return sendSuccess(res, {
      visits: visitsResult.rows,
      health_profile: healthResult.rows[0] || {},
    });
  } catch (err: any) {
    console.error('[parentController] getChildClinicUpdates error:', err.message || err);
    return sendError(res, 'Failed to fetch clinic updates.', 500, err.message);
  }
};

/**
 * GET /api/parent/driver-updates
 * Returns driver notifications and logistics updates for parent's student(s)
 */
export const getDriverUpdates = async (req: AuthRequest, res: Response) => {
  const parentUserId = req.user?.user_id;

  if (!parentUserId) {
    return sendError(res, 'User not found. Please log in again.', 401);
  }

  try {
    const parentId = await getParentProfileId(parentUserId);
    if (!parentId) {
      return sendError(res, 'Parent account not found.', 404);
    }

    // Get driver updates for students assigned to routes that parent's children use.
    // logistics_notices stores the posting user in driver_id.
    const result = await pool.query(
      `SELECT DISTINCT
         ln.id,
         ln.title,
         ln.content,
         ln.stations,
         ln.driver_name,
         ln.created_at,
         u.name AS driver_contact_name,
         u.email AS driver_email
       FROM logistics_notices ln
       LEFT JOIN users u ON ln.driver_id = u.id
       WHERE ln.driver_id IN (
         SELECT DISTINCT r.driver_id
         FROM routes r
         JOIN student_routes sr ON r.id = sr.route_id
         JOIN parent_student ps ON sr.student_id = ps.student_id
         WHERE ps.parent_id = $1
       )
       ORDER BY ln.created_at DESC
       LIMIT 25`,
      [parentId]
    );

    return sendSuccess(res, result.rows);
  } catch (err: any) {
    console.error('[parentController] getDriverUpdates error:', err.message || err);
    return sendError(res, 'Failed to fetch driver updates.', 500, err.message);
  }
};

/**
 * GET /api/parent/school-announcements
 * Returns school admin announcements and notices
 */
export const getSchoolAnnouncements = async (req: AuthRequest, res: Response) => {
  const parentUserId = req.user?.user_id;

  if (!parentUserId) {
    return sendError(res, 'User not found. Please log in again.', 401);
  }

  try {
    const parentId = await getParentProfileId(parentUserId);
    if (!parentId) {
      return sendError(res, 'Parent account not found.', 404);
    }

    // Get announcements filtered by parent's children's branches
    const announcementsQuery = `SELECT
         n.id::text,
         n.title,
         n.content,
         n.priority,
         n.created_at AS timestamp,
         u.name AS created_by_name
       FROM notices n
       LEFT JOIN users u ON n.posted_by = u.id
       WHERE n.created_at > NOW() - INTERVAL '60 days'
         AND (n.audience = 'all' OR n.audience = 'parent-student' OR n.audience LIKE '%parent%')
         AND (n.branch_id IN (
           SELECT DISTINCT s2.branch_id
           FROM students s2
           JOIN parent_student ps2 ON s2.id = ps2.student_id
           WHERE ps2.parent_id = $1
         ) OR n.branch_id IS NULL)
       ORDER BY n.created_at DESC
       LIMIT 20`;

    const result = await pool.query(announcementsQuery, [parentId]);

    return sendSuccess(res, result.rows);
  } catch (err: any) {
    console.error('[parentController] getSchoolAnnouncements error:', err.message || err);
    return sendError(res, 'Failed to fetch announcements.', 500, err.message);
  }
};

/**
 * GET /api/parent/finance-summary
 * Returns financial information (fees, payments, etc.)
 */
export const getFinanceSummary = async (req: AuthRequest, res: Response) => {
  const parentUserId = req.user?.user_id;

  if (!parentUserId) {
    return sendError(res, 'User not found. Please log in again.', 401);
  }

  try {
    const parentId = await getParentProfileId(parentUserId);
    if (!parentId) {
      return sendError(res, 'Parent account not found.', 404);
    }

    // Get financial summary for all parent's children
    const result = await pool.query(
      `SELECT
         s.id AS student_id,
         u.name AS student_name,
         COALESCE(s.monthly_fee, 0) AS monthly_fee,
         COALESCE(s.bus_fee, 0) AS bus_fee,
         COALESCE(s.penalty_fee, 0) AS penalty_fee,
         s.fee_status,
         s.fee_approval_status,
         s.fee_notes,
         COALESCE(SUM(ft.amount), 0) AS total_transactions,
         (COALESCE(s.monthly_fee, 0) + COALESCE(s.bus_fee, 0) + COALESCE(s.penalty_fee, 0)) AS total_fees,
         ((COALESCE(s.monthly_fee, 0) + COALESCE(s.bus_fee, 0) + COALESCE(s.penalty_fee, 0)) - COALESCE(SUM(ft.amount), 0)) AS balance_due
       FROM parent_student ps
       JOIN students s ON ps.student_id = s.id
       JOIN users u ON s.user_id = u.id
       LEFT JOIN finance_transactions ft ON ft.student_id = s.id
       WHERE ps.parent_id = $1
       GROUP BY s.id, u.name, s.monthly_fee, s.bus_fee, s.penalty_fee, s.fee_status, s.fee_approval_status, s.fee_notes
       ORDER BY u.name ASC`,
      [parentId]
    );

    return sendSuccess(res, result.rows);
  } catch (err: any) {
    if (err.code === '42P01' || /finance_transactions/.test(err.message || '')) {
      console.warn('[parentController] getFinanceSummary missing finance_transactions table:', err.message || err);
      return sendSuccess(res, []);
    }
    console.error('[parentController] getFinanceSummary error:', err.message || err);
    return sendError(res, 'Failed to fetch financial summary.', 500, err.message);
  }
};

