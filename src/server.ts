import 'dotenv/config';

import app from './app';
import pool, { getDatabasePoolStats } from './config/database';
import logger from './utils/logger';
import ensureScheduleSchema from './scripts/ensureScheduleSchema';
import financeClerkService from './services/financeClerk.service';
import { gregorianToEthiopian } from './shared/ethiopianCalendar';
import fs from 'fs';
import path from 'path';
import {
  STARTUP_MIGRATION_FILES,
  validateStartupMigrationManifest,
} from './config/startupMigrations';

const PORT = process.env.PORT || 5000;

async function ensureSchemaExtensions(): Promise<void> {
  validateStartupMigrationManifest();
  const migrationFiles = STARTUP_MIGRATION_FILES.map(fileName => ({
    fileName,
    filePath: path.join(__dirname, '../database/newmigrations', fileName),
  }));

  const missingFiles = migrationFiles.filter(({ filePath }) => !fs.existsSync(filePath));
  if (missingFiles.length > 0) {
    throw new Error(
      `Required migration files are missing: ${missingFiles.map(({ fileName }) => fileName).join(', ')}`
    );
  }

  for (const { fileName, filePath } of migrationFiles) {
    try {
      const schemaSql = fs.readFileSync(filePath, 'utf8');
      await pool.query(schemaSql);
      logger.info(`✅ Migration applied: ${fileName}`);
    } catch (err: any) {
      // Legacy migrations are replayed at startup and some are not fully
      // idempotent. Preserve that behavior until the ledger-based runner is
      // introduced, then verify required feature schema below.
      logger.warn(`⚠️ Migration skipped (already applied or incompatible): ${fileName} — ${err.message}`);
    }
  }

  const requiredSchema = await pool.query<{
    annual_plans: string | null;
    teacher_index: string | null;
    dept_head_index: string | null;
    status_index: string | null;
    active_academic_year_index: string | null;
  }>(
    `SELECT
       to_regclass('public.annual_plans')::text AS annual_plans,
       to_regclass('public.idx_annual_plans_teacher')::text AS teacher_index,
       to_regclass('public.idx_annual_plans_dept_head')::text AS dept_head_index,
       to_regclass('public.idx_annual_plans_status')::text AS status_index,
       to_regclass('public.idx_academic_years_single_active')::text AS active_academic_year_index`
  );
  const missingSchema = Object.entries(requiredSchema.rows[0] || {})
    .filter(([, objectName]) => !objectName)
    .map(([key]) => key);

  if (missingSchema.length > 0) {
    throw new Error(`Required startup schema is missing: ${missingSchema.join(', ')}`);
  }

  const expectedAnnualPlanColumns = [
    'id',
    'teacher_id',
    'dept_head_id',
    'course_id',
    'academic_year',
    'subject',
    'grade',
    'working_days_year',
    'periods_year',
    'periods_week',
    'duration_period',
    'items',
    'status',
    'rating',
    'feedback',
    'reviewed_by',
    'reviewed_at',
    'created_at',
    'updated_at',
  ];
  const annualPlanColumns = await pool.query<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'annual_plans'`
  );
  const existingColumns = new Set(annualPlanColumns.rows.map(row => row.column_name));
  const missingColumns = expectedAnnualPlanColumns.filter(column => !existingColumns.has(column));

  if (missingColumns.length > 0) {
    throw new Error(`Required annual_plans columns are missing: ${missingColumns.join(', ')}`);
  }

  const requiredGradePeriodConstraints = [
    'grades_academic_year_valid',
    'grades_semester_valid',
    'grade_submissions_academic_year_valid',
    'grade_submissions_semester_valid',
    'grade_submission_locks_academic_year_valid',
    'grade_submission_locks_semester_valid',
    'grade_submission_finalizations_academic_year_valid',
    'grade_submission_finalizations_semester_valid',
  ];
  const gradePeriodConstraints = await pool.query<{ conname: string }>(
    `SELECT conname
     FROM pg_constraint
     WHERE connamespace = 'public'::regnamespace
       AND conname = ANY($1::text[])`,
    [requiredGradePeriodConstraints]
  );
  const existingGradePeriodConstraints = new Set(
    gradePeriodConstraints.rows.map(row => row.conname)
  );
  const missingGradePeriodConstraints = requiredGradePeriodConstraints.filter(
    constraint => !existingGradePeriodConstraints.has(constraint)
  );

  if (missingGradePeriodConstraints.length > 0) {
    throw new Error(
      `Required grade academic-period constraints are missing: ${missingGradePeriodConstraints.join(', ')}`
    );
  }
}

async function bootstrap(): Promise<void> {
  try {
    const res = await pool.query('SELECT NOW()');
    logger.info('Database connected successfully');
    logger.info(`Database time: ${res.rows[0].now}`);

    await ensureSchemaExtensions();

    // Persist only explicitly supplied SMTP settings. Credentials are never
    // invented by the application or copied from source-code fallbacks.
    async function persistConfiguredEmailSettings() {
      try {
        const configuredValues: Record<string, string | undefined> = {
          smtp_host: process.env.SMTP_HOST,
          smtp_port: process.env.SMTP_PORT,
          smtp_user: process.env.SMTP_USER,
          smtp_from: process.env.SMTP_FROM,
        };

        const userResult = await pool.query<{ id: string }>(
          'SELECT id FROM public.users ORDER BY created_at ASC LIMIT 1'
        );
        const systemUserId = userResult.rows[0]?.id ?? null;

        for (const [key, value] of Object.entries(configuredValues)) {
          if (!value) continue;

          await pool.query(
            `INSERT INTO public.email_config (key, value, updated_by, updated_at)
               VALUES ($1, $2, $3, NOW())
               ON CONFLICT (key) DO UPDATE
               SET value = EXCLUDED.value
               WHERE email_config.value IS NULL OR email_config.value = ''`,
            [key, value, systemUserId]
          );
        }

        if (process.env.SMTP_PASS) {
          const removedPassword = await pool.query(
            `DELETE FROM public.email_config WHERE key = 'smtp_pass'`
          );
          if (removedPassword.rowCount) {
            logger.info('[EMAIL] Removed legacy database-stored SMTP password');
          }
        }
        logger.info('[EMAIL] Explicit SMTP environment settings persisted');
      } catch (err: any) {
        logger.warn(`[EMAIL] Could not persist SMTP environment settings: ${err.message}`);
      }
    }

    await persistConfiguredEmailSettings();

    // Load saved SMTP config from DB into process.env so the email transporter
    // picks up the correct credentials immediately on first use after startup.
    try {
      const smtpRows = await pool.query(
        `SELECT key, value FROM public.email_config WHERE key IN ('smtp_host','smtp_port','smtp_user','smtp_from')`
      );
      for (const row of smtpRows.rows) {
        if (row.value) {
          const envKey = row.key === 'smtp_from' ? 'SMTP_FROM' : (row.key as string).toUpperCase();
          if (!process.env[envKey]) process.env[envKey] = row.value;
        }
      }
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        logger.info('[EMAIL] SMTP configuration loaded');
      } else {
        logger.warn('[EMAIL] SMTP is disabled until SMTP_HOST, SMTP_USER and SMTP_PASS are configured');
      }
    } catch (err: any) {
      logger.warn(`[EMAIL] Could not load SMTP config from DB: ${err.message}`);
    }

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
    let collectionsSyncRunning = false;
    const runCollectionsSync = async () => {
      if (collectionsSyncRunning) {
        logger.warn('Finance collections sync skipped because the previous run is still active');
        return;
      }

      collectionsSyncRunning = true;
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
      } finally {
        collectionsSyncRunning = false;
      }
    };

    await runCollectionsSync();
    const collectionsSyncInterval = setInterval(runCollectionsSync, 60 * 60 * 1000);
    const poolMonitorInterval = setInterval(() => {
      const stats = getDatabasePoolStats();
      if (stats.waiting > 0 || (stats.total >= stats.max && stats.idle === 0)) {
        logger.warn('Database pool pressure detected', stats);
      } else {
        logger.debug('Database pool status', stats);
      }
    }, 60 * 1000);
    poolMonitorInterval.unref();


    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
    });

    process.on('SIGTERM', () => {
      logger.info('SIGTERM signal received: closing HTTP server');
      clearInterval(collectionsSyncInterval);
      clearInterval(poolMonitorInterval);
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
      clearInterval(poolMonitorInterval);
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
