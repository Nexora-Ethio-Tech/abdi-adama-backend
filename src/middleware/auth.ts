import { Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import pool from '../config/database';
import { AuthRequest, UserRole, User } from '../types';
import logger from '../utils/logger';
import { normalizeRole } from '../utils/roleUtils';

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const queryToken = typeof req.query.token === 'string' ? req.query.token : undefined;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (queryToken) {
      token = queryToken;
    }

    if (!token) {
      res.status(401).json({
        success: false,
        error: {
          code: 'NO_TOKEN',
          message: 'Access token is required'
        }
      });
      return;
    }
    const decoded = verifyAccessToken(token);

    let result = await pool.query<User>(
      `SELECT id, digital_id, username, name, email, role, branch_id, status, is_active 
       FROM users WHERE id = $1`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
      return;
    }

    const user: any = result.rows[0];

    // Normalize role to standard format
    const normalizedRole = normalizeRole(user.role);
    if (!normalizedRole) {
      logger.error(`Invalid role for user ${user.id}: ${user.role}`);
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_ROLE',
          message: 'Invalid user role'
        }
      });
      return;
    }

    user.role = normalizedRole;

    if (!user.is_active) {
      res.status(403).json({
        success: false,
        error: {
          code: 'USER_INACTIVE',
          message: 'User account is inactive'
        }
      });
      return;
    }

    if (user.status === 'Revoked') {
      res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_REVOKED',
          message: 'User access has been revoked'
        }
      });
      return;
    }

    req.user = user;
    logger.info(`User authenticated: ${user.email} (${user.role}, branch: ${user.branch_id || 'N/A'})`);
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: error instanceof Error ? error.message : 'Invalid token'
      }
    });
  }
};

/**
 * Middleware to validate branch-specific operations
 * Ensures branch_id exists for roles that need it
 */
export const requireBranchId = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const branchRequiredRoles = [
    UserRole.SCHOOL_ADMIN,
    UserRole.VICE_PRINCIPAL,
    UserRole.FINANCE_CLERK,
    UserRole.TEACHER,
    UserRole.LIBRARIAN,
    UserRole.CLINIC_ADMIN
  ];

  if (branchRequiredRoles.includes(req.user?.role as UserRole)) {
    if (!req.user?.branch_id) {
      logger.error(`User ${req.user?.email} (${req.user?.role}) missing branch_id`);
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_BRANCH',
          message: 'User must have a branch assigned'
        }
      });
      return;
    }
  }
  next();
};
