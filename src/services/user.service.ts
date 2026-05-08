import { PoolClient } from 'pg';
import pool from '../config/database';
import { hashPassword, generateRandomPassword } from '../utils/password';
import { generateDigitalId } from '../utils/idGenerator';
import { USER_STATUS } from '../config/constants';
import logger from '../utils/logger';
import { CreateUserDTO, User, UserFilters, CreateUserResult, UserStatus } from '../types';

class UserService {
  async createUser(userData: CreateUserDTO, createdBy: string): Promise<CreateUserResult> {
    const client: PoolClient = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const { name, email, role, branchId, password, username, grade } = userData;

      let branchName: string | null = null;
      if (branchId) {
        const branchResult = await client.query<{ name: string }>(
          'SELECT name FROM branches WHERE id = $1',
          [branchId]
        );
        branchName = branchResult.rows[0]?.name || null;
      }

      const digitalId = await generateDigitalId(role, branchName);
      const userPassword = password || generateRandomPassword();
      const passwordHash = await hashPassword(userPassword);
      const userUsername = username || email.split('@')[0];

      const userResult = await client.query<User>(
        `INSERT INTO users (digital_id, username, name, email, password_hash, role, branch_id, status, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, digital_id, username, name, email, role, branch_id, status, is_active, created_at`,
        [digitalId, userUsername, name, email, passwordHash, role, branchId, USER_STATUS.PENDING, true]
      );

      const user = userResult.rows[0];

      if (role === 'teacher') {
        await client.query(
          `INSERT INTO teachers (user_id, branch_id) VALUES ($1, $2)`,
          [user.id, branchId]
        );
      } else if (role === 'student') {
        await client.query(
          `INSERT INTO students (user_id, branch_id, grade, status) VALUES ($1, $2, $3, $4)`,
          [user.id, branchId, grade || 'Not Assigned', 'Active']
        );
      } else if (role === 'parent') {
        await client.query(
          `INSERT INTO parents (user_id, branch_id) VALUES ($1, $2)`,
          [user.id, branchId]
        );
      }

      await client.query('COMMIT');

      logger.info(`User created: ${user.email} (${role}) by ${createdBy}`);

      return {
        user,
        temporaryPassword: password ? null : userPassword
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Create user error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async updateUserStatus(userId: string, status: UserStatus, updatedBy: string): Promise<User> {
    try {
      const result = await pool.query<User>(
        `UPDATE users SET status = $1, updated_at = NOW() 
         WHERE id = $2
         RETURNING id, digital_id, name, email, role, status`,
        [status, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      logger.info(`User status updated: ${userId} to ${status} by ${updatedBy}`);

      return result.rows[0];
    } catch (error) {
      logger.error('Update user status error:', error);
      throw error;
    }
  }

  async deleteUser(userId: string, deletedBy: string): Promise<{ message: string }> {
    const client: PoolClient = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const result = await client.query<{ email: string; role: string }>(
        'DELETE FROM users WHERE id = $1 RETURNING email, role',
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      await client.query('COMMIT');

      logger.info(`User deleted: ${result.rows[0].email} by ${deletedBy}`);

      return { message: 'User deleted successfully' };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Delete user error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getUsers(filters: UserFilters = {}): Promise<User[]> {
    try {
      let query = `
        SELECT u.id, u.digital_id, u.username, u.name, u.email, u.role, 
               u.branch_id, u.status, u.is_active, u.created_at,
               b.name as branch_name
        FROM users u
        LEFT JOIN branches b ON b.id = u.branch_id
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramCount = 1;

      if (filters.role) {
        query += ` AND u.role = $${paramCount}`;
        params.push(filters.role);
        paramCount++;
      }

      if (filters.branchId) {
        query += ` AND u.branch_id = $${paramCount}`;
        params.push(filters.branchId);
        paramCount++;
      }

      if (filters.status) {
        query += ` AND u.status = $${paramCount}`;
        params.push(filters.status);
        paramCount++;
      }

      query += ' ORDER BY u.created_at DESC';

      const result = await pool.query<User>(query, params);

      return result.rows;
    } catch (error) {
      logger.error('Get users error:', error);
      throw error;
    }
  }

  async getUserById(userId: string): Promise<User> {
    try {
      const result = await pool.query<User>(
        `SELECT u.id, u.digital_id, u.username, u.name, u.email, u.role, 
                u.branch_id, u.status, u.is_active, u.created_at, u.updated_at,
                b.name as branch_name
         FROM users u
         LEFT JOIN branches b ON b.id = u.branch_id
         WHERE u.id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Get user by ID error:', error);
      throw error;
    }
  }
}

export default new UserService();
