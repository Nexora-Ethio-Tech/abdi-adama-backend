import { Router, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';
import pool from '../config/database';

const router = Router();

// All authenticated users (teacher, student, parent, school-admin, etc.) can GET grading configs
router.use(authenticate);

// GET /api/grading-configs/:gradeLevel  — returns ordered assessment methods for a grade
// Tries: 1) exact match  2) numeric-only version (e.g. "Grade 12" → "12")  3) 'default' fallback
router.get('/:gradeLevel', async (req: AuthRequest, res: Response) => {
  try {
    const rawGrade = (req.params.gradeLevel || '').trim();

    // --- 1. Exact match ---
    const exactResult = await pool.query(
      `SELECT method_id, label, max_weight
       FROM grading_configs
       WHERE grade_level = $1
       ORDER BY
         CASE method_id
           WHEN 'quiz-1'         THEN 1
           WHEN 'quiz-2'         THEN 2
           WHEN 'test-1'         THEN 3
           WHEN 'mid-exam'       THEN 4
           WHEN 'mid-assignment' THEN 4
           WHEN 'assignment'     THEN 5
           WHEN 'final-exam'     THEN 10
           ELSE 6
         END ASC, created_at ASC`,
      [rawGrade]
    );
    let rows = exactResult.rows;

    // --- 2. Numeric-only match (handles "Grade 12" → "12", "9th" → "9", etc.) ---
    if (rows.length === 0) {
      const numericGrade = rawGrade.replace(/[^0-9]/g, '');
      if (numericGrade && numericGrade !== rawGrade) {
        const numResult = await pool.query(
          `SELECT method_id, label, max_weight
           FROM grading_configs
           WHERE grade_level = $1
           ORDER BY
             CASE method_id
               WHEN 'quiz-1'         THEN 1
               WHEN 'quiz-2'         THEN 2
               WHEN 'test-1'         THEN 3
               WHEN 'mid-exam'       THEN 4
               WHEN 'mid-assignment' THEN 4
               WHEN 'assignment'     THEN 5
               WHEN 'final-exam'     THEN 10
               ELSE 6
             END ASC, created_at ASC`,
          [numericGrade]
        );
        rows = numResult.rows;
      }
    }

    // --- 3. 'default' fallback ---
    if (rows.length === 0) {
      const fallback = await pool.query(
        `SELECT method_id, label, max_weight
         FROM grading_configs
         WHERE grade_level = 'default'
         ORDER BY
           CASE method_id
             WHEN 'quiz-1'         THEN 1
             WHEN 'quiz-2'         THEN 2
             WHEN 'test-1'         THEN 3
             WHEN 'mid-exam'       THEN 4
             WHEN 'mid-assignment' THEN 4
             WHEN 'assignment'     THEN 5
             WHEN 'final-exam'     THEN 10
             ELSE 6
           END ASC, created_at ASC`
      );
      rows = fallback.rows;
    }

    const methods = rows.map((r: any) => ({
      id: r.method_id,
      label: r.label,
      maxWeight: r.max_weight,
    }));

    res.json({ success: true, data: methods });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
