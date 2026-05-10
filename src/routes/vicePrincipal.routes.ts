import { Router } from 'express';
import vicePrincipalController from '../controllers/vicePrincipal.controller';
import { authenticate } from '../middleware/auth';
import { roleGuard } from '../middleware/roleGuard';
import { UserRole } from '../types';
import Joi from 'joi';
import { validate } from '../middleware/validator';

const router = Router();

router.use(authenticate);
router.use(roleGuard([UserRole.VICE_PRINCIPAL]));

// Validation schemas
const updateAbsenceSchema = Joi.object({
  status: Joi.string().valid('pending', 'excused', 'notified').required()
});

const reviewPlanSchema = Joi.object({
  status: Joi.string().valid('Approved', 'Revision Required').required(),
  deanFeedback: Joi.string().allow(''),
  deanRating: Joi.number().integer().min(1).max(5)
});

const gradeLockSchema = Joi.object({
  gradeLevel: Joi.string().required(),
  isLocked: Joi.boolean().required(),
  academicYearId: Joi.string().uuid()
});

// Routes
router.get('/absence-queue', vicePrincipalController.getAbsenceQueue);
router.patch('/absence-queue/:id', validate(updateAbsenceSchema), vicePrincipalController.updateAbsenceStatus);

router.get('/weekly-plans', vicePrincipalController.getWeeklyPlans);
router.patch('/weekly-plans/:id/review', validate(reviewPlanSchema), vicePrincipalController.reviewWeeklyPlan);

router.get('/grade-locks', vicePrincipalController.getGradeLocks);
router.post('/grade-locks', validate(gradeLockSchema), vicePrincipalController.toggleGradeLock);

router.get('/teachers', vicePrincipalController.getBranchTeachers);
router.get('/attendance-summary', vicePrincipalController.getAttendanceSummary);
router.get('/academic-performance', vicePrincipalController.getAcademicPerformance);
router.get('/dashboard', vicePrincipalController.getDashboard);

export default router;
