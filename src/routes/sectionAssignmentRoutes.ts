import { Router } from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware';
import * as sectionAssignmentController from '../controllers/sectionAssignmentController';

const router = Router();

// All section assignment routes require authentication and admin/school admin role

/**
 * GET /api/sections/available
 * Get available sections for a grade with capacity info
 * Query: grade (required)
 * Accessible by: School Admin, Super Admin
 */
router.get(
  '/available',
  authenticateToken,
  authorizeRoles('school-admin', 'super-admin'),
  sectionAssignmentController.getAvailableSections
);

/**
 * PATCH /api/students/:id/section
 * Assign a single student to a section
 * Body: { sectionId: UUID, reason?: string }
 * Accessible by: School Admin, Super Admin
 */
router.patch(
  '/:id/section',
  authenticateToken,
  authorizeRoles('school-admin', 'super-admin'),
  sectionAssignmentController.assignStudentSection
);

/**
 * POST /api/students/:id/auto-assign
 * Auto-assign a student to least-loaded section in their grade
 * Accessible by: School Admin, Super Admin
 */
router.post(
  '/:id/auto-assign',
  authenticateToken,
  authorizeRoles('school-admin', 'super-admin'),
  sectionAssignmentController.autoAssignStudentSection
);

/**
 * POST /api/students/swap-sections
 * Swap two students' sections atomically
 * Body: { studentAId: UUID, studentBId: UUID }
 * Accessible by: School Admin, Super Admin
 */
router.post(
  '/swap-sections',
  authenticateToken,
  authorizeRoles('school-admin', 'super-admin'),
  sectionAssignmentController.swapStudentsSections
);

/**
 * POST /api/sections/:sectionId/assign-students
 * Bulk assign multiple students to a section
 * Body: { studentIds: UUID[], reason?: string }
 * Accessible by: School Admin, Super Admin
 */
router.post(
  '/:sectionId/assign-students',
  authenticateToken,
  authorizeRoles('school-admin', 'super-admin'),
  sectionAssignmentController.bulkAssignToSection
);

export default router;
