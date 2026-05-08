import { Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import pool from '../config/database';
import { AuthRequest, User } from '../types';

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: {
          code: 'NO_TOKEN',
          message: 'Access token is required'
        }
      });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);

    const result = await pool.query<User>(
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

    const user = result.rows[0];

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
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: error instanceof Error ? error.message : 'Invalid token'
      }
    });
  }
};
