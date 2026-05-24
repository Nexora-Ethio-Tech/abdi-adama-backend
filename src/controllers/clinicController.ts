import { Request, Response } from 'express';
import pool from '../config/db';
import { sendSuccess, sendError, getPagination } from '../shared/responseUtils';

/**
 * GET /api/clinic/students
 * Returns a list of students for the directory within the clinic admin's branch.
 * Supports search and pagination.
 * 
 * Query params:
 *   ?search=name_or_id - Search by student name or digital ID
 *   ?limit=20 - Records per page
 *   ?page=1 - Page number
 */
export const getStudents = async (req: Request, res: Response) => {
  const { search } = req.query;
  const { limit, offset, page } = getPagination(req.query);
  const branchId = (req as any).user?.branch_id;

  if (!branchId) {
    return sendError(res, 'Clinic admin branch not found.', 400);
  }

  try {
    let paramCount = 1;
    const params: any[] = [branchId];

    // Add search parameter if provided
    if (search) {
      paramCount++;
      params.push(`%${search}%`);
    }

    // Add pagination parameters
    params.push(limit, offset);

    const searchFilter = search 
      ? `AND (u.name ILIKE $${paramCount} OR u.digital_id ILIKE $${paramCount} OR s.id::text ILIKE $${paramCount} OR COALESCE(u.username, '') ILIKE $${paramCount})` 
      : '';

    const query = `
      SELECT DISTINCT ON (u.name, s.id)
        s.id, 
        u.name, 
        u.digital_id, 
        s.grade, 
        s.blood_group, 
        s.allergies 
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN clinic_visits v ON s.id = v.student_id
      LEFT JOIN clinic_chat_messages m ON s.id = m.student_id
      WHERE u.role = 'student'
        AND s.branch_id = $1
        ${search ? '' : 'AND (v.id IS NOT NULL OR m.id IS NOT NULL)'}
        ${searchFilter}
      ORDER BY u.name ASC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    const result = await pool.query(query, params);

    // Count total records matching criteria
    const countParams: any[] = [branchId];
    if (search) {
      countParams.push(`%${search}%`);
    }

    const countQuery = `
      SELECT COUNT(DISTINCT s.id) 
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN clinic_visits v ON s.id = v.student_id
      LEFT JOIN clinic_chat_messages m ON s.id = m.student_id
      WHERE u.role = 'student'
        AND s.branch_id = $1
        ${search ? '' : 'AND (v.id IS NOT NULL OR m.id IS NOT NULL)'}
        ${searchFilter}
    `;

    const countResult = await pool.query(countQuery, countParams);

    return sendSuccess(res, {
      students: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      branch_id: branchId
    });
  } catch (err: any) {
    return sendError(res, 'Failed to fetch students.', 500, err.message);
  }
};

/**
 * POST /api/clinic/visits
 * Logs a new medical visit for a student.
 * Only allows visits for students in the clinic admin's branch.
 * 
 * Body:
 *   - student_id: UUID or digital_id of the student
 *   - reason: Reason for visit (required)
 *   - treatment: Treatment provided (required)
 *   - medicines: Array of { id, quantity } (optional)
 */
export const logVisit = async (req: Request, res: Response) => {
  const { student_id, reason, treatment } = req.body;
  const branchId = (req as any).user?.branch_id;
  const clinicAdminId = (req as any).user?.id;

  if (!branchId) {
    return sendError(res, 'Clinic admin branch not found.', 400);
  }

  if (!student_id || !reason) {
    return sendError(res, 'Student ID and reason are required.', 400);
  }

  try {
    // 1. Lookup the student using digital_id or internal ID
    // IMPORTANT: Verify the student is in the clinic admin's branch
    const identityResult = await pool.query(
      `SELECT s.id, s.branch_id, u.name 
       FROM students s 
       JOIN users u ON s.user_id = u.id 
       WHERE (s.id::text = $1 OR u.digital_id = $1)
         AND s.branch_id = $2`,
      [student_id, branchId]
    );

    if (identityResult.rows.length === 0) {
      return sendError(res, `Student with ID ${student_id} not found in your branch.`, 404);
    }

    const { id: student_uuid, name: student_name } = identityResult.rows[0];

    // 2. Log the visit
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const now = new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    }); // HH:MM format
    
    const result = await pool.query(
      `INSERT INTO clinic_visits (student_id, student_name, date, time, reason, treatment, logged_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [student_uuid, student_name, today, now, reason, treatment || null, clinicAdminId]
    );

    return sendSuccess(res, result.rows[0], 'Visit logged successfully.', 201);
  } catch (err: any) {
    return sendError(res, 'Failed to log visit.', 500, err.message);
  }
};

/**
 * GET /api/clinic/visits/history
 * Returns the history of clinic visits for the clinic admin's branch.
 * Supports search and pagination.
 * 
 * Query params:
 *   ?search=student_name_or_reason - Search by student name or reason
 *   ?limit=20 - Records per page
 *   ?page=1 - Page number
 */
export const getVisitHistory = async (req: Request, res: Response) => {
  const { search } = req.query;
  const { limit, offset, page } = getPagination(req.query);
  const branchId = (req as any).user?.branch_id;

  if (!branchId) {
    return sendError(res, 'Clinic admin branch not found.', 400);
  }

  try {
    let paramCount = 1;
    const params: any[] = [branchId];

    // Add search parameter if provided
    if (search) {
      paramCount++;
      params.push(`%${search}%`);
    }

    // Add pagination parameters
    params.push(limit, offset);

    const searchFilter = search 
      ? `AND (cv.student_name ILIKE $${paramCount} OR cv.reason ILIKE $${paramCount})` 
      : '';

    // Query clinic visits for students in the admin's branch
    // Includes student info joined through the students table
    const result = await pool.query(
      `SELECT 
         cv.id,
         cv.student_id,
         cv.student_name,
         cv.date,
         cv.time,
         cv.reason,
         cv.treatment,
         cv.status,
         u.name as logged_by_name
       FROM clinic_visits cv
       JOIN students s ON cv.student_id = s.id
       LEFT JOIN users u ON cv.logged_by = u.id
       WHERE s.branch_id = $1
         ${searchFilter}
       ORDER BY cv.created_at DESC
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      params
    );

    // Count total records matching criteria
    const countParams: any[] = [branchId];
    if (search) {
      countParams.push(`%${search}%`);
    }

    const countResult = await pool.query(
      `SELECT COUNT(cv.id) as count
       FROM clinic_visits cv
       JOIN students s ON cv.student_id = s.id
       WHERE s.branch_id = $1
         ${searchFilter}`,
      countParams
    );

    return sendSuccess(res, {
      visits: result.rows,
      total: parseInt(countResult.rows[0]?.count || '0'),
      page,
      limit,
      branch_id: branchId
    });
  } catch (err: any) {
    return sendError(res, 'Failed to fetch visit history.', 500, err.message);
  }
};

/**
 * GET /api/clinic/medicine
 * Returns all medicines in the inventory with current stock.
 */
export const getMedicines = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, name, stock, unit
         FROM medicine_inventory
        ORDER BY name ASC`
    );
    return sendSuccess(res, result.rows);
  } catch (err: any) {
    return sendError(res, 'Failed to fetch medicine inventory.', 500, err.message);
  }
};

/**
 * POST /api/clinic/medicine/deduct
 * Deducts stock from a medicine (e.g., when administered during a visit).
 * Body: { medicine_id, quantity }
 */
export const deductMedicine = async (req: Request, res: Response) => {
  const { medicine_id, quantity } = req.body;

  if (!medicine_id || !quantity || isNaN(Number(quantity)) || Number(quantity) < 1) {
    return sendError(res, 'medicine_id and a positive quantity are required.', 400);
  }

  try {
    const result = await pool.query(
      `UPDATE medicine_inventory
          SET stock = GREATEST(stock - $1, 0),
              updated_at = NOW()
        WHERE id = $2
        RETURNING id, name, stock, unit`,
      [Number(quantity), medicine_id]
    );

    if (result.rows.length === 0) {
      return sendError(res, 'Medicine not found.', 404);
    }

    return sendSuccess(res, result.rows[0], 'Stock deducted successfully.');
  } catch (err: any) {
    return sendError(res, 'Failed to deduct medicine stock.', 500, err.message);
  }
};

/**
 * GET /api/clinic/chat
 *
 * For ClinicAdmin (no params):
 *   Returns the inbox — one row per parent conversation, sorted by
 *   MOST RECENT MESSAGE FIRST (WhatsApp-style). Each row includes
 *   unread_count so the frontend can display a badge.
 *
 * For ClinicAdmin (with ?otherUserId or ?childId):
 *   Returns the full message thread for that specific conversation.
 *
 * For Parent:
 *   Returns all messages between this parent and the clinic (their thread only).
 */
export const getChatMessages = async (req: Request, res: Response) => {
  const { user_id: userId, role } = (req as any).user;
  const { otherUserId, childId } = req.query;

  try {
    let queryText = '';
    let params: any[] = [];

    if (role === 'Parent') {
      // Parents see their own messages with the clinic, filtered by childId if provided
      const filter = childId ? 'AND m.child_id = $2' : '';
      queryText = `
        SELECT 
          m.id, 
          m.sender_id, 
          m.receiver_id, 
          m.message AS text, 
          m.child_id,
          m.is_read,
          to_char(m.created_at, 'HH:MI AM') AS timestamp,
          CASE WHEN m.sender_id = $1 THEN 'parent' ELSE 'clinic' END as role
        FROM silo_clinic_messages m
        WHERE (m.sender_id = $1 OR m.receiver_id = $1)
        ${filter}
        ORDER BY m.created_at ASC
      `;
      params = childId ? [userId, childId] : [userId];

    } else if (role === 'ClinicAdmin') {
      if (!otherUserId && !childId) {
        // ── INBOX VIEW ────────────────────────────────────────────────────────
        // WhatsApp-style: newest conversation at top.
        //
        // We use a CTE to get the latest message per sender (DISTINCT ON),
        // then wrap it in an outer query to allow sorting by last_message_at.
        // We also compute unread_count per conversation.
        queryText = `
          WITH latest_per_sender AS (
            SELECT DISTINCT ON (m.sender_id)
              m.sender_id,
              m.message        AS last_message,
              m.child_id       AS student_id,
              m.created_at     AS last_message_at
            FROM silo_clinic_messages m
            WHERE m.receiver_id IS NULL
               OR m.receiver_id IN (
                 SELECT id FROM silo_users WHERE role = 'ClinicAdmin'
               )
            ORDER BY m.sender_id, m.created_at DESC
          ),
          unread_counts AS (
            SELECT
              m.sender_id,
              COUNT(*) FILTER (WHERE m.is_read = FALSE) AS unread_count
            FROM silo_clinic_messages m
            WHERE (m.receiver_id IS NULL
                   OR m.receiver_id IN (
                 SELECT id FROM users WHERE role = 'clinic-admin'
                   ))
              AND m.sender_id IN (SELECT sender_id FROM latest_per_sender)
            GROUP BY m.sender_id
          )
          SELECT
            lps.sender_id,
            i.full_name                                   AS sender_name,
            lps.last_message,
            to_char(lps.last_message_at, 'YYYY-MM-DD HH:MI AM') AS last_time,
            lps.last_message_at,
            st.full_name                                  AS student_name,
            lps.student_id,
            COALESCE(uc.unread_count, 0)::int             AS unread_count
          FROM latest_per_sender lps
          JOIN users u ON lps.sender_id = u.id
          LEFT JOIN students st ON lps.student_id = st.id
          LEFT JOIN users su ON st.user_id = su.id
          LEFT JOIN unread_counts uc ON uc.sender_id = lps.sender_id
          ORDER BY lps.last_message_at DESC
        `;
        params = [];

      } else {
        // ── SPECIFIC CONVERSATION ─────────────────────────────────────────────
        const filter = childId
          ? 'WHERE m.child_id = $1'
          : 'WHERE (m.sender_id = $1 OR m.receiver_id = $1)';
        queryText = `
          SELECT 
            m.id, 
            m.sender_id, 
            m.receiver_id, 
            m.message AS text, 
            m.child_id,
            m.is_read,
            st.full_name AS student_name,
            to_char(m.created_at, 'HH:MI AM') AS timestamp,
            CASE 
              WHEN m.sender_id IN (SELECT id FROM users WHERE role = 'clinic-admin')
              THEN 'clinic' 
              ELSE 'parent' 
            END AS role
          FROM clinic_chat_messages m
          LEFT JOIN students st ON m.student_id = st.id
          ${filter}
          ORDER BY m.created_at ASC
        `;
        params = [childId || otherUserId];
      }
    }

    const result = await pool.query(queryText, params);
    return sendSuccess(res, result.rows);
  } catch (err: any) {
    return sendError(res, 'Failed to fetch chat messages.', 500, err.message);
  }
};

/**
 * POST /api/clinic/chat
 * Sends a new chat message.
 */
export const sendChatMessage = async (req: Request, res: Response) => {
  const { user_id: senderId, role: senderRole } = (req as any).user;
  const { receiverId, message, childId } = req.body;

  if (!message) {
    return sendError(res, 'Message content is required.', 400);
  }

  try {
    let finalReceiverId = receiverId;

    // Only ClinicAdmins should trigger the automated parent resolution logic
    if (senderRole === 'ClinicAdmin' && !finalReceiverId && childId) {
      // 1. Try to find the last parent who messaged about this child
      const lastParentMsg = await pool.query(
        `SELECT sender_id FROM clinic_chat_messages 
         WHERE student_id = $1 AND sender_id IN (SELECT id FROM users WHERE role = 'parent')
         ORDER BY created_at DESC LIMIT 1`,
        [childId]
      );

      if (lastParentMsg.rows.length > 0) {
        finalReceiverId = lastParentMsg.rows[0].sender_id;
      } else {
        // 2. Fallback: Find the first parent linked in silo_family_links
        const linkedParent = await pool.query(
          `SELECT parent_user_id FROM silo_family_links WHERE student_identity_id = $1 LIMIT 1`,
          [childId]
        );
        if (linkedParent.rows.length > 0) {
          finalReceiverId = linkedParent.rows[0].parent_user_id;
        }
      }
    }

    const result = await pool.query(
      `INSERT INTO clinic_chat_messages (sender_id, receiver_id, message, student_id, is_read)
       VALUES ($1, $2, $3, $4, FALSE)
       RETURNING *, to_char(created_at, 'HH:MI AM') AS timestamp`,
      [senderId, finalReceiverId || null, message, childId || null]
    );

    return sendSuccess(res, result.rows[0], 'Message sent.', 201);
  } catch (err: any) {
    return sendError(res, 'Failed to send message.', 500, err.message);
  }
};

/**
 * PATCH /api/clinic/chat/read
 * Marks all messages from a given sender as read (per-conversation, WhatsApp-style).
 *
 * Body: { sender_id: string }
 *
 * Called when ClinicAdmin opens a chat conversation. All unread messages from
 * that parent in that conversation are immediately marked as is_read = TRUE,
 * causing the unread badge to disappear on the next inbox fetch.
 */
export const markMessagesRead = async (req: Request, res: Response) => {
  const { role } = (req as any).user;
  const { sender_id } = req.body;

  if (role !== 'ClinicAdmin') {
    return sendError(res, 'Only ClinicAdmin can mark messages as read.', 403);
  }

  if (!sender_id) {
    return sendError(res, 'sender_id is required.', 400);
  }

  try {
    const result = await pool.query(
      `UPDATE clinic_chat_messages
          SET is_read = TRUE
        WHERE sender_id = $1
          AND is_read = FALSE
          AND (
            receiver_id IS NULL
            OR receiver_id IN (SELECT id FROM users WHERE role = 'clinic-admin')
          )
        RETURNING id`,
      [sender_id]
    );

    return sendSuccess(res, {
      marked_read: result.rowCount ?? 0
    }, `${result.rowCount ?? 0} message(s) marked as read.`);
  } catch (err: any) {
    return sendError(res, 'Failed to mark messages as read.', 500, err.message);
  }
};
