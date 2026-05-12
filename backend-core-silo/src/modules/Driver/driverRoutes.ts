import { Router } from 'express';
import { getManifest, postNotice, getNotices } from './driverController';
import { authenticateToken, authorizeRoles } from '../../middleware/authMiddleware';

const router = Router();

// All routes require Driver JWT
router.use(authenticateToken);
router.use(authorizeRoles('Driver'));

// Route Manifest — Driver sees their assigned students
router.get('/manifest',  getManifest);

// Notices
router.post('/notice',   postNotice);
router.get('/notices',   getNotices);

export default router;
