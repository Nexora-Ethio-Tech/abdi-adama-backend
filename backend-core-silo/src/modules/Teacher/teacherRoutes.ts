import { Router } from 'express';
import * as teacherController from './teacherController';
import { authenticateToken, authorizeRoles } from '../../middleware/authMiddleware';

const router = Router();

router.get('/sections',       authenticateToken, authorizeRoles('Teacher', 'Department Dean', 'VicePrincipal'), teacherController.getTeacherSections);
router.get('/students',       authenticateToken, authorizeRoles('Teacher', 'Department Dean', 'VicePrincipal'), teacherController.getSectionStudents);
router.get('/plans',          authenticateToken, authorizeRoles('Teacher', 'Department Dean', 'VicePrincipal'), teacherController.getWeeklyPlans);
router.post('/plans',         authenticateToken, authorizeRoles('Teacher', 'VicePrincipal'), teacherController.submitWeeklyPlan);
router.post('/communication', authenticateToken, authorizeRoles('Teacher', 'VicePrincipal'), teacherController.submitCommunicationLog);

export default router;
