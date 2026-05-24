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
         CASE WHEN COUNT(sa.*) = 0 THEN 'N/A' ELSE ROUND(COUNT(sa.*) FILTER (WHERE sa.status = 'present')::numeric / COUNT(sa.*) * 100, 1)::text || '%' END AS attendance,
         COALESCE('Rank: ' || ss.academic_rank::text, 'Pending Results') AS performance,
         COALESCE(course_stats.course_count, 0) AS course_count,
         COALESCE(course_stats.courses, '[]'::json) AS courses
       FROM parent_student ps
       JOIN students s ON ps.student_id = s.id
       JOIN users u ON s.user_id = u.id
       LEFT JOIN student_attendance sa ON sa.student_id = s.id
       LEFT JOIN silo_student_stats ss ON s.id = ss.student_id
       LEFT JOIN (
         SELECT
           e.student_id,
           COUNT(*) AS course_count,
           json_agg(json_build_object('name', c.name, 'code', c.code, 'teacher', COALESCE(tu.name, 'N/A'))) AS courses
         FROM silo_enrollments e
         JOIN silo_courses c ON c.id = e.course_id
         LEFT JOIN silo_identities ti ON ti.id = c.teacher_id
         LEFT JOIN users tu ON ti.user_id = tu.id
         GROUP BY e.student_id
       ) AS course_stats ON course_stats.student_id = s.id
       WHERE ps.parent_id = $1
       GROUP BY s.id, u.name, s.grade, ss.academic_rank, course_stats.course_count, course_stats.courses
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

       UNION ALL

       SELECT
         n.id::text,
         'Normal'::text AS priority,
         n.title,
         n.content,
         n.created_at AS timestamp,
         'Logistics'::text AS category,
         u.name AS "driverName"
       FROM logistics_notices n
       LEFT JOIN users u ON u.id = n.driver_id
       WHERE n.deleted_at IS NULL
         AND n.created_at > NOW() - INTERVAL '30 days'

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
         cl.teacher_note,
         to_char(cl.week_ending, 'YYYY-MM-DD') AS week_ending_formatted,
         u.name AS teacher_name
       FROM communication_logs cl
       LEFT JOIN teachers t ON cl.teacher_id = t.id
       LEFT JOIN users u ON t.user_id = u.id
       WHERE cl.student_id = $1
         AND ${getActiveCommLogSQL()}
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
