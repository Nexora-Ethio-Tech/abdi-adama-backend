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

    let result = await pool.query<User>(
      `SELECT id, digital_id, username, name, email, role, branch_id, status, is_active 
       FROM users WHERE id = $1`,
      [decoded.userId]
    );

    const mapRole = (role: string): string => {
      if (!role) return '';
      // Normalize common DB variants to the hyphenated role slugs used across the app
      let r = role.toString().toLowerCase().trim();
      r = r.replace(/[_\s]+/g, '-');
      // Handle common compacted forms
      if (r === 'clinicadmin' || r === 'clinic-admin') return 'clinic-admin';
      if (r === 'financeadmin' || r === 'finance-admin' || r === 'finance_clerk') return 'finance-clerk';
      if (r === 'viceprincipal' || r === 'vice-principal') return 'vice-principal';
      if (r === 'schooladmin' || r === 'school-admin') return 'school-admin';
      if (r === 'superadmin' || r === 'super-admin') return 'super-admin';
      if (r === 'audit' || r === 'auditor') return 'auditor';
      if (r === 'driver') return 'driver';
      // Default: ensure hyphenated form
      return r.replace(/_/g, '-');
    };

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
    // Normalize role to lowercase-hyphen format before roleGuard comparison
    user.role = mapRole(user.role as string) as any;

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
