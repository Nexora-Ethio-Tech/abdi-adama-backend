import { Router } from 'express';
import { getParentDashboard } from './parentController';
import { authenticateToken, authorizeRoles } from '../../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);
router.use(authorizeRoles('Parent'));

// GET /api/parent/dashboard
router.get('/dashboard', getParentDashboard);

export default router;
