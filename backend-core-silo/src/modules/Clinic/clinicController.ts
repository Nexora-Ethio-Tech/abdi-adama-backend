import { Request, Response } from 'express';
import pool from '../../config/db';
import { sendSuccess, sendError, getPagination } from '../../shared/responseUtils';

/**
 * GET /api/clinic/students
 * Returns a list of students for the directory. Supports search and pagination.
 */
export const getStudents = async (req: Request, res: Response) => {
  const { search } = req.query;
  const { limit, offset, page } = getPagination(req.query);

  try {
    const filter = search 
      ? `AND (i.full_name ILIKE $1 OR i.school_id ILIKE $1)` 
      : `AND (
           EXISTS (SELECT 1 FROM silo_clinic_visits v WHERE v.student_id = i.id)
           OR EXISTS (SELECT 1 FROM silo_clinic_messages m WHERE m.child_id = i.id)
         )`;

    const params = search ? [`%${search}%`, limit, offset] : [limit, offset];

    const query = `
      SELECT 
        i.id, 
        i.full_name AS name, 
        i.school_id, 
        i.grade, 
        i.blood_group, 
        i.allergies 
      FROM silo_identities i
      WHERE i.school_id LIKE 'STU-%' 
        ${filter}
      ORDER BY i.full_name ASC
      LIMIT ${search ? '$2 OFFSET $3' : '$1 OFFSET $2'}
    `;

    const result = await pool.query(query, params);

    const countQuery = `
      SELECT COUNT(i.id) 
      FROM silo_identities i
      WHERE i.school_id LIKE 'STU-%' 
        ${filter}
    `;

    const countResult = await pool.query(countQuery, search ? [`%${search}%`] : []);

    return sendSuccess(res, {
      students: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit
    });
  } catch (err: any) {
    console.error('[Clinic getStudents Error]:', err);
    return sendError(res, 'Failed to fetch students.', 500, err.message);
  }
};

/**
 * POST /api/clinic/visits
 * Logs a new medical visit.
 */
export const logVisit = async (req: Request, res: Response) => {
  const { student_id, reason, treatment } = req.body;

  if (!student_id || !reason) {
    return sendError(res, 'Student ID and reason are required.', 400);
  }

  try {
    // 1. Lookup the student in silo_identities using school_id or internal ID
    const identityResult = await pool.query(
      'SELECT id, full_name FROM silo_identities WHERE school_id = $1 OR id::text = $1',
      [student_id]
    );

    if (identityResult.rows.length === 0) {
      return sendError(res, `Student with ID ${student_id} not found.`, 404);
    }

    const { id: identity_uuid, full_name: student_name } = identityResult.rows[0];

    // 2. Log the visit
    const result = await pool.query(
      `INSERT INTO silo_clinic_visits (student_id, student_name, reason, treatment)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [identity_uuid, student_name, reason, treatment]
    );

    return sendSuccess(res, result.rows[0], 'Visit logged successfully.', 201);
  } catch (err: any) {
    return sendError(res, 'Failed to log visit.', 500, err.message);
  }
};

/**
 * GET /api/clinic/visits/history
 * Returns the history of clinic visits with pagination and search.
 */
export const getVisitHistory = async (req: Request, res: Response) => {
  const { search } = req.query;
  const { limit, offset, page } = getPagination(req.query);

  try {
    const filter = search 
      ? `WHERE student_name ILIKE $1 OR reason ILIKE $1` 
      : '';
    const params = search ? [`%${search}%`, limit, offset] : [limit, offset];

    const result = await pool.query(
      `SELECT 
         id,
         student_id,
         student_name,
         to_char(visit_time, 'YYYY-MM-DD') AS date,
         to_char(visit_time, 'HH:MI AM') AS time,
         reason,
         treatment,
         'Logged' AS status
       FROM silo_clinic_visits 
       ${filter}
       ORDER BY visit_time DESC
       LIMIT ${search ? '$2 OFFSET $3' : '$1 OFFSET $2'}`,
      params
    );

    return sendSuccess(res, result.rows);
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
      `SELECT id, name, stock, unit, description
         FROM silo_medicines
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
 * Returns updated medicine row.
 */
export const deductMedicine = async (req: Request, res: Response) => {
  const { medicine_id, quantity } = req.body;

  if (!medicine_id || !quantity || isNaN(Number(quantity)) || Number(quantity) < 1) {
    return sendError(res, 'medicine_id and a positive quantity are required.', 400);
  }

  try {
    // Atomic decrement with stock floor check
    const result = await pool.query(
      `UPDATE silo_medicines
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
 * Retrieves chat history between Parent and ClinicAdmin.
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
        // Return list of parents who have messaged (Inbox view)
        queryText = `
          SELECT DISTINCT ON (m.sender_id)
            m.sender_id,
            i.full_name as sender_name,
            m.message as last_message,
            to_char(m.created_at, 'YYYY-MM-DD HH:MI AM') as last_time,
            st.full_name as student_name,
            m.child_id as student_id
          FROM silo_clinic_messages m
          JOIN silo_users u ON m.sender_id = u.id
          JOIN silo_identities i ON u.identity_id = i.id
          LEFT JOIN silo_identities st ON m.child_id = st.id
          WHERE m.receiver_id IS NULL OR m.receiver_id IN (SELECT id FROM silo_users WHERE role = 'ClinicAdmin')
          ORDER BY m.sender_id, m.created_at DESC
        `;
        params = [];
      } else {
        // Specific conversation (by parent OR by child)
        const filter = childId ? 'WHERE m.child_id = $1' : 'WHERE (m.sender_id = $1 OR m.receiver_id = $1)';
        queryText = `
          SELECT 
            m.id, 
            m.sender_id, 
            m.receiver_id, 
            m.message AS text, 
            m.child_id,
            st.full_name as student_name,
            to_char(m.created_at, 'HH:MI AM') AS timestamp,
            CASE WHEN m.sender_id IN (SELECT id FROM silo_users WHERE role = 'ClinicAdmin') THEN 'clinic' ELSE 'parent' END as role
          FROM silo_clinic_messages m
          LEFT JOIN silo_identities st ON m.child_id = st.id
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

    if (senderRole === 'Parent' && !finalReceiverId) {
      // Parents sending a message should automatically route to the ClinicAdmin
      const clinicAdminResult = await pool.query(
        `SELECT id FROM silo_users WHERE role = 'ClinicAdmin' LIMIT 1`
      );
      if (clinicAdminResult.rows.length > 0) {
        finalReceiverId = clinicAdminResult.rows[0].id;
      } else {
        return sendError(res, 'No Clinic Admin available to receive the message.', 404);
      }
    } else if (senderRole === 'ClinicAdmin' && !finalReceiverId && childId) {
      // ClinicAdmins messaging a student profile should auto-resolve to the student's parent
      const lastParentMsg = await pool.query(
        `SELECT sender_id FROM silo_clinic_messages 
         WHERE child_id = $1 AND sender_id IN (SELECT id FROM silo_users WHERE role = 'Parent')
         ORDER BY created_at DESC LIMIT 1`,
        [childId]
      );

      if (lastParentMsg.rows.length > 0) {
        finalReceiverId = lastParentMsg.rows[0].sender_id;
      } else {
        // Fallback: Find the first parent linked in silo_family_links
        const linkedParent = await pool.query(
          `SELECT parent_user_id FROM silo_family_links WHERE student_identity_id = $1 LIMIT 1`,
          [childId]
        );
        if (linkedParent.rows.length > 0) {
          finalReceiverId = linkedParent.rows[0].parent_user_id;
        } else {
          return sendError(res, 'No parent account found for this student.', 404);
        }
      }
    }

    if (!finalReceiverId) {
      return sendError(res, 'Message recipient could not be determined.', 400);
    }

    const result = await pool.query(
      `INSERT INTO silo_clinic_messages (sender_id, receiver_id, message, child_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *, to_char(created_at, 'HH:MI AM') AS timestamp`,
      [senderId, finalReceiverId, message, childId || null]
    );

    return sendSuccess(res, result.rows[0], 'Message sent.', 201);
  } catch (err: any) {
    return sendError(res, 'Failed to send message.', 500, err.message);
  }
};

