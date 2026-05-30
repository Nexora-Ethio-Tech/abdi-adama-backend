import { Router } from 'express';
import teacherController from '../controllers/teacher.controller';
import examController from '../controllers/exam.controller';
import { authenticate } from '../middleware/auth';
import { roleGuard } from '../middleware/roleGuard';
import { validate } from '../middleware/validator';
import { UserRole } from '../types';
import Joi from 'joi';

const router = Router();

// All routes require authentication and teacher role
router.use(authenticate);
router.use(roleGuard([UserRole.TEACHER]));

// Validation schemas
const markAttendanceSchema = Joi.object({
  date: Joi.date().iso().required(),
  attendanceRecords: Joi.array().items(
    Joi.object({
      studentId: Joi.string().uuid().required(),
      status: Joi.string().valid('present', 'absent', 'late', 'excused').required()
    })
  ).min(1).required()
});

const enterGradeSchema = Joi.object({
  studentId: Joi.string().uuid().required(),
  courseId: Joi.string().uuid().required(),
  type: Joi.string().required(),
  score: Joi.number().min(0).required(),
  total: Joi.number().positive().required(),
  weight: Joi.string().allow('')
});

const bulkEnterGradesSchema = Joi.object({
  courseId: Joi.string().uuid().required(),
  grades: Joi.array().items(
    Joi.object({
      studentId: Joi.string().uuid().required(),
      type: Joi.string().required(),
      score: Joi.number().min(0).required(),
      total: Joi.number().positive().required(),
      weight: Joi.string().allow('').optional()
    })
  ).min(1).required()
});

const updateGradeSchema = Joi.object({
  score: Joi.number().min(0).required(),
  total: Joi.number().positive().required(),
  type: Joi.string().optional(),
  weight: Joi.string().allow('').optional()
});

const weeklyPlanSchema = Joi.object({
  date: Joi.date().iso().required(),
  content: Joi.string().required(),
  objectives: Joi.string().required(),
  teacherActivity: Joi.string().required(),
  timeDuration: Joi.string().required(),
  studentActivity: Joi.string().required(),
  teachingMethod: Joi.string().required(),
  teachingAids: Joi.string().required(),
  evaluation: Joi.string().required(),
  remark: Joi.string().allow(''),
  status: Joi.string().valid('Draft', 'Pending'),
  courseId: Joi.string().uuid().allow(null, '').optional(),
  subject: Joi.string().allow(null, '').optional(),
  deptHeadId: Joi.string().uuid().allow(null, '').optional(),
  weekNumber: Joi.number().integer().optional()
});

const communicationLogSchema = Joi.object({
  studentId: Joi.string().uuid().required(),
  weekEnding: Joi.date().iso().required(),
  ratingUniform: Joi.number().integer().min(0).max(3).required(),
  ratingMaterials: Joi.number().integer().min(0).max(3).required(),
  ratingHomework: Joi.number().integer().min(0).max(3).required(),
  ratingParticipation: Joi.number().integer().min(0).max(3).required(),
  ratingConduct: Joi.number().integer().min(0).max(3).required(),
  ratingSocial: Joi.number().integer().min(0).max(3).required(),
  ratingPunctuality: Joi.number().integer().min(0).max(3).required(),
  ratingNoteTaking: Joi.number().integer().min(0).max(3).required(),
  teacherNote: Joi.string().allow('')
});

// Routes
router.post('/attendance', validate(markAttendanceSchema), teacherController.markAttendance);
router.get('/attendance/:classId', teacherController.getAttendance);

// Grade locking & submissions
router.post('/grades/submit-course', teacherController.submitCourseGrades);
router.get('/grade-submissions', teacherController.getGradeSubmissions);

router.post('/grades', validate(enterGradeSchema), teacherController.enterGrades);
router.post('/grades/bulk', validate(bulkEnterGradesSchema), teacherController.bulkEnterGrades);
router.get('/grades/:courseId', teacherController.getGrades);
router.patch('/grades/:id', validate(updateGradeSchema), teacherController.updateGrade);
router.delete('/grades/:id', teacherController.deleteGrade);
router.get('/classes', teacherController.getAssignedClasses);
router.get('/students/:classId', teacherController.getStudentRoster);

// Weekly plans & department heads review
router.get('/department-heads', teacherController.getDepartmentHeads);
router.post('/weekly-plans', validate(weeklyPlanSchema), teacherController.submitWeeklyPlan);
router.get('/weekly-plans', teacherController.getMyPlans);
router.patch('/weekly-plans/:id', validate(weeklyPlanSchema), teacherController.updatePlan);

// Department tasks review (for department heads)
router.get('/dept-plans', teacherController.getDeptPlans);
router.patch('/dept-plans/:id/review', teacherController.reviewDeptPlan);

router.post('/communication-logs', validate(communicationLogSchema), teacherController.submitCommunicationLog);
router.get('/communication-logs/:studentId', teacherController.getCommunicationLogs);
router.get('/students/:studentId/grades', teacherController.getStudentGrades);
router.get('/schedule', teacherController.getSchedule);
router.get('/dashboard', teacherController.getDashboard);

// Exam Management - Teacher
router.post('/exams', examController.createExam);
router.get('/exams', examController.getTeacherExams);
router.get('/exams/:id', examController.getTeacherExamById);
router.patch('/exams/:id', examController.updateTeacherExam);
router.post('/exams/:id/publish', examController.publishTeacherExam);
router.delete('/exams/:id', examController.deleteTeacherExam);

// Grades and Courses for Exam Creation
router.get('/exam-grades', teacherController.getAllGrades);
router.get('/exam-grades/:gradeId/courses', teacherController.getCoursesByGrade);
router.get('/exam-courses', teacherController.getTeacherCourses);

export default router;
