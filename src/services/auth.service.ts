import { PoolClient } from 'pg';
import pool from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import logger from '../utils/logger';
import { User, JWTPayload } from '../types';

class AuthService {
  async login(email: string, password: string): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    try {
      // 1. Check standard users first
      let result = await pool.query<User>(
        `SELECT u.id, u.digital_id, u.username, u.name, u.email, u.password_hash, 
                u.role, u.branch_id, u.status, u.is_active
         FROM users u
         WHERE u.email = $1 OR u.username = $1`,
        [email]
      );

      let user: any = null;
      let isSiloUser = false;
      let identityId = '';

      const mapRole = (role: string): string => {
        const r = role.toLowerCase();
        if (r === 'clinicadmin') return 'clinic-admin';
        return r;
      };

      if (result.rows.length > 0) {
        user = result.rows[0];
      } else {
        // 2. Check silo_users if not found in standard users
        const cleanInput = email.replace('-MB-', '-');
        const siloResult = await pool.query(
          `SELECT u.id, u.identity_id, u.role, u.password_hash, u.is_active, 
                  i.school_id, i.full_name AS name, (SELECT id FROM branches LIMIT 1) AS branch_id
           FROM silo_users u
           JOIN silo_identities i ON u.identity_id = i.id
           WHERE i.school_id = $1 
              OR REPLACE(i.school_id, '-MB-', '-') = $1
              OR i.school_id = $2
              OR REPLACE(i.school_id, '-MB-', '-') = $2`,
          [email, cleanInput]
        );

        if (siloResult.rows.length > 0) {
          const siloRow = siloResult.rows[0];
          identityId = siloRow.identity_id;
          const normalizedRole = mapRole(siloRow.role);
          user = {
            id: siloRow.id,
            digital_id: siloRow.school_id,
            username: siloRow.school_id,
            name: siloRow.name,
            email: siloRow.school_id,
            password_hash: siloRow.password_hash,
            role: normalizedRole,
            branch_id: siloRow.branch_id,
            status: 'Approved',
            is_active: siloRow.is_active
          };
          isSiloUser = true;
        }
      }

      if (!user) {
        throw new Error('Invalid email or password');
      }

      if (!user.is_active) {
        throw new Error('Account is inactive. Please contact administrator');
      }

      if (user.status === 'Revoked') {
        throw new Error('Access has been revoked. Please contact administrator');
      }

      if (user.status === 'Pending') {
        throw new Error('Account is pending approval');
      }

      // bcrypt check
      const isPasswordValid = await comparePassword(password, user.password_hash!);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      const payload: any = {
        userId: user.id,
        user_id: user.id,
        digitalId: user.digital_id,
        digital_id: user.digital_id,
        school_id: user.digital_id,
        identityId: identityId,
        identity_id: identityId,
        role: user.role,
        branchId: user.branch_id || '',
        branch_id: user.branch_id || ''
      };

      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken(payload);

      delete user.password_hash;

      logger.info(`User logged in: ${user.email} (${user.role})`);

      return {
        user,
        accessToken,
        refreshToken
      };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const decoded = verifyRefreshToken(refreshToken);

      let result = await pool.query<User>(
        `SELECT id, digital_id, role, branch_id, is_active, status 
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
          `SELECT u.id, u.role, u.is_active, i.school_id, (SELECT id FROM branches LIMIT 1) AS branch_id
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
            role: mapRole(siloRow.role),
            branch_id: siloRow.branch_id,
            is_active: siloRow.is_active,
            status: 'Approved'
          };
        }
      }

      if (!user || !user.is_active) {
        throw new Error('Invalid refresh token');
      }

      const payload: any = {
        userId: user.id,
        user_id: user.id,
        digitalId: user.digital_id,
        digital_id: user.digital_id,
        school_id: user.digital_id,
        role: user.role,
        branchId: user.branch_id || '',
        branch_id: user.branch_id || ''
      };

      const newAccessToken = generateAccessToken(payload);

      return { accessToken: newAccessToken };
    } catch (error) {
      logger.error('Refresh token error:', error);
      throw error;
    }
  }

  async getCurrentUser(userId: string): Promise<User> {
    try {
      const result = await pool.query<User>(
        `SELECT u.id, u.digital_id, u.username, u.name, u.email, u.role, 
                u.branch_id, u.status, u.is_active, u.created_at,
                b.name as branch_name
         FROM users u
         LEFT JOIN branches b ON b.id = u.branch_id
         WHERE u.id = $1`,
         [userId]
      );

      if (result.rows.length > 0) {
        return result.rows[0];
      }

      // Check silo_users
      const siloResult = await pool.query(
        `SELECT u.id, u.identity_id, u.role, u.is_active, i.school_id, i.full_name AS name, (SELECT id FROM branches LIMIT 1) AS branch_id
         FROM silo_users u
         JOIN silo_identities i ON u.identity_id = i.id
         WHERE u.id = $1`,
        [userId]
      );

      if (siloResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const siloRow = siloResult.rows[0];
      const mapRole = (role: string): string => {
        const r = role.toLowerCase();
        if (r === 'clinicadmin') return 'clinic-admin';
        return r;
      };

      return {
        id: siloRow.id,
        digital_id: siloRow.school_id,
        username: siloRow.school_id,
        name: siloRow.name,
        email: siloRow.school_id,
        role: mapRole(siloRow.role) as any,
        branch_id: siloRow.branch_id,
        status: 'Approved' as any,
        is_active: siloRow.is_active,
        created_at: new Date()
      } as any;
    } catch (error) {
      logger.error('Get current user error:', error);
      throw error;
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const client: PoolClient = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const result = await client.query<{ password_hash: string }>(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const isValid = await comparePassword(currentPassword, result.rows[0].password_hash);
      
      if (!isValid) {
        throw new Error('Current password is incorrect');
      }

      const hashedPassword = await hashPassword(newPassword);

      await client.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [hashedPassword, userId]
      );

      await client.query('COMMIT');

      logger.info(`Password changed for user: ${userId}`);

      return { message: 'Password changed successfully' };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Change password error:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new AuthService();
