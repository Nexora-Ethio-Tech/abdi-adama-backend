import { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import { verifyAccessToken } from '../utils/jwt';

dotenv.config();

export interface AuthRequest extends Request {
  user?: {
    user_id: string;
    identity_id: string;
    school_id?: string;
    role: string;
    branch_id?: string;
    userId?: string;
  };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ message: 'Authentication token required' });
    return;
  }

  try {
    const payload: any = verifyAccessToken(token);
    req.user = {
      user_id: payload.user_id || payload.userId,
      identity_id: payload.identity_id || payload.digital_id || payload.userId,
      school_id: payload.school_id || payload.schoolId,
      role: payload.role,
      branch_id: payload.branch_id || payload.branchId,
      userId: payload.userId
    };
    next();
  } catch (err) {
    res.status(403).json({ message: 'Invalid or expired token' });
  }
};

export const authorizeRoles = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !req.user.role) {
      res.status(403).json({ message: 'Access denied: insufficient permissions' });
      return;
    }
    const normalizedUserRole = (req.user.role || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const hasRole = roles.some(role => {
      const normalizedRole = role.toLowerCase().replace(/[^a-z0-9]/g, '');
      return normalizedUserRole === normalizedRole;
    });

    if (!hasRole) {
      res.status(403).json({ message: 'Access denied: insufficient permissions' });
      return;
    }
    next();
  };
};

