import { Router } from 'express';
import { login, register, getPendingUsers, updateStatus, verify, provisionUser } from '../controllers/authController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/verify', authenticateToken, verify);
router.post('/switch-role', authenticateToken, switchRole);

// Admin-only routes for approval workflow and provisioning
router.get('/pending-users', authenticateToken, authorizeRoles('super-admin', 'school-admin'), getPendingUsers);
router.patch('/update-status', authenticateToken, authorizeRoles('super-admin', 'school-admin'), updateStatus);
router.post('/provision', authenticateToken, authorizeRoles('super-admin', 'school-admin'), provisionUser);

export default router;
