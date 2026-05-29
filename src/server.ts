import dotenv from 'dotenv';
import app from './app';
import pool from './config/database';
import logger from './utils/logger';
import ensureScheduleSchema from './scripts/ensureScheduleSchema';
import financeClerkService from './services/financeClerk.service';

dotenv.config();

const PORT = process.env.PORT || 5000;

async function ensureSchemaExtensions(): Promise<void> {
  const migrations = [
    // Branches — legacy installs may still be missing the branch code column
    `ALTER TABLE branches ADD COLUMN IF NOT EXISTS code VARCHAR(20)`,
    // Classes — capacity & section columns (from schema_additions.sql)
    `ALTER TABLE classes ADD COLUMN IF NOT EXISTS capacity INT DEFAULT 0`,
    `ALTER TABLE classes ADD COLUMN IF NOT EXISTS section VARCHAR(10)`,
    `ALTER TABLE students ADD COLUMN IF NOT EXISTS requested_aid_amount NUMERIC(12,2)`,
    // Loans — allow pending/approved workflow (fixes loans_status_check on older DBs)
    `ALTER TABLE loans ADD COLUMN IF NOT EXISTS audited_by UUID REFERENCES users(id) ON DELETE SET NULL`,
    `ALTER TABLE loans ADD COLUMN IF NOT EXISTS audited_at TIMESTAMPTZ`,
    `ALTER TABLE loans ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ`,
    `ALTER TABLE loans ADD COLUMN IF NOT EXISTS rejection_reason TEXT`,
    `ALTER TABLE loans DROP CONSTRAINT IF EXISTS loans_status_check`,
    `ALTER TABLE loans ADD CONSTRAINT loans_status_check CHECK (status IN ('pending', 'approved', 'active', 'completed', 'rejected', 'cancelled'))`,
    // Pending applications — new columns used by academic application workflow
    `ALTER TABLE pending_applications ADD COLUMN IF NOT EXISTS applicant_name VARCHAR(200)`,
    `ALTER TABLE pending_applications ADD COLUMN IF NOT EXISTS applicant_email VARCHAR(255)`,
    `ALTER TABLE pending_applications ADD COLUMN IF NOT EXISTS applicant_phone VARCHAR(30)`,
    `ALTER TABLE pending_applications ADD COLUMN IF NOT EXISTS grade_applying VARCHAR(20)`,
    `ALTER TABLE pending_applications ADD COLUMN IF NOT EXISTS parent_phone VARCHAR(30)`,
    `ALTER TABLE pending_applications ADD COLUMN IF NOT EXISTS gender VARCHAR(10)`,
    `ALTER TABLE pending_applications ADD COLUMN IF NOT EXISTS address TEXT`,
    `ALTER TABLE pending_applications ADD COLUMN IF NOT EXISTS notes TEXT`,
    `ALTER TABLE pending_applications ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL`,
    // Missing transcript and application columns
    `ALTER TABLE pending_applications ADD COLUMN IF NOT EXISTS transcript_data BYTEA`,
    `ALTER TABLE pending_applications ADD COLUMN IF NOT EXISTS transcript_mime_type VARCHAR(100)`,
    `ALTER TABLE pending_applications ADD COLUMN IF NOT EXISTS transcript_file_name VARCHAR(255)`,
    `ALTER TABLE pending_applications ADD COLUMN IF NOT EXISTS transcript_file_size BIGINT`,
    `ALTER TABLE pending_applications ADD COLUMN IF NOT EXISTS created_by UUID`,
    // Finance workflow fields
    `ALTER TABLE pending_applications ADD COLUMN IF NOT EXISTS finance_status VARCHAR(20)`,
    `ALTER TABLE pending_applications ADD COLUMN IF NOT EXISTS finance_user_id UUID REFERENCES users(id) ON DELETE SET NULL`,
    `ALTER TABLE pending_applications ADD COLUMN IF NOT EXISTS finance_approved_at TIMESTAMPTZ`,
    `ALTER TABLE pending_applications ADD COLUMN IF NOT EXISTS payment_amount NUMERIC`,
    `ALTER TABLE pending_applications ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(255)`,
    `ALTER TABLE pending_applications ADD COLUMN IF NOT EXISTS student_user_id UUID REFERENCES users(id) ON DELETE SET NULL`,
    `ALTER TABLE pending_applications ADD COLUMN IF NOT EXISTS parent_user_id UUID REFERENCES users(id) ON DELETE SET NULL`,
    `ALTER TABLE pending_applications ADD COLUMN IF NOT EXISTS student_id_generated VARCHAR(255)`,
    `ALTER TABLE pending_applications ADD COLUMN IF NOT EXISTS student_password_temp VARCHAR(255)`,
    `ALTER TABLE pending_applications ADD COLUMN IF NOT EXISTS parent_id_generated VARCHAR(255)`,
    `ALTER TABLE pending_applications ADD COLUMN IF NOT EXISTS parent_password_temp VARCHAR(255)`,
    `ALTER TABLE pending_applications ADD COLUMN IF NOT EXISTS credentials_generated_at TIMESTAMPTZ`,
    `ALTER TABLE pending_applications ADD COLUMN IF NOT EXISTS registration_completed_at TIMESTAMPTZ`,
    `DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'pending_applications' AND column_name = 'name'
        ) THEN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'pending_applications' AND column_name = 'applicant_name'
          ) THEN
            UPDATE pending_applications
            SET applicant_name = name
            WHERE applicant_name IS NULL AND name IS NOT NULL;
            ALTER TABLE pending_applications ALTER COLUMN name DROP NOT NULL;
          ELSE
            ALTER TABLE pending_applications RENAME COLUMN name TO applicant_name;
          END IF;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'pending_applications' AND column_name = 'email'
        ) THEN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'pending_applications' AND column_name = 'applicant_email'
          ) THEN
            UPDATE pending_applications
            SET applicant_email = email
            WHERE applicant_email IS NULL AND email IS NOT NULL;
            ALTER TABLE pending_applications ALTER COLUMN email DROP NOT NULL;
          ELSE
            ALTER TABLE pending_applications RENAME COLUMN email TO applicant_email;
          END IF;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'pending_applications' AND column_name = 'phone'
        ) THEN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'pending_applications' AND column_name = 'applicant_phone'
          ) THEN
            UPDATE pending_applications
            SET applicant_phone = phone
            WHERE applicant_phone IS NULL AND phone IS NOT NULL;
            ALTER TABLE pending_applications ALTER COLUMN phone DROP NOT NULL;
          ELSE
            ALTER TABLE pending_applications RENAME COLUMN phone TO applicant_phone;
          END IF;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'pending_applications' AND column_name = 'last_grade'
        ) THEN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'pending_applications' AND column_name = 'grade_applying'
          ) THEN
            UPDATE pending_applications
            SET grade_applying = last_grade
            WHERE grade_applying IS NULL AND last_grade IS NOT NULL;
            ALTER TABLE pending_applications ALTER COLUMN last_grade DROP NOT NULL;
          ELSE
            ALTER TABLE pending_applications RENAME COLUMN last_grade TO grade_applying;
          END IF;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'pending_applications' AND column_name = 'date'
        ) THEN
          ALTER TABLE pending_applications ALTER COLUMN date DROP NOT NULL;
        END IF;
      END$$;`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS staff_profile JSONB`,
    // Library book code column (used for human-friendly Book ID like BK-1234)
    `ALTER TABLE library_books ADD COLUMN IF NOT EXISTS book_code VARCHAR(50)`,
    // Grading configurations table
    `CREATE TABLE IF NOT EXISTS grading_configs (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      grade_level VARCHAR(20)  NOT NULL,
      method_id   VARCHAR(30)  NOT NULL,
      label       VARCHAR(50)  NOT NULL,
      max_weight  INT          NOT NULL,
      created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      UNIQUE(grade_level, method_id)
    )`,
    // Seed default grading configs if table is empty
    `INSERT INTO grading_configs (grade_level, method_id, label, max_weight)
     SELECT grade_level, method_id, label, max_weight FROM (VALUES
       ('default', 'mid',        'Mid-Exam',       30),
       ('default', 'final',      'Final-Exam',     50),
       ('default', 'quiz',       'Quiz',           10),
       ('default', 'assignment', 'Assignment',     10),
       ('10',      'mid',        'Mid-Exam',       30),
       ('10',      'final',      'Final-Exam',     40),
       ('10',      'quiz',       'Quiz',           10),
       ('10',      'classwork',  'Class-Work',     10),
       ('10',      'activity',   'Class Activity', 10),
       ('9',       'mid',        'Mid-Exam',       25),
       ('9',       'final',      'Final-Exam',     50),
       ('9',       'homework',   'Home-Work',      15),
       ('9',       'test',       'Test',           10)
     ) AS v(grade_level, method_id, label, max_weight)
     WHERE NOT EXISTS (SELECT 1 FROM grading_configs)`,
    // Grades table
    `CREATE TABLE IF NOT EXISTS grades (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id  UUID          NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      course_id   UUID          NOT NULL REFERENCES courses(id)  ON DELETE CASCADE,
      type        VARCHAR(30)   NOT NULL,
      weight      VARCHAR(10),
      score       NUMERIC(6,2),
      total       NUMERIC(6,2)  NOT NULL,
      created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
    )`,
    // Driver Notifications — tracks driver-posted alerts with 3-day auto-purge
    `CREATE TABLE IF NOT EXISTS driver_notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      driver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      message TEXT NOT NULL,
      target_route VARCHAR(255),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMPTZ
    )`,
    `CREATE INDEX IF NOT EXISTS idx_driver_notifications_driver_id ON driver_notifications(driver_id)`,
    `CREATE INDEX IF NOT EXISTS idx_driver_notifications_created_at ON driver_notifications(created_at)`,
    // Payments and collections for finance module
    `CREATE TABLE IF NOT EXISTS payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      payer_id UUID REFERENCES users(id) ON DELETE SET NULL,
      branch_id UUID,
      month VARCHAR(7),
      date DATE DEFAULT CURRENT_DATE,
      total_amount NUMERIC NOT NULL,
      reference VARCHAR(255),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_payments_student_month ON payments(student_id, month)`,
    `CREATE TABLE IF NOT EXISTS finance_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      student_name VARCHAR(150) NOT NULL,
      amount NUMERIC(12,2) NOT NULL,
      type VARCHAR(150) NOT NULL,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      verified_by VARCHAR(150),
      branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_finance_transactions_branch_date ON finance_transactions(branch_id, date)`,
    `CREATE INDEX IF NOT EXISTS idx_finance_transactions_student_id ON finance_transactions(student_id)`,
    `CREATE TABLE IF NOT EXISTS assets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      description TEXT,
      amount INTEGER NOT NULL DEFAULT 1,
      value NUMERIC(12,2) NOT NULL,
      branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `ALTER TABLE assets ADD COLUMN IF NOT EXISTS amount INTEGER NOT NULL DEFAULT 1`,
    `CREATE TABLE IF NOT EXISTS payment_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
      fee_type VARCHAR(100) NOT NULL,
      amount NUMERIC NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_payment_items_fee_type ON payment_items(fee_type)`,
    `CREATE TABLE IF NOT EXISTS student_collections (
      student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      month VARCHAR(7) NOT NULL,
      due_date DATE,
      status VARCHAR(20) NOT NULL DEFAULT 'in_collections',
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (student_id, month)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_student_collections_month ON student_collections(month)`,
  ];

  for (const sql of migrations) {
    try {
      await pool.query(sql);
    } catch (err: any) {
      logger.warn(`Schema migration skipped: ${sql.slice(0, 60)}... — ${err.message}`);
    }
  }

  // Run payroll and schedule schema migrations dynamically from database/*.sql
  try {
    const fs = require('fs');
    const path = require('path');

    const runSchemaFile = async (fileName: string, label: string) => {
      const schemaPath = path.join(__dirname, '../database', fileName);
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await pool.query(schemaSql);
        logger.info(`✅ ${label} database schema verified and updated`);
      } else {
        logger.warn(`⚠️ ${label} schema file not found at: ${schemaPath}`);
      }
    };

    await runSchemaFile('payroll_schema.sql', 'Payroll');
    await runSchemaFile('loan_workflow_migration.sql', 'Loan workflow');
    await runSchemaFile('schedule_schema.sql', 'Schedule Builder');
    await runSchemaFile('email_smtp_migration.sql', 'Email / SMTP');
    await runSchemaFile('system_settings_migration.sql', 'System settings');
    await runSchemaFile('finance_transactions_schema.sql', 'Finance Transactions');
    // Migration to remove UNIQUE constraint on users.email so duplicate emails are allowed
    await runSchemaFile('remove_email_unique.sql', 'Remove email UNIQUE constraint');
  } catch (err: any) {
    logger.error('❌ Failed to run schema migrations:', err);
  }

  logger.info('✅ Schema extensions verified');
}

async function bootstrap(): Promise<void> {
  try {
    const res = await pool.query('SELECT NOW()');
    logger.info('Database connected successfully');
    logger.info(`Database time: ${res.rows[0].now}`);

    await ensureSchemaExtensions();
    await ensureScheduleSchema();

    // Keep monthly collections statuses fresh for current month
    const runCollectionsSync = async () => {
      try {
        const month = new Date().toISOString().slice(0, 7);
        await financeClerkService.syncCollectionStatusesForMonth(month);
        logger.info(`✅ Finance collections sync completed for ${month}`);
      } catch (err: any) {
        logger.warn(`⚠️ Finance collections sync failed: ${err.message}`);
      }
    };

    await runCollectionsSync();
    const collectionsSyncInterval = setInterval(runCollectionsSync, 60 * 60 * 1000);

    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
    });

    process.on('SIGTERM', () => {
      logger.info('SIGTERM signal received: closing HTTP server');
      clearInterval(collectionsSyncInterval);
      server.close(() => {
        logger.info('HTTP server closed');
        pool.end(() => {
          logger.info('Database pool closed');
          process.exit(0);
        });
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT signal received: closing HTTP server');
      clearInterval(collectionsSyncInterval);
      server.close(() => {
        logger.info('HTTP server closed');
        pool.end(() => {
          logger.info('Database pool closed');
          process.exit(0);
        });
      });
    });
  } catch (error) {
    logger.error('Database connection failed:', error);
    process.exit(1);
  }
}

bootstrap();
