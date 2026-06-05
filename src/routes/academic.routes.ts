import { Router, Response } from 'express';
import pool from '../config/database';
import { authenticate } from '../middleware/auth';
import { roleGuard } from '../middleware/roleGuard';
import { AuthRequest, UserRole } from '../types';

const router = Router();

router.use(authenticate);
router.use(roleGuard([UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN]));

// GET /api/academic/grades/with-sections
router.get('/grades/with-sections', async (req: AuthRequest, res: Response) => {
  try {
    const branchId = req.user!.branch_id;
    if (!branchId) {
      res.status(400).json({ success: false, message: 'Branch ID is required' });
      return;
    }

    const result = await pool.query(
      `SELECT 
        c.id,
        c.name,
        c.section as section_name,
        c.capacity,
        c.student_count as current_count,
        (c.capacity - c.student_count) as available,
        u.name as room_teacher_name
      FROM classes c
      LEFT JOIN teachers t ON c.teacher_id = t.id
      LEFT JOIN users u ON t.user_id = u.id
      WHERE c.branch_id = $1
      ORDER BY c.name, c.section`,
      [branchId]
    );

    const gradesMap: Record<string, any> = {};
    for (const row of result.rows) {
      const gradeLevel = row.name;
      if (!gradesMap[gradeLevel]) {
        gradesMap[gradeLevel] = {
          grade_id: gradeLevel,
          grade_level: gradeLevel,
          sections: []
        };
      }
      
      if (row.section_name) {
        gradesMap[gradeLevel].sections.push({
          id: row.id,
          section_name: row.section_name,
          capacity: row.capacity,
          current_count: row.current_count,
          available: row.available,
          room_teacher_name: row.room_teacher_name || undefined
        });
      }
    }

    res.json(Object.values(gradesMap));
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/academic/grades
router.post('/grades', async (req: AuthRequest, res: Response) => {
  try {
    const branchId = req.user!.branch_id;
    if (!branchId) {
      res.status(400).json({ success: false, message: 'Branch ID is required' });
      return;
    }

    const { grade_level } = req.body;
    if (!grade_level) {
      res.status(400).json({ success: false, message: 'Grade level is required' });
      return;
    }

    // Check if any class/grade exists with this name
    const checkRes = await pool.query(
      'SELECT id FROM classes WHERE name = $1 AND branch_id = $2 LIMIT 1',
      [grade_level, branchId]
    );

    if (checkRes.rows.length > 0) {
      res.status(400).json({ success: false, message: 'Grade level already exists' });
      return;
    }

    // Create a default section A for this grade
    const result = await pool.query(
      `INSERT INTO classes (name, section, capacity, student_count, branch_id)
       VALUES ($1, 'A', 40, 0, $2)
       RETURNING *`,
      [grade_level, branchId]
    );

    res.status(201).json({
      success: true,
      message: 'Grade created successfully',
      data: result.rows[0]
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/academic/sections/bulk
router.post('/sections/bulk', async (req: AuthRequest, res: Response) => {
  try {
    const branchId = req.user!.branch_id;
    if (!branchId) {
      res.status(400).json({ success: false, message: 'Branch ID is required' });
      return;
    }

    const { grade_id, section_count, capacity } = req.body;
    if (!grade_id || !section_count || !capacity) {
      res.status(400).json({ success: false, message: 'Grade ID, section count and capacity are required' });
      return;
    }

    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T'];
    
    // Get existing section letters for this grade name
    const existingRes = await pool.query(
      'SELECT section FROM classes WHERE name = $1 AND branch_id = $2',
      [grade_id, branchId]
    );
    const existingSections = existingRes.rows.map(r => r.section).filter(Boolean);

    let addedCount = 0;
    const createdSections = [];

    for (const letter of letters) {
      if (addedCount >= section_count) break;
      if (!existingSections.includes(letter)) {
        const insertRes = await pool.query(
          `INSERT INTO classes (name, section, capacity, student_count, branch_id)
           VALUES ($1, $2, $3, 0, $4)
           RETURNING *`,
          [grade_id, letter, capacity, branchId]
        );
        createdSections.push(insertRes.rows[0]);
        addedCount++;
      }
    }

    res.status(201).json({
      success: true,
      message: `${addedCount} sections created successfully`,
      data: createdSections
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/academic/sections/:id
router.delete('/sections/:id', async (req: AuthRequest, res: Response) => {
  try {
    const branchId = req.user!.branch_id;
    if (!branchId) {
      res.status(400).json({ success: false, message: 'Branch ID is required' });
      return;
    }

    const sectionId = req.params.id;

    // Check if section has students enrolled
    const studentCheck = await pool.query(
      `SELECT COUNT(*) as count FROM students s
       JOIN classes c ON s.branch_id = c.branch_id AND (
         s.section_id = c.id
         OR (s.section_id IS NULL AND c.section IS NULL AND s.grade = c.name)
       )
       WHERE c.id = $1`,
      [sectionId]
    );

    if (parseInt(studentCheck.rows[0].count) > 0) {
      res.status(400).json({
        success: false,
        message: 'Cannot delete section with enrolled students'
      });
      return;
    }

    const deleteRes = await pool.query(
      'DELETE FROM classes WHERE id = $1 AND branch_id = $2 RETURNING *',
      [sectionId, branchId]
    );

    if (deleteRes.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Section not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Section deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
