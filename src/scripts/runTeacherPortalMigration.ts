import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import pool from '../config/database';

dotenv.config();

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('🌱 Starting Teacher Portal database migrations...');
    const migrationPath = path.resolve(process.cwd(), 'database', 'teacher_portal_migration.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Migration SQL file not found at: ${migrationPath}`);
      process.exit(1);
    }

    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    await client.query('BEGIN');
    await client.query(migrationSql);
    await client.query('COMMIT');
    
    console.log('🎉 Teacher Portal database migrations applied successfully!');
    process.exit(0);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
