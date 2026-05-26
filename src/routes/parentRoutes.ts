import { Router } from 'express';
import {
  getParentDashboard,
  getChildCommunicationLogs,
  getChildTeachers,
  getChildAttendance,
  getChildAcademicHistory,
  getChildClinicUpdates,
  getDriverUpdates,
  getSchoolAnnouncements,
  getFinanceSummary
} from '../controllers/parentController';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);
router.use(authorizeRoles('Parent'));

// Dashboard
router.get('/dashboard', getParentDashboard);

// Child-specific routes (with studentId parameter)
router.get('/child/:studentId/communication', getChildCommunicationLogs);
router.get('/child/:studentId/teachers', getChildTeachers);
router.get('/child/:studentId/attendance', getChildAttendance);
router.get('/child/:studentId/academic-history', getChildAcademicHistory);
router.get('/child/:studentId/clinic-updates', getChildClinicUpdates);

// Parent-level routes (aggregated for all children)
router.get('/driver-updates', getDriverUpdates);
router.get('/school-announcements', getSchoolAnnouncements);
router.get('/finance-summary', getFinanceSummary);

export default router;
