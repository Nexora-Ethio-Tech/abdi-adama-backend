import { Router } from 'express';
import { getStudents, logVisit, getVisitHistory } from './clinicController';
import { authenticateToken, authorizeRoles } from '../../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);
router.use(authorizeRoles('ClinicAdmin'));

// Student directory — full list + search via ?search=
router.get('/students',         getStudents);

// Visit management
router.post('/visits',          logVisit);
router.get('/visits/history',   getVisitHistory);

export default router;
