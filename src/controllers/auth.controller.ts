import { Response, NextFunction } from 'express';
import authService from '../services/auth.service';
import { AuthRequest, LoginDTO, ChangePasswordDTO } from '../types';
import { databaseUnavailableResponse, isDatabaseAvailabilityError } from '../utils/publicError';

class AuthController {
  async login(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body as LoginDTO;
      // email field now accepts both email and digital_id
      const result = await authService.login(email, password);

      res.json({
        success: true,
        data: result,
        message: 'Login successful'
      });
    } catch (error) {
      // If the service threw a known error with statusCode, return it explicitly
      const err: any = error;
      if (isDatabaseAvailabilityError(err)) {
        res.status(databaseUnavailableResponse.status).json({
          success: false,
          error: {
            code: databaseUnavailableResponse.code,
            message: databaseUnavailableResponse.message,
          },
        });
        return;
      }

      const status = err.statusCode || 500;
      res.status(status).json({
        success: false,
        error: {
          code: err.code || (status === 500 ? 'INTERNAL_ERROR' : 'AUTH_ERROR'),
          message: err.message || 'Authentication failed'
        }
      });
    }
  }

  async refreshToken(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_TOKEN',
            message: 'Refresh token is required'
          }
        });
        return;
      }

      const result = await authService.refreshToken(refreshToken);

      res.json({
        success: true,
        data: result,
        message: 'Token refreshed successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async getCurrentUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.getCurrentUser(req.user!.id);

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body as ChangePasswordDTO;
      const result = await authService.changePassword(req.user!.id, currentPassword, newPassword);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(_req: AuthRequest, res: Response): Promise<void> {
    res.json({
      success: true,
      message: 'Logout successful'
    });
  }
}

export default new AuthController();
