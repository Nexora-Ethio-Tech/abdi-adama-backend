import pool from './config/db';
import fs from 'fs';
import path from 'path';

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running academic schema migration...');
    const schemaPath = path.join(__dirname, '../database/academic_schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    
    await client.query(sql);
    console.log('✓ Academic schema applied successfully.');
  } catch (err) {
    console.error('✘ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

migrate();
