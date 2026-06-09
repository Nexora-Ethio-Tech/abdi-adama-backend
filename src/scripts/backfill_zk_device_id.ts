import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'abdiadam_school_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Haile',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function main() {
  try {
    const maxRes = await pool.query(`
      SELECT MAX(CAST(zk_device_id AS INTEGER)) as max_val 
      FROM users 
      WHERE zk_device_id ~ '^[0-9]+$';
    `);
    
    const startVal = (maxRes.rows[0].max_val || 0) + 1;
    
    await pool.query(`CREATE SEQUENCE IF NOT EXISTS zk_device_id_seq START ${startVal};`);
    await pool.query(`SELECT setval('zk_device_id_seq', ${startVal}, false);`);
    
    const res = await pool.query(`
      UPDATE users 
      SET zk_device_id = nextval('zk_device_id_seq')::varchar 
      WHERE (zk_device_id IS NULL OR zk_device_id = '') 
      AND role IN ('teacher', 'finance-clerk', 'driver', 'librarian', 'clinic-admin', 'school-admin', 'auditor', 'vice-principal', 'super-admin');
    `);
    
    console.log(`Updated ${res.rowCount} users with zk_device_id.`);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}

main();
