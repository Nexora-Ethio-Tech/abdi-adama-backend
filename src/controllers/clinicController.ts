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
 */
const verifyParentChildLink = async (parentUserId: string, studentId: string): Promise<boolean> => {
  const result = await pool.query(
    `SELECT 1 FROM parent_student ps
     JOIN parents p ON ps.parent_id = p.id
     WHERE p.user_id = $1
       AND ps.student_id = $2`,
    [parentUserId, studentId]
  );
  return result.rows.length > 0;
};

/**
 * GET /api/clinic/chat
 * Returns the chat thread for the current parent or clinic admin context.
 */
export const getChatMessages = async (req: Request, res: Response) => {
  const { user_id: userId, role } = (req as any).user;
  const { childId } = req.query;

  try {
    let queryText = '';
    let params: any[] = [];

    if (role === 'Parent') {
      const selectedChildId = childId as string | undefined;
      if (selectedChildId) {
        const isLinked = await verifyParentChildLink(userId, selectedChildId);
        if (!isLinked) {
          return sendError(res, 'Access denied: student not linked to your account.', 403);
        }
        queryText = `
          SELECT
            m.id,
            m.sender_id,
            m.sender_role AS role,
            m.student_id AS child_id,
            m.student_name,
            m.text,
            m.read AS is_read,
            to_char(m.created_at, 'HH12:MI AM') AS timestamp
          FROM clinic_chat_messages m
          WHERE m.student_id = $1
          ORDER BY m.created_at ASC
        `;
        params = [selectedChildId];
      } else {
        const childrenResult = await pool.query(
          `SELECT ps.student_id
           FROM parent_student ps
           JOIN parents p ON ps.parent_id = p.id
           WHERE p.user_id = $1`,
          [userId]
        );
        const childIds = childrenResult.rows.map((row) => row.student_id);
        if (childIds.length === 0) {
          return sendSuccess(res, []);
        }
        queryText = `
          SELECT
            m.id,
            m.sender_id,
            m.sender_role AS role,
            m.student_id AS child_id,
            m.student_name,
            m.text,
            m.read AS is_read,
            to_char(m.created_at, 'HH12:MI AM') AS timestamp
          FROM clinic_chat_messages m
          WHERE m.student_id = ANY($1::uuid[])
          ORDER BY m.created_at ASC
        `;
        params = [childIds];
      }
    } else if (role === 'ClinicAdmin') {
      if (!childId) {
        queryText = `
          WITH latest_per_student AS (
            SELECT DISTINCT ON (m.student_id)
              m.student_id,
              m.text AS last_message,
              m.created_at AS last_message_at
            FROM clinic_chat_messages m
            ORDER BY m.student_id, m.created_at DESC
          ),
          unread_counts AS (
            SELECT
              m.student_id,
              COUNT(*) FILTER (WHERE m.read = FALSE AND m.sender_role = 'parent') AS unread_count
            FROM clinic_chat_messages m
            GROUP BY m.student_id
          )
          SELECT
            lps.student_id,
            su.name AS student_name,
            lps.last_message,
            to_char(lps.last_message_at, 'YYYY-MM-DD HH12:MI AM') AS last_time,
            lps.last_message_at,
            COALESCE(uc.unread_count, 0)::int AS unread_count
          FROM latest_per_student lps
          LEFT JOIN students s ON s.id = lps.student_id
          LEFT JOIN users su ON s.user_id = su.id
          LEFT JOIN unread_counts uc ON uc.student_id = lps.student_id
          ORDER BY lps.last_message_at DESC
        `;
        params = [];
      } else {
        queryText = `
          SELECT
            m.id,
            m.sender_id,
            m.sender_role AS role,
            m.student_id AS child_id,
            m.student_name,
            m.text,
            m.read AS is_read,
            to_char(m.created_at, 'HH12:MI AM') AS timestamp
          FROM clinic_chat_messages m
          WHERE m.student_id = $1
          ORDER BY m.created_at ASC
        `;
        params = [childId];
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
  const { message, childId } = req.body;

  if (!message) {
    return sendError(res, 'Message content is required.', 400);
  }

  if (!childId) {
    return sendError(res, 'Child ID is required to send a message.', 400);
  }

  try {
    if (senderRole === 'Parent') {
      const isLinked = await verifyParentChildLink(senderId, childId);
      if (!isLinked) {
        return sendError(res, 'Access denied: student not linked to your account.', 403);
      }
    }

    const studentResult = await pool.query(
      `SELECT u.name AS student_name FROM students s JOIN users u ON s.user_id = u.id WHERE s.id = $1 LIMIT 1`,
      [childId]
    );

    if (studentResult.rows.length === 0) {
      return sendError(res, 'Student not found.', 404);
    }

    const studentName = studentResult.rows[0].student_name;
    const senderRoleValue = senderRole === 'ClinicAdmin' ? 'clinic' : 'parent';

    const result = await pool.query(
      `INSERT INTO clinic_chat_messages (sender_id, sender_role, student_id, student_name, text, read)
       VALUES ($1, $2, $3, $4, $5, FALSE)
       RETURNING id, sender_id, sender_role AS role, student_id AS child_id, student_name, text, read AS is_read, to_char(created_at, 'HH12:MI AM') AS timestamp`,
      [senderId, senderRoleValue, childId, studentName, message]
    );

    return sendSuccess(res, result.rows[0], 'Message sent.', 201);
  } catch (err: any) {
    return sendError(res, 'Failed to send message.', 500, err.message);
  }
};

/**
 * PATCH /api/clinic/chat/read
 * Marks all parent messages for a child as read.
 */
export const markMessagesRead = async (req: Request, res: Response) => {
  const { role } = (req as any).user;
  const { student_id } = req.body;

  if (role !== 'ClinicAdmin') {
    return sendError(res, 'Only ClinicAdmin can mark messages as read.', 403);
  }

  if (!student_id) {
    return sendError(res, 'student_id is required.', 400);
  }

  try {
    const result = await pool.query(
      `UPDATE clinic_chat_messages
         SET read = TRUE
       WHERE student_id = $1
         AND sender_role = 'parent'
         AND read = FALSE
       RETURNING id`,
      [student_id]
    );

    return sendSuccess(res, {
      marked_read: result.rowCount ?? 0
    }, `${result.rowCount ?? 0} message(s) marked as read.`);
  } catch (err: any) {
    return sendError(res, 'Failed to mark messages as read.', 500, err.message);
  }
};
