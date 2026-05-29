import { Router, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';
import pool from '../config/database';

const router = Router();

// All authenticated users (teacher, student, parent, school-admin, etc.) can GET grading configs
router.use(authenticate);

// GET /api/grading-configs/:gradeLevel  — returns ordered assessment methods for a grade
router.get('/:gradeLevel', async (req: AuthRequest, res: Response) => {
  try {
    const { gradeLevel } = req.params;

    // Try the exact grade first, then fall back to 'default'
    const result = await pool.query(
      `SELECT method_id, label, max_weight
       FROM grading_configs
       WHERE grade_level = $1
       ORDER BY created_at ASC`,
      [gradeLevel]
    );

    let rows = result.rows;

    if (rows.length === 0) {
      const fallback = await pool.query(
        `SELECT method_id, label, max_weight
         FROM grading_configs
         WHERE grade_level = 'default'
         ORDER BY created_at ASC`
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
