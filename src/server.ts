import dotenv from 'dotenv';
import app from './app';
import pool from './config/database';
import logger from './utils/logger';

dotenv.config();

const PORT = process.env.PORT || 5000;

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    logger.error('Database connection failed:', err);
    process.exit(1);
  }
  logger.info('Database connected successfully');
  logger.info(`Database time: ${res.rows[0].now}`);
});

// Ensure schema extensions are applied (idempotent: safe to run every boot)
async function ensureSchemaExtensions(): Promise<void> {
  const migrations = [
    // Classes — capacity & section columns (from schema_additions.sql)
    `ALTER TABLE classes ADD COLUMN IF NOT EXISTS capacity INT DEFAULT 0`,
    `ALTER TABLE classes ADD COLUMN IF NOT EXISTS section VARCHAR(10)`,
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
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS staff_profile JSONB`,
    // Library book code column (used for human-friendly Book ID like BK-1234)
    `ALTER TABLE library_books ADD COLUMN IF NOT EXISTS book_code VARCHAR(50)`,
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
  ];

  for (const sql of migrations) {
    try {
      await pool.query(sql);
    } catch (err: any) {
      // Log but don't crash — columns may already exist under a different constraint
      logger.warn(`Schema migration skipped: ${sql.slice(0, 60)}... — ${err.message}`);
    }
  }

  // Run payroll schema migration dynamically from database/payroll_schema.sql
  try {
    const fs = require('fs');
    const path = require('path');
    const schemaPath = path.join(__dirname, '../database/payroll_schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(schemaSql);
      logger.info('✅ Payroll database schema verified and updated');
    } else {
      logger.warn('⚠️ Payroll schema file not found at: ' + schemaPath);
    }
  } catch (err: any) {
    logger.error('❌ Failed to run payroll schema migration:', err);
  }

  logger.info('✅ Schema extensions verified');
}

ensureSchemaExtensions();

const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
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
  server.close(() => {
    logger.info('HTTP server closed');
    pool.end(() => {
      logger.info('Database pool closed');
      process.exit(0);
    });
  });
});
