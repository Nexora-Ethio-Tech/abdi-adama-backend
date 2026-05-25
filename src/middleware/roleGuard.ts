import { Response, NextFunction } from 'express';
import { AuthRequest, UserRole } from '../types';
import logger from '../utils/logger';

export const roleGuard = (allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      logger.warn('roleGuard: No user in request');
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
      return;
    }

    // Normalize both sides for comparison (should already be normalized from auth middleware, but be safe)
    const userRole = (req.user.role || '').toString().toLowerCase().trim().replace(/_/g, '-');
    const allowedRolesList = allowedRoles.map(r => r.toString().toLowerCase().trim().replace(/_/g, '-'));

    if (!allowedRolesList.includes(userRole)) {
      logger.warn(`roleGuard: User ${req.user.email} (${userRole}) denied access. Allowed: ${allowedRolesList.join(', ')}`);
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this resource'
        }
      });
      return;
    }

    logger.info(`roleGuard: User ${req.user.email} (${userRole}) granted access`);
    next();
  };
};
