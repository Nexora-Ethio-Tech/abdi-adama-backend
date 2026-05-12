import { Response } from 'express';
import pool from '../../config/db';
import { AuthRequest } from '../../middleware/authMiddleware';

/**
 * GET /api/parent/dashboard
 * Returns the parent's linked children list + recent announcements.
 * Parents can ONLY see children linked to them in silo_family_links.
 */
export const getParentDashboard = async (req: AuthRequest, res: Response) => {
  const parentUserId = req.user?.user_id;

  if (!parentUserId) {
    return res.status(401).json({ message: 'Identity context missing.' });
  }

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

    res.json({
      children: childrenResult.rows,
      announcements: announcementsResult.rows,
    });
  } catch (err) {
    console.error('Error fetching parent dashboard:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};
