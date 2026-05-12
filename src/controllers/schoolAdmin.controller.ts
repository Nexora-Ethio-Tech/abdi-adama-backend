import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import schoolAdminService from '../services/schoolAdmin.service';

class SchoolAdminController {
  // User Management (existing methods)
  async registerUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const userData = { ...req.body, branchId };

      const result = await schoolAdminService.registerUser(userData);

      res.status(201).json({
        success: true,
        data: result,
        message: 'User registered successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async getBranchUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const { role, status } = req.query;

      const users = await schoolAdminService.getBranchUsers(branchId!, role as string, status as string);

      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const branchId = req.user!.branch_id;

      const user = await schoolAdminService.getUserById(id, branchId!);

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  // User Status Management (Approve/Revoke)
  async updateUserStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const branchId = req.user!.branch_id;
      const schoolAdminId = req.user!.id;

      const user = await schoolAdminService.updateUserStatus(id, status, branchId!, schoolAdminId);

      res.json({
        success: true,
        data: user,
        message: `User ${status.toLowerCase()} successfully`
      });
    } catch (error) {
      next(error);
    }
  }

  // Class Management
  async createClass(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const { name, capacity, section } = req.body;

      const classData = await schoolAdminService.createClass({
        name,
        capacity,
        section,
        branchId: branchId!
      });

      res.status(201).json({
        success: true,
        data: classData,
        message: 'Class created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async getClasses(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const classes = await schoolAdminService.getClasses(branchId!);

      res.json({
        success: true,
        data: classes
      });
    } catch (error) {
      next(error);
    }
  }

  async updateClass(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const branchId = req.user!.branch_id;
      const updateData = req.body;

      const classData = await schoolAdminService.updateClass(id, branchId!, updateData);

      res.json({
        success: true,
        data: classData,
        message: 'Class updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteClass(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const branchId = req.user!.branch_id;

      await schoolAdminService.deleteClass(id, branchId!);

      res.json({
        success: true,
        message: 'Class deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Teacher Assignment
  async assignTeacherToClass(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { teacherId } = req.body;
      const branchId = req.user!.branch_id;

      const classData = await schoolAdminService.assignTeacherToClass(id, teacherId, branchId!);

      res.json({
        success: true,
        data: classData,
        message: 'Teacher assigned successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Course Management
  async createCourse(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, code, teacherId, classId } = req.body;

      const course = await schoolAdminService.createCourse({
        name,
        code,
        teacherId,
        classId
      });

      res.status(201).json({
        success: true,
        data: course,
        message: 'Course created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async getCourses(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const { classId } = req.query;

      const courses = await schoolAdminService.getCourses(branchId!, classId as string);

      res.json({
        success: true,
        data: courses
      });
    } catch (error) {
      next(error);
    }
  }

  // Schedule Management
  async createSchedule(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const scheduleData = req.body;

      const schedule = await schoolAdminService.createSchedule(scheduleData);

      res.status(201).json({
        success: true,
        data: schedule,
        message: 'Schedule created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async getSchedules(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const { teacherId, day } = req.query;

      const schedules = await schoolAdminService.getSchedules(
        branchId!,
        teacherId as string,
        day as string
      );

      res.json({
        success: true,
        data: schedules
      });
    } catch (error) {
      next(error);
    }
  }

  // Academic Year Management
  async createAcademicYear(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const { yearName, startDate, endDate } = req.body;

      const academicYear = await schoolAdminService.createAcademicYear({
        yearName,
        startDate,
        endDate,
        branchId: branchId!
      });

      res.status(201).json({
        success: true,
        data: academicYear,
        message: 'Academic year created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async getAcademicYears(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const academicYears = await schoolAdminService.getAcademicYears(branchId!);

      res.json({
        success: true,
        data: academicYears
      });
    } catch (error) {
      next(error);
    }
  }

  async activateAcademicYear(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const branchId = req.user!.branch_id;

      const academicYear = await schoolAdminService.activateAcademicYear(id, branchId!);

      res.json({
        success: true,
        data: academicYear,
        message: 'Academic year activated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Student Application Management
  async getPendingApplications(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const { status } = req.query;

      const applications = await schoolAdminService.getPendingApplications(
        branchId!,
        status as string
      );

      res.json({
        success: true,
        data: applications
      });
    } catch (error) {
      next(error);
    }
  }

  async updateApplicationStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const application = await schoolAdminService.updateApplicationStatus(id, status);

      res.json({
        success: true,
        data: application,
        message: 'Application status updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Financial Policy Management
  async setFinancialPolicy(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const policyData = req.body;

      const policy = await schoolAdminService.setFinancialPolicy({
        ...policyData,
        branchId: branchId!
      });

      res.status(201).json({
        success: true,
        data: policy,
        message: 'Financial policy set successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async getFinancialPolicies(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const policies = await schoolAdminService.getFinancialPolicies(branchId!);

      res.json({
        success: true,
        data: policies
      });
    } catch (error) {
      next(error);
    }
  }

  // Dashboard
  async getDashboard(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const dashboard = await schoolAdminService.getDashboard(branchId!);

      res.json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      next(error);
    }
  }

  // Get branch teachers
  async getBranchTeachers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const teachers = await schoolAdminService.getBranchTeachers(branchId!);

      res.json({
        success: true,
        data: teachers
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new SchoolAdminController();
