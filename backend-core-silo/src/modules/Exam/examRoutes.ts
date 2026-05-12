import { Router } from 'express';
import { authenticateToken, authorizeRoles } from '../../middleware/authMiddleware';
import {
  listExams,
  startExam,
  submitExam,
  terminateExam,
  getExamResults,
  approveResult,
} from './examController';

const router = Router();

// All exam routes require authentication
router.use(authenticateToken);

// ─── Student routes ───────────────────────────────────────────────────────────
// GET  /api/exams              → list available exams for the student
router.get('/', authorizeRoles('Student'), listExams);

// POST /api/exams/:examId/start    → begin an exam session
router.post('/:examId/start', authorizeRoles('Student'), startExam);

// POST /api/exams/:examId/submit   → submit answers
router.post('/:examId/submit', authorizeRoles('Student'), submitExam);

// POST /api/exams/terminate        → anti-cheat / manual stop (student-triggered)
router.post('/terminate', authorizeRoles('Student'), terminateExam);

// ─── Teacher / Admin routes ───────────────────────────────────────────────────
// GET  /api/exams/teacher          → view all results for teacher's exams
router.get('/teacher', authorizeRoles('Teacher', 'Admin', 'SuperAdmin'), getExamResults);

// POST /api/exams/results/:resultId/approve → grade + push to final_50
router.post('/results/:resultId/approve', authorizeRoles('Teacher', 'Admin', 'SuperAdmin'), approveResult);

export default router;
