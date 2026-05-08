import dotenv from 'dotenv';
import { PoolClient } from 'pg';
import pool from '../config/database';
import { hashPassword } from '../utils/password';
import logger from '../utils/logger';
import { UserRole, UserStatus } from '../types';

dotenv.config();

interface InitialAccount {
  digitalId: string;
  username: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  branchId?: string | null;
  branchName?: string;
  status: UserStatus;
}

const INITIAL_ACCOUNTS: InitialAccount[] = [
  {
    digitalId: 'SA-001',
    username: 'superadmin',
    name: 'Super Administrator',
    email: 'abdiadamaschooloffice@gmail.com',
    password: 'SuperAdmin@2026',
    role: UserRole.SUPER_ADMIN,
    branchId: null,
    status: UserStatus.APPROVED
  },
  {
    digitalId: 'ADM-MB-001',
    username: 'schooladmin',
    name: 'School Administrator',
    email: '65plante@gmail.com',
    password: 'SchoolAdmin@2026',
    role: UserRole.SCHOOL_ADMIN,
    branchName: 'Main Branch',
    status: UserStatus.APPROVED
  },
  {
    digitalId: 'VP-MB-001',
    username: 'viceprincipal',
    name: 'Vice Principal',
    email: 'valerioero@gmail.com',
    password: 'VicePrincipal@2026',
    role: UserRole.VICE_PRINCIPAL,
    branchName: 'Main Branch',
    status: UserStatus.APPROVED
  },
  {
    digitalId: 'AUD-MB-001',
    username: 'auditor',
    name: 'System Auditor',
    email: 'hailegit35@gmail.com',
    password: 'Auditor@2026',
    role: UserRole.AUDITOR,
    branchName: 'Main Branch',
    status: UserStatus.APPROVED
  }
];

async function seedSuperAdmin(): Promise<void> {
  const client: PoolClient = await pool.connect();
  
  try {
    logger.info('🌱 Starting Super Admin seeding...');

    await client.query('BEGIN');

    for (const account of INITIAL_ACCOUNTS) {
      const existingUser = await client.query(
        'SELECT id, email FROM users WHERE email = $1',
        [account.email]
      );

      if (existingUser.rows.length > 0) {
        logger.info(`⏭️  User already exists: ${account.email}`);
        continue;
      }

      let branchId = account.branchId;
      if (account.branchName) {
        const branchResult = await client.query<{ id: string }>(
          'SELECT id FROM branches WHERE name = $1',
          [account.branchName]
        );
        
        if (branchResult.rows.length === 0) {
          logger.error(`❌ Branch not found: ${account.branchName}`);
          continue;
        }
        
        branchId = branchResult.rows[0].id;
      }

      const passwordHash = await hashPassword(account.password);

      const result = await client.query(
        `INSERT INTO users (digital_id, username, name, email, password_hash, role, branch_id, status, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, digital_id, name, email, role`,
        [
          account.digitalId,
          account.username,
          account.name,
          account.email,
          passwordHash,
          account.role,
          branchId,
          account.status,
          true
        ]
      );

      logger.info(`✅ Created user: ${result.rows[0].email} (${result.rows[0].role})`);
      logger.info(`   Digital ID: ${result.rows[0].digital_id}`);
      logger.info(`   Password: ${account.password}`);
    }

    await client.query('COMMIT');

    logger.info('');
    logger.info('🎉 Super Admin seeding completed successfully!');
    logger.info('');
    logger.info('📋 Login Credentials:');
    logger.info('═══════════════════════════════════════════════════════════');
    INITIAL_ACCOUNTS.forEach(account => {
      logger.info(`${account.role.toUpperCase()}`);
      logger.info(`  Email: ${account.email}`);
      logger.info(`  Password: ${account.password}`);
      logger.info(`  Digital ID: ${account.digitalId}`);
      logger.info('───────────────────────────────────────────────────────────');
    });
    logger.info('');
    logger.info('⚠️  IMPORTANT: Change these passwords after first login!');
    logger.info('');

    process.exit(0);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedSuperAdmin();
