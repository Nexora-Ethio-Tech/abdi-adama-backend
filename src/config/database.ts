import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

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

if (!DB_HOST || !DB_NAME || !DB_USER || !DB_PASSWORD) {
  console.error('❌ Missing required database environment variables. Please set DB_HOST, DB_NAME, DB_USER and DB_PASSWORD.');
  // Keep process alive so developer can see the error, but do not attempt to create a pool with invalid config
  // Throwing here will stop the process which is preferable to obscure SASL errors
  throw new Error('Database configuration incomplete. See logs for details.');
}

const pool = new Pool({
  host: DB_HOST,
  port: DB_PORT,
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('connect', () => {
  console.log('✅ Database connected successfully');
});

pool.on('error', (err: Error) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(-1);
});

export default pool;
