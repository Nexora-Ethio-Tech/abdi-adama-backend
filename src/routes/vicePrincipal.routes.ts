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

const unlockGradeSubmissionSchema = Joi.object({
  courseId: Joi.string().uuid().required(),
  submissionType: Joi.string().trim().required(),
  academicYear: Joi.string().pattern(/^\d{4}\/\d{4}$/).required(),
  semester: Joi.number().integer().valid(1, 2).required(),
});

const gradeSubmissionSettingsSchema = Joi.object({
  open: Joi.boolean().required(),
});

const sendAbsenceNotificationSchema = Joi.object({
  phoneNumbers: Joi.array().items(Joi.string().required()).required(),
  message: Joi.string().required(),
  studentIds: Joi.array().items(Joi.string())
});

// Routes
router.get('/absence-queue', vicePrincipalController.getAbsenceQueue);
router.post('/absence-queue/:id', validate(updateAbsenceSchema), vicePrincipalController.updateAbsenceStatus);

router.get('/weekly-plans', vicePrincipalController.getWeeklyPlans);
router.post('/weekly-plans/:id/review', validate(reviewPlanSchema), vicePrincipalController.reviewWeeklyPlan);

router.get('/grade-locks', vicePrincipalController.getGradeLocks);
router.post('/grade-locks', validate(gradeLockSchema), vicePrincipalController.toggleGradeLock);

// Grade submissions reviews
router.get('/grade-submissions', vicePrincipalController.getGradeSubmissions);
router.get('/grade-submission-policy', vicePrincipalController.getGradeSubmissionPolicy);
router.post('/grade-submission-settings', validate(gradeSubmissionSettingsSchema), vicePrincipalController.setGradeSubmissionOpen);
router.post('/unlock-grade-submission', validate(unlockGradeSubmissionSchema), vicePrincipalController.unlockGradeSubmission);
router.get('/grades/:courseId/:submissionType', vicePrincipalController.getSubmittedGrades);

// Grade Management
router.get('/grade-management/sections', vicePrincipalController.getGradesAndSections);
router.get('/grade-management/sections/:sectionId/students', vicePrincipalController.getStudentsBySection);
router.get('/grade-management/sections/:sectionId/courses', vicePrincipalController.getCoursesBySection);
router.get('/grade-management/sections/:sectionId/grades', vicePrincipalController.getSectionGrades);
router.post('/grade-management/generate-results/:sectionId', vicePrincipalController.generateSectionResults);

router.get('/teachers', vicePrincipalController.getBranchTeachers);
router.get('/teachers/:userId/attendance', vicePrincipalController.getTeacherAttendanceDetail);
router.get('/staff-attendance', vicePrincipalController.getStaffAttendance);
router.get('/teachers/leaderboard', vicePrincipalController.getLeaderboard);
router.post('/teachers/leaderboard/reset', vicePrincipalController.resetLeaderboard);
router.post('/teachers/:id/rate', vicePrincipalController.rateTeacher);

router.get('/students/search', vicePrincipalController.searchStudents);

router.get('/attendance-summary', vicePrincipalController.getAttendanceSummary);
router.get('/communication-logs/summary', vicePrincipalController.getCommunicationSummary);
router.get('/academic-performance', vicePrincipalController.getAcademicPerformance);
router.get('/dashboard', vicePrincipalController.getDashboard);
router.get('/teacher-of-week/votes', vicePrincipalController.getTeacherOfWeekVotes);
router.get('/students/:studentId/transcript', vicePrincipalController.getStudentTranscript);
router.get('/staff-absent-count', vicePrincipalController.getStaffAbsentCount);

// Attendance monitoring & SMS notifications
router.get('/attendance/absences-today', vicePrincipalController.getTodayAbsentStudents);
router.post('/attendance/send-absence-notification', validate(sendAbsenceNotificationSchema), vicePrincipalController.sendAbsenceNotification);

// Teacher Attendance Oversight & Proxy Management
router.get('/teachers/attendance-oversight', vicePrincipalController.getTeacherAttendanceOversight);
router.post('/teachers/attendance', vicePrincipalController.recordTeacherAttendance);
router.get('/teachers/proxy-candidates', vicePrincipalController.getProxyCandidates);
router.post('/teachers/proxy-assignments', vicePrincipalController.saveProxyAssignment);
router.delete('/teachers/proxy-assignments/:id', vicePrincipalController.deleteProxyAssignment);

export default router;
