import { PoolClient } from 'pg';
import pool from '../config/database';
import { hashPassword, generateRandomPassword, generate4DigitPIN } from '../utils/password';
import { generateDigitalId } from '../utils/idGenerator';
import { USER_STATUS } from '../config/constants';
import logger from '../utils/logger';
import { sendWelcomeEmail } from '../utils/emailService';
import { CreateUserDTO, User, UserFilters, CreateUserResult, UserStatus } from '../types';

// Roles that use 4-digit PIN instead of complex password
const PIN_BASED_ROLES = ['teacher', 'student', 'parent', 'finance-clerk', 'librarian', 'clinic-admin', 'driver'];

// Only these roles receive a welcome email — they are created by the super admin,
// work remotely, and have real email addresses. All other roles (teachers, students,
// etc.) are on-site staff whose credentials are handed to them in person.
const EMAIL_ON_CREATE_ROLES = ['school-admin', 'vice-principal', 'auditor'];

class UserService {
  async createUser(userData: CreateUserDTO, createdBy: string): Promise<CreateUserResult> {
    const { name, email, role, branchId, password, username, grade, staffProfile } = userData;
    const userPassword = password || (PIN_BASED_ROLES.includes(role) ? generate4DigitPIN() : generateRandomPassword());
    const passwordHash = await hashPassword(userPassword);
    const autoApproveRoles = ['super-admin', 'school-admin'];
    const initialStatus = autoApproveRoles.includes(role)
      ? USER_STATUS.APPROVED
      : role === 'student'
        ? USER_STATUS.APPROVED
        : USER_STATUS.PENDING;

    for (let attempt = 1; attempt <= 3; attempt++) {
      const client: PoolClient = await pool.connect();

      try {
        await client.query('BEGIN');

        // Emails are not required to be unique in this system; do not block creation.

        // Generate username: use provided username or derive from email
        let userUsername = username || email.split('@')[0];

        // If no explicit username provided, ensure uniqueness by appending role or suffix
        if (!username) {
          const baseUsername = userUsername;
          let checkUsername = baseUsername;
          let counter = 1;

          // Check if username exists and generate a unique one if needed
          while (true) {
            const usernameCheck = await client.query(
              'SELECT id FROM users WHERE username = $1',
              [checkUsername]
            );

            if (usernameCheck.rows.length === 0) {
              // Username is available
              userUsername = checkUsername;
              break;
            }

            // Username taken, try with suffix (append role or counter)
            if (counter === 1) {
              // First attempt: try appending the role abbreviation
              const roleAbbr = role.substring(0, 3).toLowerCase(); // 'sch', 'vic', 'aud', etc.
              checkUsername = `${baseUsername}_${roleAbbr}`;
            } else {
              // Subsequent attempts: append counter
              checkUsername = `${baseUsername}${counter}`;
            }

            counter++;

            // Prevent infinite loop
            if (counter > 100) {
              const error: any = new Error('Unable to generate unique username');
              error.statusCode = 409;
              error.code = 'USERNAME_GENERATION_FAILED';
              throw error;
            }
          }
        } else {
          // If explicit username provided, check for conflicts
          const usernameCheck = await client.query(
            'SELECT id FROM users WHERE username = $1',
            [userUsername]
          );
          if (usernameCheck.rows.length > 0) {
            const error: any = new Error('A user with this username already exists');
            error.statusCode = 409;
            error.code = 'USERNAME_EXISTS';
            throw error;
          }
        }

        const digitalId = await generateDigitalId(role, branchId || null);

        const userResult = await client.query<User>(
          `INSERT INTO users (digital_id, username, name, email, password_hash, role, branch_id, status, is_active, staff_profile)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING id, digital_id, username, name, email, role, branch_id, status, is_active, staff_profile, created_at`,
          [digitalId, userUsername, name, email, passwordHash, role, branchId, initialStatus, true, staffProfile ? JSON.stringify(staffProfile) : null]
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

        if (EMAIL_ON_CREATE_ROLES.includes(role) && user.email && !user.email.endsWith('@no-reply.local')) {
          sendWelcomeEmail(user.name, user.email, userPassword, user.role).catch((e) => {
            logger.error('Failed to send welcome email:', e);
          });
        }

        return {
          user,
          temporaryPassword: userPassword
        };
      } catch (error: any) {
        await client.query('ROLLBACK');

        const isDigitalIdConflict = error?.code === '23505' && String(error?.detail || error?.message || '').includes('digital_id');
        if (isDigitalIdConflict && attempt < 3) {
          logger.warn(`Digital ID conflict on attempt ${attempt}, retrying user creation...`);
          continue;
        }

        logger.error('Create user error:', error);
        throw error;
      } finally {
        client.release();
      }
    }

    throw new Error('Unable to create user after retrying digital ID generation');
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
      let query = `SELECT u.id, u.digital_id, u.username, u.name, u.email, u.role,
           u.branch_id, u.status, u.is_active, u.staff_profile, u.created_at,
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
          u.branch_id, u.status, u.is_active, u.staff_profile, u.created_at, u.updated_at,
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
