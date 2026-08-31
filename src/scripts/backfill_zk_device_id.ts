import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { requireEnvironmentValue } from '../utils/secureConfig';

// Resolve .env from the backend root — works with ts-node (cwd = backend/) or compiled output
const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

// Print connection info upfront so you can confirm BEFORE any DB work happens
console.log(`[backfill] Loading .env from : ${envPath}`);
console.log(`[backfill] DB_HOST           = ${process.env.DB_HOST || '(not set)'}`);
console.log(`[backfill] DB_USER           = ${process.env.DB_USER || '(not set)'}`);
console.log(`[backfill] DB_NAME           = ${process.env.DB_NAME || '(not set)'}`);
console.log('');
console.log('⚠️  This script must be run ON the cPanel server (via Terminal/SSH).');
console.log('   On the server, localhost = the production PostgreSQL database.');
console.log('   Running this locally will connect to your local PC database instead.');
console.log('');

async function main() {
  const pool = new Pool({
    host:     requireEnvironmentValue('DB_HOST'),
    port:     parseInt(process.env.DB_PORT || '5432'),
    database: requireEnvironmentValue('DB_NAME'),
    user:     requireEnvironmentValue('DB_USER'),
    password: requireEnvironmentValue('DB_PASSWORD'),
    ssl:      process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  try {
    // Verify connection before doing anything
    const client = await pool.connect();
    client.release();
    console.log(`[backfill] ✅ Connected to database as '${process.env.DB_USER}' on '${process.env.DB_HOST}'.`);

    // Find the highest existing numeric zk_device_id to avoid duplicates
    const maxRes = await pool.query(`
      SELECT MAX(CAST(zk_device_id AS INTEGER)) AS max_val
      FROM users
      WHERE zk_device_id ~ '^[0-9]+$';
    `);

    const startVal = (maxRes.rows[0].max_val || 0) + 1;
    console.log(`[backfill] Highest existing zk_device_id: ${maxRes.rows[0].max_val || 'none'}. Starting new IDs from: ${startVal}`);

    await pool.query(`CREATE SEQUENCE IF NOT EXISTS zk_device_id_seq START ${startVal};`);
    await pool.query(`SELECT setval('zk_device_id_seq', ${startVal}, false);`);

    const res = await pool.query(`
      UPDATE users
      SET zk_device_id = nextval('zk_device_id_seq')::varchar
      WHERE (zk_device_id IS NULL OR zk_device_id = '')
        AND role IN (
          'teacher', 'finance-clerk', 'driver', 'librarian',
          'clinic-admin', 'school-admin', 'auditor', 'vice-principal', 'super-admin'
        );
    `);

    console.log(`[backfill] ✅ Done. Updated ${res.rowCount} staff users with a zk_device_id.`);
  } catch (e: any) {
    console.error('[backfill] ❌ Connection or query failed:', e.message || e);
    console.error('');
    console.error('→ If the error is "password authentication failed", you are running this locally.');
    console.error('  Upload backend_deploy.zip to cPanel, then run from the cPanel Terminal:');
    console.error('    cd ~/abdi-adama-backend');
    console.error('    node dist/scripts/backfill_zk_device_id.js');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
