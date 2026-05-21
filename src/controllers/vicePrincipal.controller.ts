import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import vicePrincipalService from '../services/vicePrincipal.service';

class VicePrincipalController {
  // Absence Queue Management
  async getAbsenceQueue(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const { status } = req.query;

      const absences = await vicePrincipalService.getAbsenceQueue(branchId!, status as string);

      res.json({
        success: true,
        data: absences
      });
    } catch (error) {
      next(error);
    }
  }

  async updateAbsenceStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const absence = await vicePrincipalService.updateAbsenceStatus(id, status);

      res.json({
        success: true,
        data: absence,
        message: 'Absence status updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Lesson Plan Review
  async getWeeklyPlans(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const { status, teacherId } = req.query;

      const plans = await vicePrincipalService.getWeeklyPlans(
        branchId!,
        status as string,
        teacherId as string
      );

      res.json({
        success: true,
        data: plans
      });
    } catch (error) {
      next(error);
    }
  }

  async reviewWeeklyPlan(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const { status, deanFeedback, deanRating } = req.body;

      const plan = await vicePrincipalService.reviewWeeklyPlan(id, userId, {
        status,
        deanFeedback,
        deanRating
      });

      res.json({
        success: true,
        data: plan,
        message: 'Lesson plan reviewed successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Grade Locking
  async getGradeLocks(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;

      const locks = await vicePrincipalService.getGradeLocks(branchId!);

      res.json({
        success: true,
        data: locks
      });
    } catch (error) {
      next(error);
    }
  }

  async toggleGradeLock(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const userId = req.user!.id;
      const { gradeLevel, isLocked, academicYearId } = req.body;

      const lock = await vicePrincipalService.toggleGradeLock({
        gradeLevel,
        isLocked,
        branchId: branchId!,
        lockedBy: userId,
        academicYearId
      });

      res.json({
        success: true,
        data: lock,
        message: `Grade ${isLocked ? 'locked' : 'unlocked'} successfully`
      });
    } catch (error) {
      next(error);
    }
  }

  // Teacher Monitoring
  async getBranchTeachers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;

      const teachers = await vicePrincipalService.getBranchTeachers(branchId!);

      res.json({
        success: true,
        data: teachers
      });
    } catch (error) {
      next(error);
    }
  }

  // Attendance Overview
  async getAttendanceSummary(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const { date, gradeLevel } = req.query;

      const summary = await vicePrincipalService.getAttendanceSummary(
        branchId!,
        date as string,
        gradeLevel as string
      );

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      next(error);
    }
  }

  // Academic Performance Reports
  async getAcademicPerformance(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const { gradeLevel, courseId } = req.query;

      const performance = await vicePrincipalService.getAcademicPerformance(
        branchId!,
        gradeLevel as string,
        courseId as string
      );

      res.json({
        success: true,
        data: performance
      });
    } catch (error) {
      next(error);
    }
  }

  // Dashboard
  async getDashboard(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;

      const dashboard = await vicePrincipalService.getDashboard(branchId!);

      res.json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      next(error);
    }
  }

  // Student Transcript
  async getStudentTranscript(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { studentId } = req.params;
      const branchId = req.user!.branch_id;

      const transcript = await vicePrincipalService.getStudentTranscript(studentId, branchId!);

      res.json({
        success: true,
        data: transcript
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new VicePrincipalController();
