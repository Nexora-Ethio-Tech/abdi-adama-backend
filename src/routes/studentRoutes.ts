import { Router } from 'express';
import * as studentController from '../controllers/studentController';
import examController from '../controllers/exam.controller';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

// ── Profile ───────────────────────────────────────────────────────────────────
router.get('/profile', authenticateToken, studentController.getOwnProfile);

// ── Dashboard ─────────────────────────────────────────────────────────────────
router.get('/dashboard', authenticateToken, authorizeRoles('Student'), studentController.getDashboard);
router.get('/schedule', authenticateToken, authorizeRoles('Student'), studentController.getSchedule);

// ── Grades / History ──────────────────────────────────────────────────────────
router.get('/grades', authenticateToken, authorizeRoles('Student', 'Parent'), studentController.getGrades);
router.get('/history', authenticateToken, authorizeRoles('Student', 'Parent'), studentController.getHistory);

// ── Exams (student-facing) ────────────────────────────────────────────────────
router.get('/exams', authenticateToken, authorizeRoles('Student', 'Parent'), examController.listAvailableExams);
router.get('/exams/:examId', authenticateToken, authorizeRoles('Student', 'Parent'), examController.getExamDetails);

router.post('/exams/:examId/start', authenticateToken, authorizeRoles('Student', 'Parent'), examController.startExamSession);
router.post('/exams/:examId/answer', authenticateToken, authorizeRoles('Student', 'Parent'), examController.saveExamAnswer);
router.post('/exams/:examId/submit', authenticateToken, authorizeRoles('Student', 'Parent'), examController.submitExam);
router.post('/exams/:examId/verify-password', authenticateToken, authorizeRoles('Student', 'Parent'), examController.verifyExamPassword);

// Anti-cheat: violation reporting & termination
router.post('/exams/:examId/violation', authenticateToken, authorizeRoles('Student', 'Parent'), examController.reportViolation);
router.post('/exams/:examId/terminate', authenticateToken, authorizeRoles('Student', 'Parent'), examController.terminateExam);

// Teacher-issued reset PIN validation
router.post('/exams/:examId/reset-pin', authenticateToken, authorizeRoles('Student', 'Parent'), examController.validateResetPin);

// ── Courses ───────────────────────────────────────────────────────────────────
router.get('/courses', authenticateToken, authorizeRoles('Student', 'Parent'), studentController.getCurrentCourses);
router.get('/current-courses', authenticateToken, studentController.getCurrentCourses);
router.get('/academic-history', authenticateToken, studentController.getAcademicHistory);

// ── Teacher of the Week ───────────────────────────────────────────────────────
router.get('/teacher-of-week', authenticateToken, authorizeRoles('Student'), studentController.getTeacherOfWeek);
router.post('/teacher-of-week/vote', authenticateToken, authorizeRoles('Student'), studentController.submitTeacherOfWeekVote);

export default router;
