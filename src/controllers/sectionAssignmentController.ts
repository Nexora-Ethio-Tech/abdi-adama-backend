import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import {
  assignStudentToSection,
  autoAssignStudent,
  bulkAssignStudents,
  swapStudentSections,
  getEligibleSections,
  autoDistributeUnassigned
} from '../services/sectionAssignmentService';
import { sendSuccess, sendError } from '../shared/responseUtils';
import pool from '../config/db';
import Joi from 'joi';

/**
 * GET /api/students/sections?grade=GRADE
 * Get available sections for a grade with capacity info
 */
export const getAvailableSections = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { grade } = req.query;

    if (!grade) {
      sendError(res, 'Grade parameter is required', 400);
      return;
    }

    let branchId = req.user?.branch_id;
    if (!branchId && req.user?.user_id) {
      const userRow = await pool.query('SELECT branch_id FROM users WHERE id = $1', [
        req.user.user_id
      ]);
      branchId = userRow.rows[0]?.branch_id;
    }

    const sections = await getEligibleSections(grade as string, branchId);
    sendSuccess(res, { sections });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/students/:id/section
 * Assign a single student to a section
 * Body: { sectionId: UUID, reason?: string }
 */
export const assignStudentSection = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: studentId } = req.params;
    const { sectionId, reason } = req.body;
    const userId = req.user?.user_id;

    // Validate input
    const schema = Joi.object({
      sectionId: Joi.string().uuid().required(),
      reason: Joi.string().max(255).optional()
    });
    const { error, value } = schema.validate({ sectionId, reason });
    if (error) {
      sendError(res, error.details[0].message, 400);
      return;
    }

    if (!studentId || !userId) {
      sendError(res, 'Missing required parameters', 400);
      return;
    }

    const result = await assignStudentToSection(
      studentId,
      value.sectionId,
      value.reason || 'Manual assignment',
      userId
    );

    sendSuccess(res, result, 'Student assigned to section successfully', 200);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/students/:id/auto-assign
 * Auto-assign a student to least-loaded section in their grade
 * Body: { }
 */
export const autoAssignStudentSection = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: studentId } = req.params;
    const userId = req.user?.user_id;

    if (!studentId || !userId) {
      sendError(res, 'Missing required parameters', 400);
      return;
    }

    // Get student's grade
    const studentResult = await pool.query(
      'SELECT grade FROM students WHERE id = $1',
      [studentId]
    );
    if (studentResult.rows.length === 0) {
      sendError(res, 'Student not found', 404);
      return;
    }

    const result = await autoAssignStudent(studentId, studentResult.rows[0].grade, userId);
    sendSuccess(res, result, 'Student auto-assigned successfully', 200);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/sections/:sectionId/assign-students
 * Bulk assign multiple students to a section
 * Body: { studentIds: UUID[], reason?: string }
 */
export const bulkAssignToSection = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { sectionId } = req.params;
    const { studentIds, reason } = req.body;
    const userId = req.user?.user_id;

    // Validate input
    const schema = Joi.object({
      studentIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
      reason: Joi.string().max(255).optional()
    });
    const { error, value } = schema.validate({ studentIds, reason });
    if (error) {
      sendError(res, error.details[0].message, 400);
      return;
    }

    if (!sectionId || !userId) {
      sendError(res, 'Missing required parameters', 400);
      return;
    }

    const results = await bulkAssignStudents(
      value.studentIds,
      sectionId,
      value.reason || 'Bulk assignment',
      userId
    );

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    sendSuccess(
      res,
      { results, summary: { successful, failed } },
      `Bulk assignment complete: ${successful} successful, ${failed} failed`,
      200
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/students/swap-sections
 * Swap two students' sections atomically
 * Body: { studentAId: UUID, studentBId: UUID }
 */
export const swapStudentsSections = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { studentAId, studentBId } = req.body;
    const userId = req.user?.user_id;

    // Validate input
    const schema = Joi.object({
      studentAId: Joi.string().uuid().required(),
      studentBId: Joi.string().uuid().required()
    });
    const { error, value } = schema.validate({ studentAId, studentBId });
    if (error) {
      sendError(res, error.details[0].message, 400);
      return;
    }

    if (!userId) {
      sendError(res, 'User ID not found', 400);
      return;
    }

    const result = await swapStudentSections(value.studentAId, value.studentBId, userId);
    sendSuccess(res, result, 'Students swapped successfully', 200);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/sections/auto-distribute
 * Auto-distribute all unassigned students in a grade fairly across available sections
 * Body: { grade: string }
 */
export const autoDistributeStudents = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { grade, branchId: bodyBranchId } = req.body;
    const userId = req.user?.user_id;

    if (!grade || !userId) {
      sendError(res, 'Grade and user ID are required', 400);
      return;
    }

    let branchId = req.user?.branch_id || bodyBranchId;
    if (!branchId) {
      const userRow = await pool.query('SELECT branch_id FROM users WHERE id = $1', [userId]);
      branchId = userRow.rows[0]?.branch_id;
    }

    const result = await autoDistributeUnassigned(grade, branchId, userId);

    if (result.successful === 0 && result.failed === 0) {
      sendSuccess(
        res,
        result,
        `No unassigned students found for grade ${grade}. Ensure students have section_id empty and matching grade.`,
        200
      );
      return;
    }

    sendSuccess(
      res,
      result,
      `Auto-distributed ${result.successful} students (${result.failed} failed)`,
      200
    );
  } catch (error) {
    next(error);
  }
};
