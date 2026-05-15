import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import teacherService from '../services/teacher.service';

class TeacherController {
  // Mark attendance (bulk)
  async markAttendance(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { date, attendanceRecords } = req.body;
      const recordedBy = req.user!.id;

      const result = await teacherService.markAttendance(date, attendanceRecords, recordedBy);

      res.status(201).json({
        success: true,
        data: result,
        message: 'Attendance marked successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Get attendance for a class
  async getAttendance(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { classId } = req.params;
      const { date } = req.query;

      const attendance = await teacherService.getAttendance(classId, date as string);

      res.json({
        success: true,
        data: attendance
      });
    } catch (error) {
      next(error);
    }
  }

  // Enter grades
  async enterGrades(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { studentId, courseId, type, score, total, weight } = req.body;

      const grade = await teacherService.enterGrade({
        studentId,
        courseId,
        type,
        score,
        total,
        weight
      });

      res.status(201).json({
        success: true,
        data: grade,
        message: 'Grade entered successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Bulk enter grades
  async bulkEnterGrades(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const teacherId = req.user!.id;
      const { courseId, grades } = req.body;

      const result = await teacherService.bulkEnterGrades(teacherId, courseId, grades);

      res.status(201).json({
        success: true,
        data: result,
        message: `${result.count} grades entered successfully`
      });
    } catch (error) {
      next(error);
    }
  }

  // Get grades for a course
  async getGrades(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { courseId } = req.params;

      const grades = await teacherService.getGradesByCourse(courseId);

      res.json({
        success: true,
        data: grades
      });
    } catch (error) {
      next(error);
    }
  }

  // Update grade
  async updateGrade(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const teacherId = req.user!.id;
      const { score, total, type, weight } = req.body;

      const grade = await teacherService.updateGrade(id, teacherId, {
        score,
        total,
        type,
        weight
      });

      res.json({
        success: true,
        data: grade,
        message: 'Grade updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete grade
  async deleteGrade(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const teacherId = req.user!.id;

      const result = await teacherService.deleteGrade(id, teacherId);

      res.json({
        success: true,
        data: result,
        message: 'Grade deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Get assigned classes
  async getAssignedClasses(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const teacherId = req.user!.id;

      const classes = await teacherService.getAssignedClasses(teacherId);

      res.json({
        success: true,
        data: classes
      });
    } catch (error) {
      next(error);
    }
  }

  // Get students in a class
  async getStudentRoster(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { classId } = req.params;

      const students = await teacherService.getStudentRoster(classId);

      res.json({
        success: true,
        data: students
      });
    } catch (error) {
      next(error);
    }
  }

  // Submit weekly lesson plan
  async submitWeeklyPlan(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const teacherId = req.user!.id;
      const planData = req.body;

      const plan = await teacherService.submitWeeklyPlan(teacherId, planData);

      res.status(201).json({
        success: true,
        data: plan,
        message: 'Lesson plan submitted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Get my lesson plans
  async getMyPlans(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const teacherId = req.user!.id;
      const { status } = req.query;

      const plans = await teacherService.getTeacherPlans(teacherId, status as string);

      res.json({
        success: true,
        data: plans
      });
    } catch (error) {
      next(error);
    }
  }

  // Update lesson plan (only if Draft)
  async updatePlan(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const teacherId = req.user!.id;
      const planData = req.body;

      const plan = await teacherService.updatePlan(id, teacherId, planData);

      res.json({
        success: true,
        data: plan,
        message: 'Lesson plan updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Submit weekly communication log
  async submitCommunicationLog(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const teacherId = req.user!.id;
      const logData = req.body;

      const log = await teacherService.submitCommunicationLog(teacherId, logData);

      res.status(201).json({
        success: true,
        data: log,
        message: 'Communication log submitted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Get communication logs for a student
  async getCommunicationLogs(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { studentId } = req.params;

      const logs = await teacherService.getCommunicationLogs(studentId);

      res.json({
        success: true,
        data: logs
      });
    } catch (error) {
      next(error);
    }
  }

  // Get student's all grades
  async getStudentGrades(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { studentId } = req.params;
      const teacherId = req.user!.id;

      const grades = await teacherService.getStudentGrades(studentId, teacherId);

      res.json({
        success: true,
        data: grades
      });
    } catch (error) {
      next(error);
    }
  }

  // Get teaching schedule
  async getSchedule(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const teacherId = req.user!.id;

      const schedule = await teacherService.getTeacherSchedule(teacherId);

      res.json({
        success: true,
        data: schedule
      });
    } catch (error) {
      next(error);
    }
  }

  // Get dashboard
  async getDashboard(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const teacherId = req.user!.id;

      const dashboard = await teacherService.getDashboard(teacherId);

      res.json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new TeacherController();
