import dotenv from 'dotenv';
import app from './app';
import pool from './config/database';
import logger from './utils/logger';
import ensureScheduleSchema from './scripts/ensureScheduleSchema';
import financeClerkService from './services/financeClerk.service';

dotenv.config();

const PORT = process.env.PORT || 5000;

async function ensureSchemaExtensions(): Promise<void> {
  const fs = require('fs');
  const path = require('path');
  
  const migrationFiles = [
    'complete_schema.sql',
    '2ndmigration_super_admin_seed.sql'
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
