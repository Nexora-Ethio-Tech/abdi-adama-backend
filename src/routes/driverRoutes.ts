import { Router } from 'express';
import { getManifest, postNotice, getNotices, deleteNotice } from '../controllers/driverController';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

// All routes require Driver JWT
router.use(authenticateToken);

// Manifest is Driver-only
router.get('/manifest', authorizeRoles('Driver'), getManifest);

// Notices - Shared accessibility for tracking & visibility
router.post('/notice', authorizeRoles('Driver'), postNotice);
router.get('/notices', authorizeRoles('Driver', 'SchoolAdmin', 'VicePrincipal', 'SuperAdmin'), getNotices);
router.delete('/notice/:id', authorizeRoles('Driver', 'SchoolAdmin'), deleteNotice);

export default router;
