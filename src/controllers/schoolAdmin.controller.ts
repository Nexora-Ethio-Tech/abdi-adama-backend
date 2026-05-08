import { Response, NextFunction } from 'express';
import userService from '../services/user.service';
import { SCHOOL_ADMIN_CREATABLE_ROLES } from '../config/constants';
import { AuthRequest, CreateUserDTO, UserRole } from '../types';

class SchoolAdminController {
  async registerUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { role } = req.body;

      if (!SCHOOL_ADMIN_CREATABLE_ROLES.includes(role as UserRole)) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: `School Admin cannot create users with role: ${role}`
          }
        });
        return;
      }

      const userData: CreateUserDTO = {
        ...req.body,
        branchId: req.user!.branch_id!
      };

      const result = await userService.createUser(userData, req.user!.email);

      res.status(201).json({
        success: true,
        data: result,
        message: `${role} registered successfully`
      });
    } catch (error) {
      next(error);
    }
  }

  async getBranchUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { role, status } = req.query;
      
      const filters: any = {
        branchId: req.user!.branch_id!
      };
      
      if (role) filters.role = role as UserRole;
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

      if (user.branch_id !== req.user!.branch_id) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Cannot access users from other branches'
          }
        });
        return;
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new SchoolAdminController();
