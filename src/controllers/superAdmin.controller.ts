import { Response, NextFunction } from 'express';
import userService from '../services/user.service';
import superAdminService from '../services/superAdmin.service';
import { AuthRequest, CreateUserDTO, UpdateUserStatusDTO, UserRole } from '../types';

class SuperAdminController {
  async createSchoolAdmin(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userData: CreateUserDTO = {
        ...req.body,
        role: UserRole.SCHOOL_ADMIN
      };

      const result = await userService.createUser(userData, req.user!.email);

      res.status(201).json({
        success: true,
        data: result,
        message: 'School Admin created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async createVicePrincipal(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userData: CreateUserDTO = {
        ...req.body,
        role: UserRole.VICE_PRINCIPAL
      };

      const result = await userService.createUser(userData, req.user!.email);

      res.status(201).json({
        success: true,
        data: result,
        message: 'Vice Principal created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async createAuditor(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userData: CreateUserDTO = {
        ...req.body,
        role: UserRole.AUDITOR
      };

      const result = await userService.createUser(userData, req.user!.email);

      res.status(201).json({
        success: true,
        data: result,
        message: 'Auditor created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // ─── User Management ──────────────────────────────────────────────────────

  async createUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, role, branchId, phone, profileImage } = req.body;

      const result = await superAdminService.createUser({
        name,
        email,
        role,
        branchId,
        phone,
        profileImage
      });

      res.status(201).json({
        success: true,
        data: result,
        message: 'User created successfully. A welcome email has been sent.'
      });
    } catch (error) {
      next(error);
    }
  }

  async updateUserStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body as UpdateUserStatusDTO;

      const result = await userService.updateUserStatus(id, status, req.user!.email);

      res.json({
        success: true,
        data: result,
        message: `User status updated to ${status}`
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const user = await userService.getUserById(id);
      if (user.role === UserRole.SUPER_ADMIN) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Cannot delete Super Admin account'
          }
        });
        return;
      }

      const result = await userService.deleteUser(id, req.user!.email);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  async updateUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const user = await userService.updateUser(id, updateData);

      res.json({
        success: true,
        data: user,
        message: 'User updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async resetUserPIN(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const result = await userService.resetUserPIN(id);

      res.json({
        success: true,
        data: result,
        message: `PIN reset successfully. New PIN: ${result.newPIN}`
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { role, branchId, status } = req.query;

      const filters: any = {};
      if (role) filters.role = role as UserRole;
      if (branchId) filters.branchId = branchId as string;
      if (status) filters.status = status;

      const users = await userService.getUsers(filters);

      res.json({
        success: true,
        data: users,
        count: users.length
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = await userService.getUserById(id);

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  // ─── Branch Management ────────────────────────────────────────────────────

  async createBranch(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branch = await superAdminService.createBranch(req.body);
      res.status(201).json({
        success: true,
        data: branch,
        message: 'Branch created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async getBranches(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branches = await superAdminService.getBranches();
      res.json({
        success: true,
        data: branches
      });
    } catch (error) {
      next(error);
    }
  }

  async getBranchById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const branch = await superAdminService.getBranchById(id);
      res.json({
        success: true,
        data: branch
      });
    } catch (error) {
      next(error);
    }
  }

  async updateBranch(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const branch = await superAdminService.updateBranch(id, req.body);
      res.json({
        success: true,
        data: branch,
        message: 'Branch updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteBranch(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await superAdminService.deleteBranch(id);
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  // ─── System Reports ───────────────────────────────────────────────────────

  async getSystemReport(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const report = await superAdminService.getSystemReport();
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      next(error);
    }
  }

  async getBranchReport(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const report = await superAdminService.getBranchReport(id);
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      next(error);
    }
  }

  async getAnalytics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { branchId } = req.query;
      const analytics = await superAdminService.getAnalytics(branchId ? String(branchId) : undefined);
      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      next(error);
    }
  }

  // ─── Academic Year Management ─────────────────────────────────────────────

  async createGlobalAcademicYear(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const academicYear = await superAdminService.createGlobalAcademicYear(req.body);
      res.status(201).json({
        success: true,
        data: academicYear,
        message: 'Global academic year created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async activateGlobalAcademicYear(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const academicYear = await superAdminService.activateGlobalAcademicYear(id);
      res.json({
        success: true,
        data: academicYear,
        message: 'Academic year activated globally'
      });
    } catch (error) {
      next(error);
    }
  }

  // Create public post

  async CreatePublicPost(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const PublicPost = await superAdminService.CreatePublicPost(req.body);
      res.status(201).json({
        success: true,
        data: PublicPost,
        message: 'Posted sucessfully!'
      });
    } catch (error) {
      next(error);
    }
  }

  async getPublicPosts(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const PublicPosts = await superAdminService.getPublicPosts();
      res.status(201).json({
        success: true,
        data: PublicPosts,
        message: 'Fetch successful!'
      });
    } catch (error) {
      next(error);
    }
  }

  async deletePublicPost(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const PublicPosts = await superAdminService.deletePublicPost(req.body);
      res.status(201).json({
        success: true,
        data: PublicPosts,
        message: 'Delete successful!'
      });
    } catch (error) {
      next(error);
    }
  }

  //

  async getGlobalAcademicYears(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const academicYears = await superAdminService.getGlobalAcademicYears();
      res.json({
        success: true,
        data: academicYears
      });
    } catch (error) {
      next(error);
    }
  }

  // ─── Class Capacity ───────────────────────────────────────────────────────

  async setClassCapacity(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { capacity } = req.body;
      const classData = await superAdminService.setClassCapacity(id, capacity);
      res.json({
        success: true,
        data: classData,
        message: 'Class capacity updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // ─── Dashboard ────────────────────────────────────────────────────────────

  async getDashboard(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const dashboard = await superAdminService.getDashboard();
      res.json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      next(error);
    }
  }

  // ─── SMTP / Email Settings Management ────────────────────────────────────

  async getSmtpSettings(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await superAdminService.getSmtpSettings();
      res.json({
        success: true,
        data: settings,
        note: 'smtp_pass is write-only and never returned for security reasons.'
      });
    } catch (error) {
      next(error);
    }
  }

  async updateSmtpSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await superAdminService.updateSmtpSettings(
        req.body,
        req.user!.id,
        req.user!.name
      );
      res.json({
        success: true,
        data: result,
        message: `SMTP settings updated: ${result.updated.join(', ')}`
      });
    } catch (error) {
      next(error);
    }
  }

  async testSmtpSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'A recipient email address is required.' }
        });
        return;
      }
      const result = await superAdminService.testSmtpSettings(email);
      res.json({ success: result.success, message: result.message });
    } catch (error) {
      next(error);
    }
  }

  // ─── Finance Settings Management ─────────────────────────────────────────

  async getFinanceSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await superAdminService.getFinanceSettings();
      res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      next(error);
    }
  }

  async updateFinanceSetting(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { key } = req.params;
      const { value } = req.body;
      const userId = req.user!.id;
      const userName = req.user!.name;

      if (value === undefined || isNaN(Number(value))) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'A valid numeric setting value is required.'
          }
        });
        return;
      }

      const setting = await superAdminService.updateFinanceSetting(key, Number(value), userId, userName);
      res.json({
        success: true,
        data: setting,
        message: `Finance setting ${key} updated successfully.`
      });
    } catch (error) {
      next(error);
    }
  }

  async getFinanceSettingsAuditLog(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const auditLog = await superAdminService.getFinanceSettingsAuditLog();
      res.json({
        success: true,
        data: auditLog
      });
    } catch (error) {
      next(error);
    }
  }

  // ─── System Settings ─────────────────────────────────────────────────────

  async getSystemSettings(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await superAdminService.getSystemSettings();
      res.json({ success: true, data: settings });
    } catch (error) {
      next(error);
    }
  }

  async updateSystemSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await superAdminService.updateSystemSettings(req.body, req.user!.id);
      res.json({
        success: true,
        data: settings,
        message: 'System settings updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // ─── Branch grade fees ───────────────────────────────────────────────────

  async getBranchGradeFees(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      let branchId = req.query.branchId as string | undefined;
      if (req.user?.role === UserRole.SCHOOL_ADMIN) {
        branchId = req.user.branch_id || branchId;
      }
      const fees = await superAdminService.getBranchGradeFees(branchId);
      res.json({ success: true, data: fees });
    } catch (error) {
      next(error);
    }
  }

  async upsertBranchGradeFee(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { branchId, gradeLevel, monthlyFee, registrationFee, busFee } = req.body;
      const fee = await superAdminService.upsertBranchGradeFee(
        {
          branchId,
          gradeLevel,
          monthlyFee: Number(monthlyFee),
          registrationFee: Number(registrationFee),
          busFee: Number(busFee),
        },
        req.user!.id
      );
      res.json({
        success: true,
        data: fee,
        message: 'Fee configuration saved',
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteBranchGradeFee(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await superAdminService.deleteBranchGradeFee(req.params.id);
      res.json({ success: true, message: 'Fee configuration removed' });
    } catch (error) {
      next(error);
    }
  }

  // ─── Monthly profit targets ──────────────────────────────────────────────

  async getBranchProfitSummary(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      let branchId = req.query.branchId as string | undefined;
      if (req.user?.role === UserRole.SCHOOL_ADMIN) {
        branchId = req.user.branch_id || branchId;
      }
      const ethiopianMonth = Number(req.query.ethiopianMonth);
      const year = req.query.year ? Number(req.query.year) : undefined;
      if (!branchId || !ethiopianMonth) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'branchId and ethiopianMonth are required.' },
        });
        return;
      }
      const summary = await superAdminService.getBranchProfitSummary(branchId, ethiopianMonth, year);
      res.json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  }

  async getMonthlyProfitTargets(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const year = req.query.year ? Number(req.query.year) : undefined;
      let branchId = req.query.branchId as string | undefined;
      if (req.user?.role === UserRole.SCHOOL_ADMIN) {
        branchId = req.user.branch_id || branchId;
      }
      const targets = await superAdminService.getMonthlyProfitTargets(branchId, year);
      res.json({ success: true, data: targets });
    } catch (error) {
      next(error);
    }
  }

  async upsertMonthlyProfitTarget(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { branchId, ethiopianMonth, targetAmount, year } = req.body;
      const target = await superAdminService.upsertMonthlyProfitTarget(
        branchId,
        Number(ethiopianMonth),
        Number(targetAmount),
        req.user!.id,
        year ? Number(year) : undefined
      );
      res.json({
        success: true,
        data: target,
        message: 'Profit target saved',
      });
    } catch (error) {
      next(error);
    }
  }

  // Event Management (Super Admin can manage global + all branch events)
  async getEvents(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = (req.query.branchId as string) || null;
      const events = await superAdminService.getEvents(branchId);
      res.json({ success: true, data: events });
    } catch (error) {
      next(error);
    }
  }

  async createEvent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { title, date, type, description, branchId } = req.body;
      const event = await superAdminService.createEvent({
        title, date, type, description,
        branchId: branchId || null,
      });
      res.status(201).json({ success: true, data: event, message: 'Event created successfully' });
    } catch (error) {
      next(error);
    }
  }

  async updateEvent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { title, date, type, description, branchId } = req.body;
      const event = await superAdminService.updateEvent(id, {
        title, date, type, description,
        branchId: branchId !== undefined ? (branchId || null) : undefined,
      });
      res.json({ success: true, data: event, message: 'Event updated successfully' });
    } catch (error) {
      next(error);
    }
  }

  async deleteEvent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await superAdminService.deleteEvent(id);
      res.json({ success: true, message: 'Event deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

export default new SuperAdminController();