import { Router } from 'express';
import * as studentController from '../controllers/studentController';
import examController from '../controllers/exam.controller';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

// All student routes require a valid JWT
// Student-only routes also enforce role with authorizeRoles('Student')

// ── Profile ─────────────────────────────────────────────────────────────────
// Returns full_name (for "Welcome back!" greeting) + section + grade
router.get('/profile', authenticateToken, studentController.getOwnProfile);

// ── Dashboard (Today's Schedule + Deadlines + Teacher of the Month) ──────────
router.get(
  '/dashboard',
  authenticateToken,
  authorizeRoles('Student'),
  studentController.getDashboard
);

// ── Grades (filterable by semester + subject_id) ──────────────────────────────
// ?semester=1|2  &  ?subject_id=<uuid>
// Parent role is also allowed — the controller verifies the parent-child link
router.get(
  '/grades',
  authenticateToken,
  authorizeRoles('Student', 'Parent'),
  studentController.getGrades
);

// ── Academic History (filterable by year + semester) ─────────────────────────
// ?year=2024/2025  &  ?semester=1|2
// Parent role is also allowed — the controller verifies the parent-child link
router.get(
  '/history',
  authenticateToken,
  authorizeRoles('Student', 'Parent'),
  studentController.getHistory
);

router.get(
  '/exams',
  authenticateToken,
  authorizeRoles('Student', 'Parent'),
  examController.listAvailableExams
);

router.get(
  '/exams/:examId',
  authenticateToken,
  authorizeRoles('Student', 'Parent'),
  examController.getExamDetails
);

router.post(
  '/exams/:examId/answer',
  authenticateToken,
  authorizeRoles('Student', 'Parent'),
  examController.saveExamAnswer
);

router.post(
  '/exams/:examId/submit',
  authenticateToken,
  authorizeRoles('Student', 'Parent'),
  examController.submitExam
);

// ── Courses (current semester) ────────────────────────────────────────────────
router.get(
  '/courses',
  authenticateToken,
  authorizeRoles('Student', 'Parent'),
  studentController.getCurrentCourses
);

// ── Backward-compatible endpoints ─────────────────────────────────────────────
router.get('/current-courses', authenticateToken, studentController.getCurrentCourses);
router.get('/academic-history', authenticateToken, studentController.getAcademicHistory);

export default router;
