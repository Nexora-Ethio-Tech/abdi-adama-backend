import { Response } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';
import { sendSuccess, sendError } from '../shared/responseUtils';

/**
 * GET /api/parent/dashboard
 * Returns the parent's linked children list + recent announcements.
 */
export const getParentDashboard = async (req: AuthRequest, res: Response) => {
  const parentUserId = req.user?.user_id;

  try {
    // 1. Get all children linked to this parent with real stats
    const childrenResult = await pool.query(
      `SELECT
         i.id          AS identity_id,
         i.school_id,
         i.full_name   AS "fullName",
         i.grade,
         (SELECT ROUND(COUNT(*) FILTER (WHERE status = 'Present')::numeric / NULLIF(COUNT(*), 0) * 100, 1)::text || '%' 
          FROM silo_attendance WHERE student_id = i.id) AS attendance,
         CASE 
           WHEN s.academic_rank IS NOT NULL THEN 'Rank: ' || s.academic_rank::text
           ELSE 'Pending Results'
         END AS performance,
         (SELECT COUNT(*) FROM silo_enrollments WHERE student_id = i.id) AS course_count,
         (SELECT json_agg(c.name) FROM silo_enrollments e JOIN silo_courses c ON e.course_id = c.id WHERE e.student_id = i.id) AS courses
       FROM silo_family_links fl
       JOIN silo_identities i ON fl.student_identity_id = i.id
       LEFT JOIN silo_student_stats s ON i.id = s.student_id
       WHERE fl.parent_user_id = $1
       ORDER BY i.full_name ASC`,
      [parentUserId]
    );

    // 2. Get combined announcements (General + Logistics + Recent Clinic Messages)
    const announcementsResult = await pool.query(
      `SELECT
         id::text,
         COALESCE(priority, 'Normal')  AS priority,
         COALESCE(title, 'Notice')     AS title,
         content,
         timestamp,
         'General'::text               AS category,
         NULL::text                    AS "driverName"
       FROM silo_announcements

       UNION ALL

       SELECT
         n.id::text,
         'Normal'::text                AS priority,
         COALESCE(n.title, 'Logistics Update') AS title,
         n.message                     AS content,
         n.published_at                AS timestamp,
         'Logistics'::text             AS category,
         i.full_name                   AS "driverName"
       FROM silo_logistics_notices n
       LEFT JOIN silo_identities i ON i.id = n.sender_id
       WHERE n.deleted_at IS NULL
         AND (n.expires_at IS NULL OR n.expires_at > CURRENT_TIMESTAMP)
         AND n.branch_id = (SELECT branch_id FROM silo_identities WHERE id = (SELECT identity_id FROM silo_users WHERE id = $1))
         AND (
           -- Only see notices from drivers assigned to at least one of this parent's children
           n.sender_id IN (
             SELECT r.driver_id 
             FROM silo_routes r
             JOIN silo_route_manifest rm ON r.id = rm.route_id
             JOIN silo_family_links fl ON fl.student_identity_id = rm.student_id
             WHERE fl.parent_user_id = $1
           )
         )

       UNION ALL

       SELECT
         m.id::text,
         'High'::text                  AS priority,
         'Clinic: ' || i.full_name     AS title,
         m.message                     AS content,
         m.created_at                  AS timestamp,
         'Clinic'::text                AS category,
         m.child_id::text              AS "targetId"
       FROM silo_clinic_messages m
       JOIN silo_identities i ON i.id = m.child_id
       WHERE m.receiver_id = $1
         AND m.created_at > NOW() - INTERVAL '5 days'

       ORDER BY timestamp DESC
       LIMIT 15`,
      [parentUserId]
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

import { performAllCleanups } from '../shared/cleanupUtils';
import { getActiveCommLogSQL } from '../shared/commBookUtils';

/**
 * GET /api/parent/child/:studentId/communication
 * Returns the current week's communication book log for a specific child.
 * Implements Thursday cleanup: Removes old logs and only returns the current week's update.
 */
export const getChildCommunicationLogs = async (req: AuthRequest, res: Response) => {
  const { studentId } = req.params;
  const parentUserId = req.user?.user_id;

  try {
    // Security: Check if child is linked to parent
    const checkResult = await pool.query(
      'SELECT 1 FROM silo_family_links WHERE parent_user_id = $1 AND student_identity_id = $2',
      [parentUserId, studentId]
    );
    if (checkResult.rows.length === 0) {
      return sendError(res, 'Access denied: student not linked to your account.', 403);
    }

    // 1. Automated Cleanup (Logistics + Communication Book)
    await performAllCleanups();

    // 2. Fetch the most recent active log for this child
    const result = await pool.query(
      `SELECT l.*, i.full_name as sender_name 
       FROM silo_communication_logs l
       JOIN silo_identities i ON i.id = l.sender_id
       WHERE l.student_id = $1
         AND ${getActiveCommLogSQL()}
       ORDER BY l.week_ending DESC
       LIMIT 1`,
      [studentId]
    );
    
    return sendSuccess(res, result.rows);
  } catch (err: any) {
    console.error('[parentController] getChildCommunicationLogs error:', err.message || err);
    return sendError(res, 'Failed to fetch communication logs.', 500, err.message);
  }
};
