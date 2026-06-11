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
    '19th_add_rating_excellent_to_communication_logs.sql',
    '20th_add_audience_to_notices.sql',
    '21st_add_category_to_notices.sql',
    '22nd_add_overall_rating_score_to_teachers.sql'
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

    // Automatically reconcile any unlinked payment-confirmed applications.
    // This self-heals the production database on every server restart —
    // no manual SQL scripts required.
    async function reconcileUnlinkedApplications() {
      try {
        const appRes = await pool.query(
          `SELECT id, applicant_name, applicant_email, grade_applying, branch_id, parent_user_id
           FROM pending_applications
           WHERE status = 'payment-confirmed' AND student_user_id IS NULL`
        );

        if (appRes.rows.length === 0) {
          logger.info('[reconcile] All payment-confirmed applications are already linked. Nothing to do.');
          return;
        }

        logger.info(`[reconcile] Found ${appRes.rows.length} unlinked payment-confirmed application(s). Healing...`);

        // Lazy-require to avoid circular dependency
        const userServiceInstance = require('./services/user.service').default;
        const genPlaceholderEmail = (prefix: string) =>
          `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}@no-reply.local`;

        for (const app of appRes.rows) {
          logger.info(`[reconcile] Healing application ${app.id} for "${app.applicant_name}"`);

          if (!app.parent_user_id) {
            logger.warn(`[reconcile] Skipping application ${app.id} — parent_user_id is missing.`);
            continue;
          }

          // Try to find an already-created student account by email, then by name+branch
          let studentUserId: string | null = null;

          if (app.applicant_email) {
            const byEmail = await pool.query(
              `SELECT id FROM users WHERE email = $1 AND role = 'student' LIMIT 1`,
              [app.applicant_email]
            );
            if (byEmail.rows.length > 0) {
              studentUserId = byEmail.rows[0].id;
              logger.info(`[reconcile] Found existing student by email: ${studentUserId}`);
            }
          }

          if (!studentUserId) {
            const byName = await pool.query(
              `SELECT id FROM users WHERE name = $1 AND role = 'student' AND branch_id = $2 LIMIT 1`,
              [app.applicant_name, app.branch_id]
            );
            if (byName.rows.length > 0) {
              studentUserId = byName.rows[0].id;
              logger.info(`[reconcile] Found existing student by name: ${studentUserId}`);
            }
          }

          if (!studentUserId) {
            const studentEmail = app.applicant_email || genPlaceholderEmail('student');
            logger.info(`[reconcile] Creating new student account with email: ${studentEmail}`);
            const created = await userServiceInstance.createUser(
              {
                name: app.applicant_name,
                email: studentEmail,
                role: 'student',
                branchId: app.branch_id,
                grade: app.grade_applying || '1',
              },
              'system-reconcile'
            );
            studentUserId = created.user.id;
          }

          const studentRow = await pool.query(
            'SELECT id FROM students WHERE user_id = $1 LIMIT 1',
            [studentUserId]
          );
          if (studentRow.rows.length === 0) {
            logger.error(`[reconcile] No students row for user ${studentUserId}. Skipping.`);
            continue;
          }
          const studentId = studentRow.rows[0].id;

          const parentRow = await pool.query(
            'SELECT id FROM parents WHERE user_id = $1 LIMIT 1',
            [app.parent_user_id]
          );
          if (parentRow.rows.length === 0) {
            logger.error(`[reconcile] No parents row for user ${app.parent_user_id}. Skipping.`);
            continue;
          }
          const parentId = parentRow.rows[0].id;

          await pool.query(
            `UPDATE pending_applications SET student_user_id = $1, updated_at = NOW() WHERE id = $2`,
            [studentUserId, app.id]
          );

          await pool.query(
            `INSERT INTO parent_student (parent_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [parentId, studentId]
          );

          logger.info(`[reconcile] ✅ Linked student "${app.applicant_name}" (${studentId}) → parent (${parentId})`);
        }
      } catch (err: any) {
        logger.error(`[reconcile] Auto-reconciliation error: ${err.message}`);
      }
    }

    await reconcileUnlinkedApplications();

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

        // During the summer billing window (Hamle=11, Nehase=12, Pagume=13) sync all three
        // summer-month keys so every active student has Hamle/Nehase/Pagume records.
        if (ethDate.month === 11 || ethDate.month === 12 || ethDate.month === 13) {
          const summerMonths: string[] = [
            `${ethDate.year}-11`,
            `${ethDate.year}-12`,
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
