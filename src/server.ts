import 'dotenv/config';

import app from './app';
import pool from './config/database';
import logger from './utils/logger';
import ensureScheduleSchema from './scripts/ensureScheduleSchema';
import financeClerkService from './services/financeClerk.service';
import { gregorianToEthiopian } from './shared/ethiopianCalendar';

const PORT = process.env.PORT || 5000;

async function ensureSchemaExtensions(): Promise<void> {
  const fs = require('fs');
  const path = require('path');

  const migrationFiles = [
    '1stcomplete_schemafulldb_dumped.sql',
    '2ndmigration_super_admin_seed.sql',
    '3rd_online_exams_and_ratings.sql',
    '4thfix_schedule_varchar_limits.sql',
    '5th_fix_varchar10_limits.sql',
    '6th_fix_user_deletion_constraints.sql',
    '7th_rename_last_grade_to_last_grade_completed.sql',
    '8th_fix_student_deletion_constraints.sql',
    '9th_add_profile_image.sql',
    '10th_add_actual_paid_to_payroll_items.sql',
    '11th_add_period_number_to_schedules.sql',
    '12th_online_exams_schema.sql',
    '13th_online_exams_anti_cheat.sql',
    '14th_online_exams_unique_constraint.sql',
    '15th_fix_unique_constraints.sql',
    '16th_online_exams_auto_grading.sql',
    '17th_submit_workflow.sql',
    '18th_grade_submissions_unique.sql',
    '19th_add_rating_excellent_to_communication_logs.sql'
  ];

  for (const fileName of migrationFiles) {
    const filePath = path.join(__dirname, '../database/newmigrations', fileName);
    logger.info(`Running migration: ${filePath}`);

    if (fs.existsSync(filePath)) {
      try {
        const schemaSql = fs.readFileSync(filePath, 'utf8');
        await pool.query(schemaSql);
        logger.info(`✅ Successfully applied ${fileName}`);
      } catch (err: any) {
        logger.error(`❌ Failed to run ${fileName}: ${err.message}`);
        throw new Error(`Migration ${fileName} failed: ${err.message}`);
      }
    } else {
      logger.warn(`⚠️ Migration not found at ${filePath}`);
    }
  }
}

async function bootstrap(): Promise<void> {
  try {
    const res = await pool.query('SELECT NOW()');
    logger.info('Database connected successfully');
    logger.info(`Database time: ${res.rows[0].now}`);

    await ensureSchemaExtensions();

    // Ensure email_config has sensible placeholders so the Super Admin UI shows values
    async function ensureEmailConfigDefaults() {
      try {
        const defaults: Record<string, string> = {
          smtp_host: process.env.SMTP_HOST || 'smtp.gmail.com',
          smtp_port: process.env.SMTP_PORT || '587',
          smtp_user: process.env.SMTP_USER || '',
          smtp_from: process.env.SMTP_FROM || (process.env.SMTP_USER || ''),
        };

        for (const [key, value] of Object.entries(defaults)) {
          // Only insert when key is missing; preserve any existing admin-provided values
          await pool.query(
            `INSERT INTO public.email_config (key, value, updated_by, updated_at)
               VALUES ($1, $2, 'system', NOW())
               ON CONFLICT (key) DO NOTHING`,
            [key, value]
          );
        }
        logger.info('Email config defaults ensured');
      } catch (err: any) {
        logger.warn(`Could not ensure email config defaults: ${err.message}`);
      }
    }

    await ensureEmailConfigDefaults();

    // Keep monthly collection statuses fresh for the current month.
    // We sync TWO month strings each run during Pagume:
    //   1. The Gregorian YYYY-MM  (always — baseline cron)
    //   2. The Ethiopian YYYY-13  (only during Pagume = Ethiopian month 13, Sep 6-10)
    //      This ensures every active student gets a collection record for the Pagume
    //      month so the annual Registration Fee billing appears in the dashboard.
    const runCollectionsSync = async () => {
      try {
        const now = new Date();
        const gregMonth = now.toISOString().slice(0, 7);
        const ethDate = gregorianToEthiopian(now);
        const gregMonthNum = now.getMonth() + 1; // 1-based
        const gregYear = now.getFullYear();

        await financeClerkService.syncCollectionStatusesForMonth(gregMonth);
        logger.info(`✅ Finance collections sync completed for Gregorian ${gregMonth}`);

        // During the summer billing window (July, August, or Pagume) sync all three
        // summer-month keys so every active student has Hamle/Nehase/Pagume records.
        if (gregMonthNum === 7 || gregMonthNum === 8 || ethDate.month === 13) {
          const summerMonths: string[] = [
            `${gregYear}-07`,
            `${gregYear}-08`,
            `${ethDate.year}-13`,
          ];
          for (const sm of summerMonths) {
            if (sm !== gregMonth) {
              await financeClerkService.syncCollectionStatusesForMonth(sm);
              logger.info(`✅ Finance collections sync completed for summer month ${sm}`);
            }
          }
        }
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
