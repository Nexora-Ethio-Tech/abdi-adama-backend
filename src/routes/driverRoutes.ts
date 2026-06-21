import { Router } from 'express';
import { 
  getManifest, 
  postNotice, 
  getNotices, 
  deleteNotice, 
  subscribeToNotifications,
  postAlert,
  getAlerts,
  deleteAlert,
  getSchoolAnnouncements
} from '../controllers/driverController';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

// SSE stream for real-time notification updates (handles its own authentication)
router.get('/stream', subscribeToNotifications);

// All other routes require Driver JWT
router.use(authenticateToken);

// Manifest is Driver-only (STRICT ISOLATION)
router.get('/manifest', authorizeRoles('Driver'), getManifest);
router.get('/school-announcements', authorizeRoles('Driver'), getSchoolAnnouncements);

// Logistics Notices - Shared accessibility for tracking & visibility
router.post('/notice', authorizeRoles('Driver'), postNotice);
router.get('/notices', authorizeRoles('Driver', 'SchoolAdmin', 'VicePrincipal', 'SuperAdmin'), getNotices);
router.delete('/notice/:id', authorizeRoles('Driver', 'SchoolAdmin'), deleteNotice);

// Driver Alerts (NEW) - Posts to students/parents/school admin with INSTANT DELETE & 3-DAY AUTO-PURGE
router.post('/alert', authorizeRoles('Driver'), postAlert);
router.get('/alerts', authorizeRoles('Driver', 'SchoolAdmin'), getAlerts);
router.delete('/alert/:id', authorizeRoles('Driver'), deleteAlert);

export default router;
