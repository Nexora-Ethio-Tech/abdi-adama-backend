import fs from 'fs';
import path from 'path';
import pool from '../config/database';
import logger from '../utils/logger';

export async function ensureScheduleSchema(): Promise<void> {
  const schemaPath = path.resolve(process.cwd(), 'database', 'schedule_schema.sql');

  if (!fs.existsSync(schemaPath)) {
    logger.warn(`⚠️ Schedule schema file not found at: ${schemaPath}`);
    return;
  }

  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(schemaSql);
  logger.info('✅ Schedule schema verified and updated');
}

export default ensureScheduleSchema;