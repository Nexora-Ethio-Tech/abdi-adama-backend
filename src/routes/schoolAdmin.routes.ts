import { Router } from 'express';
import schoolAdminController from '../controllers/schoolAdmin.controller';
import { authenticate, requireBranchId } from '../middleware/auth';
import { roleGuard } from '../middleware/roleGuard';
import { validate, schemas } from '../middleware/validator';
import { UserRole } from '../types';
import { uploadTranscript, handleUploadError } from '../middleware/upload';
import Joi from 'joi';

const router = Router();

// Public application submission (landing page) - placed before auth middleware
// Exposed at /school-admin/public/applications
router.post('/public/applications',
  uploadTranscript.single('transcript'),
  handleUploadError,
  // Controller will handle validation and default branch assignment
  schoolAdminController.createPublicPendingApplication
);

router.use(authenticate);
router.use(requireBranchId);

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

// ============================================================
// APPLICATIONS ROUTES - Accessible by School Admin & Finance Clerk
// ============================================================

// Student Applications (accessible to both school-admin and finance-clerk for admissions processing)
// Note: Multer handles multipart/form-data parsing, Joi validator skipped since controller does comprehensive validation
router.post('/applications',
  roleGuard([UserRole.SCHOOL_ADMIN, UserRole.FINANCE_CLERK]),
  uploadTranscript.single('transcript'),
  handleUploadError,
  schoolAdminController.createPendingApplication
);
router.get('/applications', roleGuard([UserRole.SCHOOL_ADMIN, UserRole.FINANCE_CLERK]), schoolAdminController.getPendingApplications);
router.get('/applications/:id/transcript', roleGuard([UserRole.SCHOOL_ADMIN, UserRole.FINANCE_CLERK]), schoolAdminController.getApplicationTranscript);
router.patch('/applications/:id/status', roleGuard([UserRole.SCHOOL_ADMIN, UserRole.FINANCE_CLERK]), schoolAdminController.updateApplicationStatus);

// ============================================================
// SCHOOL ADMIN ONLY ROUTES
// ============================================================

router.use(roleGuard([UserRole.SCHOOL_ADMIN]));

// User Management (existing)
router.post('/register-user', validate(schemas.createUser), schoolAdminController.registerUser);
router.get('/users', schoolAdminController.getBranchUsers);
router.get('/users/:id', schoolAdminController.getUserById);
router.patch('/users/:id', validate(schemas.updateUser), schoolAdminController.updateUser);
router.patch('/users/:id/status', validate(schemas.updateUserStatus), schoolAdminController.updateUserStatus);
router.post('/users/:id/reset-pin', schoolAdminController.resetUserPIN);
router.delete('/users/:id', schoolAdminController.deleteUser);

// Teacher Promotion & Subjects Management
router.patch('/users/:id/promote', schoolAdminController.promoteTeacher);
router.get('/subjects', schoolAdminController.getSubjects);
router.post('/subjects', schoolAdminController.createSubject);
router.patch('/subjects/:id', schoolAdminController.updateSubject);
router.delete('/subjects/:id', schoolAdminController.deleteSubject);

// Student-Class Management
router.post('/students/assign-class', validate(schemas.assignStudentToClass), schoolAdminController.assignStudentToClass);
router.delete('/students/:studentId/remove-class', schoolAdminController.removeStudentFromClass);

// Class Management
router.post('/classes', validate(createClassSchema), schoolAdminController.createClass);
router.get('/classes', schoolAdminController.getClasses);
router.patch('/classes/:id', schoolAdminController.updateClass);
router.delete('/classes/:id', schoolAdminController.deleteClass);
// Assign single teacher (adds assignment without replacing existing)
router.post('/classes/:id/teachers', validate(assignTeacherSchema), schoolAdminController.assignTeacherToClass);
// Unassign teacher from class
router.delete('/classes/:id/teachers/:teacherId', schoolAdminController.unassignTeacherFromClass);
// Backwards-compatible route (old) kept for now
router.patch('/classes/:id/assign-teacher', validate(assignTeacherSchema), schoolAdminController.assignTeacherToClass);

// Course Management
router.post('/courses', validate(createCourseSchema), schoolAdminController.createCourse);
router.get('/courses', schoolAdminController.getCourses);

// Schedule Management
router.post('/schedules', validate(createScheduleSchema), schoolAdminController.createSchedule);
router.get('/schedules', schoolAdminController.getSchedules);

// Financial Policies
router.post('/financial-policies', validate(financialPolicySchema), schoolAdminController.setFinancialPolicy);
router.get('/financial-policies', schoolAdminController.getFinancialPolicies);

// Dashboard & Utilities
router.get('/dashboard', schoolAdminController.getDashboard);
router.get('/teachers', schoolAdminController.getBranchTeachers);
router.get('/students', schoolAdminController.getBranchStudents);
router.get('/students/:id', schoolAdminController.getStudentById);

// Grading Configurations
router.get('/grading-configs', schoolAdminController.getGradingConfigs);
router.post('/grading-configs', schoolAdminController.publishGradingConfigs);

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
