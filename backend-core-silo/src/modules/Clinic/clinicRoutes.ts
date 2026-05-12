import { Router } from 'express';
import { getStudents, logVisit, getVisitHistory, getMedicines, deductMedicine } from './clinicController';
import { authenticateToken, authorizeRoles } from '../../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);
router.use(authorizeRoles('ClinicAdmin'));

// Student directory
router.get('/students',               getStudents);

// Visit management
router.post('/visits',                logVisit);
router.get('/visits/history',         getVisitHistory);

// Medicine inventory
router.get('/medicine',               getMedicines);
router.post('/medicine/deduct',       deductMedicine);

export default router;
