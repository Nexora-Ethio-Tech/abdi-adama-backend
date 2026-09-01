import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import logger from '../utils/logger';

// Load .env explicitly from the backend project root to support running compiled files
const envPath = path.resolve(__dirname, '..', '..', '.env');
dotenv.config({ path: envPath });

// Validate and coerce DB environment variables to avoid runtime type errors
const DB_HOST = process.env.DB_HOST;
const DB_PORT = parseInt(process.env.DB_PORT || '5432');
const DB_NAME = process.env.DB_NAME;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD !== undefined && process.env.DB_PASSWORD !== null
  ? String(process.env.DB_PASSWORD)
  : undefined;

const readIntegerSetting = (
  name: string,
  defaultValue: number,
  minimum: number,
  maximum: number
): number => {
  const rawValue = process.env[name];
  if (!rawValue) return defaultValue;

  const parsedValue = Number(rawValue);
  if (!Number.isInteger(parsedValue) || parsedValue < minimum || parsedValue > maximum) {
    logger.warn(
      `${name} must be an integer between ${minimum} and ${maximum}; using ${defaultValue}`
    );
    return defaultValue;
  }

  return parsedValue;
};

if (!DB_HOST || !DB_NAME || !DB_USER || !DB_PASSWORD) {
  console.error('❌ Missing required database environment variables. Please set DB_HOST, DB_NAME, DB_USER and DB_PASSWORD.');
  // Keep process alive so developer can see the error, but do not attempt to create a pool with invalid config
  // Throwing here will stop the process which is preferable to obscure SASL errors
  throw new Error('Database configuration incomplete. See logs for details.');
}

export const databasePoolConfig = {
  // This is a per-process limit. Keep it conservative because PM2 instances,
  // admin tools, migrations, and other services all share PostgreSQL's limit.
  max: readIntegerSetting('DB_POOL_MAX', 10, 1, 50),
  idleTimeoutMillis: readIntegerSetting('DB_POOL_IDLE_TIMEOUT_MS', 30000, 1000, 600000),
  connectionTimeoutMillis: readIntegerSetting('DB_CONNECTION_TIMEOUT_MS', 10000, 1000, 120000),
  statementTimeoutMillis: readIntegerSetting('DB_STATEMENT_TIMEOUT_MS', 120000, 1000, 900000),
  idleTransactionTimeoutMillis: readIntegerSetting(
    'DB_IDLE_TRANSACTION_TIMEOUT_MS',
    300000,
    1000,
    1800000
  ),
  maxLifetimeSeconds: readIntegerSetting('DB_CONNECTION_MAX_LIFETIME_SECONDS', 1800, 0, 86400),
} as const;

const pool = new Pool({
  host: DB_HOST,
  port: DB_PORT,
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  application_name: process.env.DB_APPLICATION_NAME || 'abdi-adama-api',
  max: databasePoolConfig.max,
  idleTimeoutMillis: databasePoolConfig.idleTimeoutMillis,
  connectionTimeoutMillis: databasePoolConfig.connectionTimeoutMillis,
  statement_timeout: databasePoolConfig.statementTimeoutMillis,
  query_timeout: databasePoolConfig.statementTimeoutMillis,
  idle_in_transaction_session_timeout: databasePoolConfig.idleTransactionTimeoutMillis,
  maxLifetimeSeconds: databasePoolConfig.maxLifetimeSeconds,
});

pool.on('connect', () => {
  logger.debug('Database pool opened a connection');
});

pool.on('error', (err: Error) => {
  // pg emits this for errors on idle clients. The pool removes the failed
  // client automatically, so crashing the whole API would make a transient
  // database/network issue more disruptive.
  logger.error('Unexpected error on an idle database client', err);
});

export interface DatabasePoolStats {
  total: number;
  idle: number;
  waiting: number;
  max: number;
}

export const getDatabasePoolStats = (): DatabasePoolStats => ({
  total: pool.totalCount,
  idle: pool.idleCount,
  waiting: pool.waitingCount,
  max: databasePoolConfig.max,
});

export default pool;
