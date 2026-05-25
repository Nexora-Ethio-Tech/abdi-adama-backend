import { Router } from 'express';
import scheduleController from '../controllers/schedule.controller';
import { authenticate, requireBranchId } from '../middleware/auth';
import { roleGuard } from '../middleware/roleGuard';
import { validate } from '../middleware/validator';
import { UserRole } from '../types';
import Joi from 'joi';

const router = Router();

// All routes require authenticated school-admin
router.use(authenticate);
router.use(requireBranchId);
router.use(roleGuard([UserRole.SCHOOL_ADMIN]));

// ── Validation Schemas ─────────────────────────────────────────────────────────

const configSchema = Joi.object({
  periodsPerDay: Joi.number().integer().min(3).max(12).required(),
  startTime: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
  endTime: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
  maxConsecutivePeriods: Joi.number().integer().min(1).max(6).required(),
  distributeSubjects: Joi.boolean().required(),
  academicYear: Joi.string().optional()
});

const teacherConstraintsSchema = Joi.object({
  constraints: Joi.array().items(
    Joi.object({
      dayOfWeek: Joi.string().valid('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday').required(),
      periodNumber: Joi.number().integer().min(1).required()
    })
  ).required(),
  academicYear: Joi.string().optional()
});

const courseFrequenciesSchema = Joi.object({
  frequencies: Joi.array().items(
    Joi.object({
      courseId: Joi.string().uuid().required(),
      sessionsPerWeek: Joi.number().integer().min(1).max(10).required()
    })
  ).required(),
  academicYear: Joi.string().optional()
});

const generateSchema = Joi.object({
  academicYear: Joi.string().optional()
});

const approveSchema = Joi.object({
  candidateIndex: Joi.number().integer().min(0).required()
});

// ── Routes ─────────────────────────────────────────────────────────────────────

// Config
router.put('/config', validate(configSchema), scheduleController.saveConfig);
router.get('/config', scheduleController.getConfig);

// Teacher Constraints
router.put('/teachers/:teacherId/constraints', validate(teacherConstraintsSchema), scheduleController.saveTeacherConstraints);
router.get('/teachers/constraints', scheduleController.getTeacherConstraints);

// Course Frequencies
router.put('/courses/frequencies', validate(courseFrequenciesSchema), scheduleController.saveCourseFrequencies);
router.get('/courses/frequencies', scheduleController.getCourseFrequencies);

// Generation
router.post('/generate', validate(generateSchema), scheduleController.generateTimetable);
router.post('/runs/:runId/approve', validate(approveSchema), scheduleController.approveCandidate);

// Query
router.get('/runs', scheduleController.getTimetableRuns);
router.get('/runs/:runId', scheduleController.getTimetableRunDetail);
router.get('/timetable', scheduleController.getGeneratedSchedule);

export default router;
