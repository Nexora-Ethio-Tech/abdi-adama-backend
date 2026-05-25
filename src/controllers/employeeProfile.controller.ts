import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import employeeProfileService from '../services/employeeProfile.service';

class EmployeeProfileController {
  /**
   * Create or update salary profile.
   */
  async createOrUpdateProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, basicSalary, transportAllowance, housingAllowance, positionAllowance, overtimeRatePerHour, bankAccount, tinNumber } = req.body;
      
      if (!userId) {
        res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Employee userId is required.' } });
        return;
      }
      if (basicSalary === undefined || isNaN(Number(basicSalary)) || Number(basicSalary) < 0) {
        res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'A valid non-negative basicSalary is required.' } });
        return;
      }

      const profile = await employeeProfileService.createOrUpdateProfile(userId, {
        basicSalary: Number(basicSalary),
        transportAllowance: transportAllowance ? Number(transportAllowance) : 0,
        housingAllowance: housingAllowance ? Number(housingAllowance) : 0,
        positionAllowance: positionAllowance ? Number(positionAllowance) : 0,
        overtimeRatePerHour: overtimeRatePerHour ? Number(overtimeRatePerHour) : 0,
        bankAccount,
        tinNumber
      });

      res.status(200).json({
        success: true,
        data: profile,
        message: 'Employee salary profile configured successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get an employee's salary profile by userId.
   */
  async getProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const profile = await employeeProfileService.getProfile(userId);
      res.json({
        success: true,
        data: profile
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all employee payroll profiles.
   */
  async getAllProfiles(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { branchId } = req.query;
      // If branchId filter is passed, use it, otherwise let standard logic apply
      const profiles = await employeeProfileService.getAllProfiles(branchId as string || undefined);
      res.json({
        success: true,
        data: profiles,
        count: profiles.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Records employee attendance for a specific date.
   */
  async recordAttendance(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, date, status } = req.body;
      const recordedBy = req.user!.id;

      if (!userId || !date || !status) {
        res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'userId, date, and status are all required.' } });
        return;
      }

      const attendance = await employeeProfileService.recordAttendance(userId, date, status, recordedBy);
      res.json({
        success: true,
        data: attendance,
        message: 'Employee attendance recorded successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves employee attendance.
   */
  async getAttendance(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const { month, year } = req.query;

      if (!month || !year) {
        res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'month and year are required query parameters.' } });
        return;
      }

      const attendance = await employeeProfileService.getAttendance(userId, Number(month), Number(year));
      res.json({
        success: true,
        data: attendance
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves current user's in-app staff notifications.
   */
  async getMyNotifications(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const notifications = await employeeProfileService.getStaffNotifications(userId);
      res.json({
        success: true,
        data: notifications
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Marks a notification as read.
   */
  async markNotificationRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const notification = await employeeProfileService.markNotificationRead(id);
      res.json({
        success: true,
        data: notification,
        message: 'Notification marked as read'
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new EmployeeProfileController();
