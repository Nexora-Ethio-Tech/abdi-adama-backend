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

    let user: any = null;
    const mapRole = (role: string): string => {
      const r = role.toLowerCase();
      if (r === 'clinicadmin') return 'clinic-admin';
      return r;
    };

    if (result.rows.length > 0) {
      user = result.rows[0];
    } else {
      const siloResult = await pool.query(
        `SELECT u.id, u.identity_id, u.role, u.is_active, i.school_id, i.full_name AS name, (SELECT id FROM branches LIMIT 1) AS branch_id
         FROM silo_users u
         JOIN silo_identities i ON u.identity_id = i.id
         WHERE u.id = $1`,
        [decoded.userId]
      );
      if (siloResult.rows.length > 0) {
        const siloRow = siloResult.rows[0];
        user = {
          id: siloRow.id,
          digital_id: siloRow.school_id,
          username: siloRow.school_id,
          name: siloRow.name,
          email: siloRow.school_id,
          role: mapRole(siloRow.role),
          branch_id: siloRow.branch_id,
          status: 'Approved',
          is_active: siloRow.is_active
        };
      }
    }

    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
      return;
    }

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
