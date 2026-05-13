import { Response } from 'express';
import pool from '../../config/db';
import { AuthRequest } from '../../middleware/authMiddleware';
import { sendSuccess, sendError } from '../../shared/responseUtils';

/**
 * GET /api/parent/dashboard
 * Returns the parent's linked children list + recent announcements.
 */
export const getParentDashboard = async (req: AuthRequest, res: Response) => {
  const parentUserId = req.user?.user_id;

  try {
    // 1. Get all children linked to this parent
    const childrenResult = await pool.query(
      `SELECT
         i.id          AS identity_id,
         i.school_id,
         i.full_name   AS "fullName",
         i.grade
       FROM silo_family_links fl
       JOIN silo_identities i ON fl.student_identity_id = i.id
       WHERE fl.parent_user_id = $1
       ORDER BY i.full_name ASC`,
      [parentUserId]
    );

    // 2. Get recent announcements
    const announcementsResult = await pool.query(
      `SELECT id, priority, title, content, timestamp
       FROM silo_announcements
       ORDER BY timestamp DESC
       LIMIT 10`
    );

    return sendSuccess(res, {
      children: childrenResult.rows,
      announcements: announcementsResult.rows,
    });
  } catch (err: any) {
    return sendError(res, 'Internal server error.', 500, err.message);
  }
};

/**
 * GET /api/parent/child/:studentId/communication
 * Returns the communication book logs for a specific child.
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

    const result = await pool.query(
      `SELECT l.*, i.full_name as sender_name 
       FROM silo_communication_logs l
       JOIN silo_identities i ON i.id = l.sender_id
       WHERE l.student_id = $1
       ORDER BY l.week_ending DESC`,
      [studentId]
    );
    return sendSuccess(res, result.rows);
  } catch (err: any) {
    return sendError(res, 'Failed to fetch communication logs.', 500, err.message);
  }
};
