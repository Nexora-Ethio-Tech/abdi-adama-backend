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

  // Branch Management
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

  // System Reports
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

  // Academic Year Management
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

  // Class Capacity
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

  // Dashboard
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
}

export default new SuperAdminController();
