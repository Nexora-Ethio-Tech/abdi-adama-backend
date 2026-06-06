import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import vicePrincipalService from '../services/vicePrincipal.service';
import teacherOfWeekService from '../services/teacherOfWeek.service';
import { smsService } from '../services/sms.service';

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

      // Allow optional date override (expects YYYY-MM-DD Gregorian).
      const { date } = req.query as { date?: string };
      const teachers = await vicePrincipalService.getBranchTeachers(branchId!, date as string | undefined);

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

  async searchStudents(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const query = String(req.query.query || '').trim();

      if (!query) {
        res.json({ success: true, data: [] });
        return;
      }

      const students = await vicePrincipalService.searchStudents(branchId!, query);

      res.json({
        success: true,
        data: students
      });
    } catch (error) {
      next(error);
    }
  }

  // Grade submissions review
  async getGradeSubmissions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const submissions = await vicePrincipalService.getGradeSubmissions(branchId!);

      res.json({
        success: true,
        data: submissions
      });
    } catch (error) {
      next(error);
    }
  }

  async getSubmittedGrades(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const { courseId, submissionType } = req.params;

      const grades = await vicePrincipalService.getSubmittedGrades(
        courseId,
        submissionType,
        branchId!
      );

      res.json({
        success: true,
        data: grades
      });
    } catch (error) {
      next(error);
    }
  }

  async getTeacherOfWeekVotes(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const { cycleKey } = req.query as { cycleKey?: string };
      const summary = await teacherOfWeekService.getBranchVoteSummary(branchId!, cycleKey);
      res.json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  }

  async getTeacherAttendanceDetail(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const { userId } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'startDate and endDate are required query parameters.' }
        });
        return;
      }

      const attendance = await vicePrincipalService.getTeacherAttendanceDetail(
        branchId!,
        userId,
        startDate as string,
        endDate as string
      );

      res.json({
        success: true,
        data: attendance
      });
    } catch (error) {
      next(error);
    }
  }

  async getStaffAbsentCount(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const { date } = req.query;
      const result = await vicePrincipalService.getStaffAbsentCount(branchId!, date as string | undefined);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // Get today's absent students with parent contact info for SMS notifications
  async getTodayAbsentStudents(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      // Allow VP to query a specific date; default to today via CURRENT_DATE in the service
      const date = req.query.date as string | undefined;
      const absents = await vicePrincipalService.getTodayAbsentStudents(branchId!, date);

      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');

      res.json({
        success: true,
        data: absents
      });
    } catch (error) {
      next(error);
    }
  }

  // Send SMS notification to parents of absent students
  async sendAbsenceNotification(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { phoneNumbers, message, studentIds } = req.body;

      if (!Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
        res.status(400).json({
          success: false,
          error: { message: 'No phone numbers provided' }
        });
        return;
      }

      if (!message || message.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: { message: 'Message cannot be empty' }
        });
        return;
      }

      console.log(`[SMS] Initiating SMS to ${phoneNumbers.length} recipients`);
      let successCount = 0;
      let failureCount = 0;

      for (const phone of phoneNumbers) {
        const success = await smsService.sendSMS(phone, message);
        if (success) {
          successCount++;
        } else {
          failureCount++;
        }
      }

      // Record SMS notification in audit log (optional)
      // You can store this in a notifications table for audit purposes
      const today = new Date().toISOString().split('T')[0];
      console.log(`[SMS AUDIT] Notification sent on ${today} - Success: ${successCount}, Failed: ${failureCount} for ${studentIds?.length || 0} student(s)`);

      res.json({
        success: true,
        message: `SMS notifications completed. Success: ${successCount}, Failed: ${failureCount}`,
        data: {
          recipientCount: phoneNumbers.length,
          successCount,
          failureCount,
          sentAt: new Date().toISOString(),
          studentIds: studentIds || []
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Grade Management Methods
  async getGradesAndSections(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const sections = await vicePrincipalService.getGradesAndSections(branchId!);
      res.json({ success: true, data: sections });
    } catch (error) {
      next(error);
    }
  }

  async getStudentsBySection(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sectionId } = req.params;
      const branchId = req.user!.branch_id;
      const students = await vicePrincipalService.getStudentsBySection(sectionId, branchId!);
      res.json({ success: true, data: students });
    } catch (error) {
      next(error);
    }
  }

  async getCoursesBySection(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sectionId } = req.params;
      const branchId = req.user!.branch_id;
      const courses = await vicePrincipalService.getCoursesBySection(sectionId, branchId!);
      res.json({ success: true, data: courses });
    } catch (error) {
      next(error);
    }
  }

  async getSectionGrades(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sectionId } = req.params;
      const branchId = req.user!.branch_id;
      const { academicYear, semester } = req.query;
      const parsedSemester = semester !== undefined ? Number(semester) : undefined;
      const grades = await vicePrincipalService.getSectionGrades(
        sectionId,
        branchId!,
        academicYear as string,
        parsedSemester
      );
      res.json({ success: true, data: grades });
    } catch (error) {
      next(error);
    }
  }

  async generateSectionResults(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sectionId } = req.params;
      const branchId = req.user!.branch_id;
      const { academicYear, semester } = req.body;
      const parsedSemester = semester !== undefined ? Number(semester) : undefined;
      const results = await vicePrincipalService.generateSectionResults(
        sectionId,
        branchId!,
        academicYear as string,
        parsedSemester
      );
      res.json({ success: true, data: results, message: 'Results generated successfully' });
    } catch (error) {
      next(error);
    }
  }

  // Teacher Leaderboard Endpoints
  async getLeaderboard(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const leaderboard = await vicePrincipalService.getLeaderboard(branchId!);
      res.json({ success: true, data: leaderboard });
    } catch (error) {
      next(error);
    }
  }

  async rateTeacher(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { rating } = req.body;
      const branchId = req.user!.branch_id;

      if (rating < 0 || rating > 5) {
        res.status(400).json({ success: false, error: { message: 'Rating must be between 0 and 5' } });
        return;
      }

      const teacher = await vicePrincipalService.rateTeacher(id, rating, branchId!);
      res.json({ success: true, data: teacher, message: 'Teacher rated successfully' });
    } catch (error) {
      next(error);
    }
  }

  async resetLeaderboard(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const result = await vicePrincipalService.resetLeaderboard(branchId!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export default new VicePrincipalController();
