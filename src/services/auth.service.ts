import pool from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import logger from '../utils/logger';
import { normalizeRole } from '../utils/roleUtils';
import { User, JWTPayload } from '../types';

class AuthService {
  async login(emailOrDigitalId: string, password: string): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    try {
      // 1. Normalize input and perform case-insensitive lookup for email/username
      const lookup = (emailOrDigitalId || '').toString().trim();
      const lookupLower = lookup.toLowerCase();
      let result = await pool.query<User>(
        `SELECT u.id, u.digital_id, u.username, u.name, u.email, u.password_hash, 
                u.role, u.branch_id, u.status, u.is_active,
                b.name as branch_name
         FROM users u
         LEFT JOIN branches b ON b.id = u.branch_id
         WHERE lower(u.email) = $1
            OR lower(u.username) = $1
            OR lower(u.digital_id) = $1
         ORDER BY
           CASE u.role
             WHEN 'super-admin' THEN 1
             WHEN 'school-admin' THEN 2
             ELSE 3
           END
         LIMIT 1`,
        [lookupLower]
      );

      if (result.rows.length === 0) {
        const error: any = new Error('Invalid email or password');
        error.statusCode = 401;
        throw error;
      }

      const user: any = result.rows[0];
      user.role = normalizeRole(user.role) || user.role;

      if (!user.password_hash) {
        const error: any = new Error('Password is not set for this account. Please reset your password or contact support.');
        error.statusCode = 401;
        throw error;
      }

      if (!user.is_active && user.role !== 'student') {
        const error: any = new Error('Account is inactive. Please contact administrator');
        error.statusCode = 403;
        throw error;
      }

      if (user.status === 'Revoked') {
        const error: any = new Error('Access has been revoked. Please contact administrator');
        error.statusCode = 403;
        throw error;
      }

      // Allow students and parents to login with Pending status
      // They can access their portals without waiting for approval
      if (user.status === 'Pending' && !['student', 'parent'].includes(user.role)) {
        const error: any = new Error('Account is pending approval');
        error.statusCode = 403;
        throw error;
      }

      // bcrypt check (ensure non-empty password is provided)
      if (!password) {
        const error: any = new Error('Password is required');
        error.statusCode = 400;
        throw error;
      }
      const isPasswordValid = await comparePassword(password, user.password_hash!);
      if (!isPasswordValid) {
        const error: any = new Error('Invalid credentials');
        error.statusCode = 401;
        throw error;
      }

      if (!user.role) {
        const error: any = new Error('Invalid user role');
        error.statusCode = 500;
        throw error;
      }
      const payload: any = {
        userId: user.id,
        user_id: user.id,
        identity_id: user.id,
        digitalId: user.digital_id,
        digital_id: user.digital_id,
        role: user.role,
        branchId: user.branch_id || '',
        branch_id: user.branch_id || ''
      };

      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken(payload);

      delete user.password_hash;
      user.identity_id = user.id;

      logger.info(`User logged in: ${user.email} (${user.digital_id}) - ${user.role}`);

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
      if (result.rows.length > 0) {
        user = result.rows[0];
        user.role = normalizeRole(user.role) || user.role;
      } else {
        throw new Error('Invalid refresh token');
      }

      if (!user || (!user.is_active && user.role !== 'student')) {
        throw new Error('Invalid refresh token');
      }

      if (!user.role) {
        throw new Error('Invalid refresh token');
      }

      const payload: any = {
        userId: user.id,
        user_id: user.id,
        identity_id: user.id,
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
        const user: any = result.rows[0];
        const normalizedRole = normalizeRole(user.role);
        if (!normalizedRole) {
          throw new Error('Invalid user role');
        }
        user.role = normalizedRole;
        user.identity_id = user.id;
        return user;
      }

      throw new Error('User not found');
    } catch (error) {
      logger.error('Get current user error:', error);
      throw error;
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ message: string }> {
    try {
      // Password comparison and hashing are intentionally outside a database
      // transaction. bcrypt is CPU-intensive and must not occupy a pool client.
      const result = await pool.query<{ password_hash: string }>(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const currentPasswordHash = result.rows[0].password_hash;
      const isValid = await comparePassword(currentPassword, currentPasswordHash);

      if (!isValid) {
        throw new Error('Current password is incorrect');
      }

      const hashedPassword = await hashPassword(newPassword);
      const updateResult = await pool.query(
        `UPDATE users
         SET password_hash = $1, updated_at = NOW()
         WHERE id = $2 AND password_hash = $3`,
        [hashedPassword, userId, currentPasswordHash]
      );

      if (updateResult.rowCount === 0) {
        throw new Error('Password changed in another session. Please try again.');
      }

      logger.info(`Password changed for user: ${userId}`);

      return { message: 'Password changed successfully' };
    } catch (error) {
      logger.error('Change password error:', error);
      throw error;
    }
  }
}

export default new AuthService();
