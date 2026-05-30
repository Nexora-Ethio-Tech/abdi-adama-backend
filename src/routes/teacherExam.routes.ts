import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { roleGuard } from '../middleware/roleGuard';
import teacherExamService from '../services/teacherExam.service';
import { UserRole } from '../types';
import logger from '../utils/logger';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * Create a new exam (draft)
 * POST /api/exams
 */
router.post('/', roleGuard([UserRole.TEACHER, UserRole.SCHOOL_ADMIN]), async (req: Request, res: Response) => {
  try {
    const { classId, title, examType, totalMarks, duration, instructions, selectedSection, questions } = req.body;
    const userId = (req as any).user?.id;

    // Validate required fields
    if (!title || !classId || !examType || !totalMarks || !duration) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (totalMarks <= 0 || duration <= 0) {
      return res.status(400).json({ error: 'Marks and duration must be positive' });
    }

    const exam = await teacherExamService.createExam({
      teacherId: userId,
      classId,
      title,
      examType,
      totalMarks,
      duration,
      instructions,
      selectedSection,
      questions
    });

    res.status(201).json({ success: true, data: exam });
  } catch (error) {
    logger.error('Error creating exam:', error);
    res.status(500).json({ error: 'Failed to create exam' });
  }
});

/**
 * Get all exams for current teacher
 * GET /api/exams
 */
router.get('/', roleGuard([UserRole.TEACHER, UserRole.SCHOOL_ADMIN]), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    const exams = await teacherExamService.getTeacherExams(userId);

    // Separate draft and published exams
    const draftExams = exams.filter(e => e.status === 'draft');
    const publishedExams = exams.filter(e => e.status === 'published');

    res.json({
      success: true,
      data: { draftExams, publishedExams }
    });
  } catch (error) {
    logger.error('Error fetching exams:', error);
    res.status(500).json({ error: 'Failed to fetch exams' });
  }
});

/**
 * Get single exam by ID
 * GET /api/exams/:id
 */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const exam = await teacherExamService.getExamById(id);

    res.json({ success: true, data: exam });
  } catch (error: any) {
    if (error.message === 'Exam not found') {
      return res.status(404).json({ error: 'Exam not found' });
    }
    logger.error('Error fetching exam:', error);
    res.status(500).json({ error: 'Failed to fetch exam' });
  }
});

/**
 * Update exam (draft only)
 * PATCH /api/exams/:id
 */
router.patch('/:id', roleGuard([UserRole.TEACHER, UserRole.SCHOOL_ADMIN]), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const updateData = req.body;

    // Verify ownership
    const exam = await teacherExamService.getExamById(id);
    if (exam.teacher_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updatedExam = await teacherExamService.updateExam(id, updateData);

    res.json({ success: true, data: updatedExam });
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('cannot be updated')) {
      return res.status(400).json({ error: error.message });
    }
    logger.error('Error updating exam:', error);
    res.status(500).json({ error: 'Failed to update exam' });
  }
});

/**
 * Publish exam (changes status from draft to published)
 * POST /api/exams/:id/publish
 */
router.post('/:id/publish', roleGuard([UserRole.TEACHER, UserRole.SCHOOL_ADMIN]), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    const publishedExam = await teacherExamService.publishExam(id, userId);

    res.json({ success: true, data: publishedExam, message: 'Exam published successfully' });
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('Unauthorized')) {
      return res.status(400).json({ error: error.message });
    }
    logger.error('Error publishing exam:', error);
    res.status(500).json({ error: 'Failed to publish exam' });
  }
});

/**
 * Delete exam (draft only)
 * DELETE /api/exams/:id
 */
router.delete('/:id', roleGuard([UserRole.TEACHER, UserRole.SCHOOL_ADMIN]), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    const result = await teacherExamService.deleteExam(id, userId);

    res.json({ success: true, data: result });
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('Unauthorized')) {
      return res.status(400).json({ error: error.message });
    }
    logger.error('Error deleting exam:', error);
    res.status(500).json({ error: 'Failed to delete exam' });
  }
});

/**
 * Get exams for a class
 * GET /api/exams/class/:classId
 */
router.get('/class/:classId', authenticate, async (req: Request, res: Response) => {
  try {
    const { classId } = req.params;
    const onlyPublished = req.query.published !== 'false';

    const exams = await teacherExamService.getClassExams(classId, onlyPublished);

    res.json({ success: true, data: exams });
  } catch (error) {
    logger.error('Error fetching class exams:', error);
    res.status(500).json({ error: 'Failed to fetch exams' });
  }
});

/**
 * Get exam results
 * GET /api/exams/:id/results
 */
router.get('/:id/results', roleGuard([UserRole.TEACHER, UserRole.SCHOOL_ADMIN]), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    // Verify ownership
    const exam = await teacherExamService.getExamById(id);
    if (exam.teacher_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const results = await teacherExamService.getExamResults(id);

    res.json({ success: true, data: results });
  } catch (error) {
    logger.error('Error fetching exam results:', error);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

/**
 * Save exam result
 * POST /api/exams/:id/results
 */
router.post('/:id/results', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { studentId, marksObtained } = req.body;
    if (marksObtained === undefined || studentId === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const result = await teacherExamService.saveExamResult(id, studentId, marksObtained);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    logger.error('Error saving exam result:', error);
    res.status(500).json({ error: 'Failed to save result' });
  }
});

/**
 * Issue reset PIN for a terminated student
 * POST /api/exams/:id/issue-reset-pin
 */
router.post('/:id/issue-reset-pin', roleGuard([UserRole.TEACHER, UserRole.SCHOOL_ADMIN]), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { studentId, pin } = req.body;
    const userId = (req as any).user?.id;
    if (!studentId || !pin) return res.status(400).json({ error: 'studentId and pin are required' });
    if (pin.length < 4 || pin.length > 10) return res.status(400).json({ error: 'PIN must be 4-10 characters' });
    const result = await teacherExamService.issueResetPin(id, studentId, userId, pin);
    res.json({ success: true, data: result, message: 'Reset PIN issued successfully' });
  } catch (error) {
    logger.error('Error issuing reset PIN:', error);
    res.status(500).json({ error: 'Failed to issue reset PIN' });
  }
});

export default router;
