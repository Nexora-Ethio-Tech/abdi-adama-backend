import { Router } from 'express';
import schoolAdminController from '../controllers/schoolAdmin.controller';
import { authenticate } from '../middleware/auth';
import { roleGuard } from '../middleware/roleGuard';
import { validate, schemas } from '../middleware/validator';
import { UserRole } from '../types';
import Joi from 'joi';

const router = Router();

router.use(authenticate);
router.use(roleGuard([UserRole.SCHOOL_ADMIN]));

// Validation schemas
const createClassSchema = Joi.object({
  name: Joi.string().required(),
  capacity: Joi.number().integer().min(0),
  section: Joi.string().allow('')
});

const assignTeacherSchema = Joi.object({
  teacherId: Joi.string().uuid().required()
});

const createCourseSchema = Joi.object({
  name: Joi.string().required(),
  code: Joi.string().required(),
  teacherId: Joi.string().uuid(),
  classId: Joi.string().uuid()
});

const createScheduleSchema = Joi.object({
  teacherId: Joi.string().uuid().required(),
  day: Joi.string().required(),
  timeSlot: Joi.string().required(),
  className: Joi.string().required(),
  subject: Joi.string().required()
});

const academicYearSchema = Joi.object({
  yearName: Joi.string().required(),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().required()
});

const financialPolicySchema = Joi.object({
  gradeLevel: Joi.string().allow(''),
  monthlyTuition: Joi.number().min(0).required(),
  registrationFee: Joi.number().min(0).required(),
  busFee: Joi.number().min(0).required(),
  penaltyRate: Joi.number().min(0).required(),
  academicYear: Joi.string().required()
});

const createEventSchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),
  date: Joi.date().iso().required(),
  type: Joi.string().min(2).max(50).required(),
  description: Joi.string().max(1000).allow('', null)
});

const updateEventSchema = Joi.object({
  title: Joi.string().min(3).max(200),
  date: Joi.date().iso(),
  type: Joi.string().min(2).max(50),
  description: Joi.string().max(1000).allow('', null)
}).min(1);

// User Management (existing)
router.post('/register-user', validate(schemas.createUser), schoolAdminController.registerUser);
router.get('/users', schoolAdminController.getBranchUsers);
router.get('/users/:id', schoolAdminController.getUserById);
router.patch('/users/:id', validate(schemas.updateUser), schoolAdminController.updateUser);
router.patch('/users/:id/status', validate(schemas.updateUserStatus), schoolAdminController.updateUserStatus);
router.post('/users/:id/reset-pin', schoolAdminController.resetUserPIN);
router.delete('/users/:id', schoolAdminController.deleteUser);

// Student-Class Management
router.post('/students/assign-class', validate(schemas.assignStudentToClass), schoolAdminController.assignStudentToClass);
router.delete('/students/:studentId/remove-class', schoolAdminController.removeStudentFromClass);

// Class Management
router.post('/classes', validate(createClassSchema), schoolAdminController.createClass);
router.get('/classes', schoolAdminController.getClasses);
router.patch('/classes/:id', schoolAdminController.updateClass);
router.delete('/classes/:id', schoolAdminController.deleteClass);
router.patch('/classes/:id/assign-teacher', validate(assignTeacherSchema), schoolAdminController.assignTeacherToClass);

// Course Management
router.post('/courses', validate(createCourseSchema), schoolAdminController.createCourse);
router.get('/courses', schoolAdminController.getCourses);

// Schedule Management
router.post('/schedules', validate(createScheduleSchema), schoolAdminController.createSchedule);
router.get('/schedules', schoolAdminController.getSchedules);

// Academic Year Management
router.post('/academic-years', validate(academicYearSchema), schoolAdminController.createAcademicYear);
router.get('/academic-years', schoolAdminController.getAcademicYears);
router.patch('/academic-years/:id/activate', schoolAdminController.activateAcademicYear);

// Student Applications
router.get('/applications', schoolAdminController.getPendingApplications);
router.patch('/applications/:id/status', schoolAdminController.updateApplicationStatus);

// Financial Policies
router.post('/financial-policies', validate(financialPolicySchema), schoolAdminController.setFinancialPolicy);
router.get('/financial-policies', schoolAdminController.getFinancialPolicies);

// Dashboard & Utilities
router.get('/dashboard', schoolAdminController.getDashboard);
router.get('/teachers', schoolAdminController.getBranchTeachers);
router.get('/students', schoolAdminController.getBranchStudents);
router.get('/students/:id', schoolAdminController.getStudentById);

// ============================================================
// DASHBOARD FEATURES
// ============================================================

// At-Risk Students
router.get('/dashboard/at-risk-students', schoolAdminController.getAtRiskStudents);

// Events Calendar
router.get('/dashboard/upcoming-events', schoolAdminController.getUpcomingEvents);
router.post('/events', validate(createEventSchema), schoolAdminController.createEvent);
router.patch('/events/:id', validate(updateEventSchema), schoolAdminController.updateEvent);
router.delete('/events/:id', schoolAdminController.deleteEvent);

export default router;
