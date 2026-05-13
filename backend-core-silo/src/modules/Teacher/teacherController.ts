import { Response } from 'express';
import pool from '../../config/db';
import { AuthRequest } from '../../middleware/authMiddleware';
import { sendSuccess, sendError } from '../../shared/responseUtils';

/**
 * GET /api/teacher/sections
 * Returns sections where this teacher has scheduled courses.
 */
export const getTeacherSections = async (req: AuthRequest, res: Response) => {
  const identityId = req.user?.identity_id;
  try {
    const result = await pool.query(
      `SELECT DISTINCT s.id, s.name, s.grade
       FROM silo_sections s
       JOIN silo_schedule sc ON sc.section_id = s.id
       JOIN silo_courses c ON c.id = sc.course_id
       WHERE c.teacher_id = $1
       ORDER BY s.grade, s.name`,
      [identityId]
    );
    return sendSuccess(res, result.rows);
  } catch (err: any) {
    return sendError(res, 'Failed to fetch sections.', 500, err.message);
  }
};

/**
 * GET /api/teacher/students
 * Query: ?section_id=UUID
 * Returns students enrolled in the specified section.
 */
export const getSectionStudents = async (req: AuthRequest, res: Response) => {
  const { section_id } = req.query;
  if (!section_id) return sendError(res, 'section_id is required.', 400);

  try {
    const result = await pool.query(
      `SELECT DISTINCT i.id, i.full_name, i.school_id, i.grade
       FROM silo_identities i
       JOIN silo_enrollments e ON e.student_id = i.id
       WHERE e.section_id = $1
       ORDER BY i.full_name`,
      [section_id]
    );
    return sendSuccess(res, result.rows);
  } catch (err: any) {
    return sendError(res, 'Failed to fetch students.', 500, err.message);
  }
};

/**
 * POST /api/teacher/plans
 * Body: { section_id, week_number, content }
 */
export const submitWeeklyPlan = async (req: AuthRequest, res: Response) => {
  const { section_id, week_number, content } = req.body;
  const teacher_id = req.user?.identity_id;

  if (!section_id || !week_number || !content) {
    return sendError(res, 'section_id, week_number, and content are required.', 400);
  }

  try {
    const result = await pool.query(
      `INSERT INTO silo_weekly_plans (teacher_id, section_id, week_number, content)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [teacher_id, section_id, week_number, JSON.stringify(content)]
    );
    return sendSuccess(res, result.rows[0], 'Plan submitted.', 201);
  } catch (err: any) {
    return sendError(res, 'Failed to submit plan.', 500, err.message);
  }
};

/**
 * GET /api/teacher/plans
 * Query: ?section_id=... (optional)
 */
export const getWeeklyPlans = async (req: AuthRequest, res: Response) => {
  const { section_id } = req.query;
  const teacher_id = req.user?.identity_id;

  try {
    const query = section_id
      ? [`SELECT p.*, s.name as section_name 
          FROM silo_weekly_plans p 
          JOIN silo_sections s ON s.id = p.section_id
          WHERE p.teacher_id = $1 AND p.section_id = $2
          ORDER BY p.week_number DESC`, [teacher_id, section_id]]
      : [`SELECT p.*, s.name as section_name 
          FROM silo_weekly_plans p 
          JOIN silo_sections s ON s.id = p.section_id
          WHERE p.teacher_id = $1
          ORDER BY p.week_number DESC`, [teacher_id]];

    const result = await pool.query(query[0] as string, query[1] as any[]);
    return sendSuccess(res, result.rows);
  } catch (err: any) {
    return sendError(res, 'Failed to fetch plans.', 500, err.message);
  }
};

/**
 * POST /api/teacher/communication
 * Body: { student_id, week_ending, ratings, teacher_note }
 */
export const submitCommunicationLog = async (req: AuthRequest, res: Response) => {
  const { student_id, week_ending, ratings, teacher_note } = req.body;
  const sender_id = req.user?.identity_id;

  if (!student_id || !week_ending || !ratings) {
    return sendError(res, 'student_id, week_ending, and ratings are required.', 400);
  }

  try {
    const result = await pool.query(
      `INSERT INTO silo_communication_logs (student_id, sender_id, week_ending, ratings, teacher_note)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (student_id, week_ending) 
       DO UPDATE SET ratings = $4, teacher_note = $5
       RETURNING *`,
      [student_id, sender_id, week_ending, JSON.stringify(ratings), teacher_note]
    );
    return sendSuccess(res, result.rows[0], 'Communication log updated.', 201);
  } catch (err: any) {
    return sendError(res, 'Failed to update communication log.', 500, err.message);
  }
};
