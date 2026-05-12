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
      ? `AND (full_name ILIKE $1 OR school_id ILIKE $1)` 
      : '';
    const params = search ? [`%${search}%`, limit, offset] : [limit, offset];

    const result = await pool.query(
      `SELECT 
         id, 
         full_name AS name, 
         school_id, 
         grade, 
         blood_group, 
         allergies 
       FROM silo_identities 
       WHERE school_id LIKE 'STU-%' ${filter}
       ORDER BY full_name ASC
       LIMIT ${search ? '$2 OFFSET $3' : '$1 OFFSET $2'}`,
      params
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM silo_identities WHERE school_id LIKE 'STU-%' ${filter}`,
      search ? [`%${search}%`] : []
    );

    return sendSuccess(res, {
      students: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit
    });
  } catch (err: any) {
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
