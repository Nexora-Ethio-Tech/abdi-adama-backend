import { Router } from 'express';
import { getParentDashboard, getChildCommunicationLogs } from '../controllers/parentController';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);
router.use(authorizeRoles('Parent'));

// GET /api/parent/dashboard
router.get('/dashboard', getParentDashboard);
router.get('/child/:studentId/communication', getChildCommunicationLogs);

export default router;
