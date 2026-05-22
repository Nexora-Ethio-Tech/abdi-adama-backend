import { Router } from 'express';
import { getManifest, postNotice, getNotices, deleteNotice, subscribeToNotifications } from '../controllers/driverController';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

// SSE stream for real-time notification updates (handles its own authentication)
router.get('/stream', subscribeToNotifications);

// All other routes require Driver JWT
router.use(authenticateToken);

// Manifest is Driver-only
router.get('/manifest', authorizeRoles('Driver'), getManifest);

// Notices - Shared accessibility for tracking & visibility
router.post('/notice', authorizeRoles('Driver'), postNotice);
router.get('/notices', authorizeRoles('Driver', 'SchoolAdmin', 'VicePrincipal', 'SuperAdmin'), getNotices);
router.delete('/notice/:id', authorizeRoles('Driver', 'SchoolAdmin'), deleteNotice);

export default router;
