import pool from './config/db';
import fs from 'fs';
import path from 'path';

const SQL_FILES = [
  'schema.sql',
  'student_schema_v2.sql',
  'exam_schema.sql',
  'academic_schema.sql',
  'clinic_setup.sql',
  'logistics_setup.sql'
];

async function migrateAll() {
  const client = await pool.connect();
  try {
    console.log('--- Starting Global Migration ---');
    
    for (const fileName of SQL_FILES) {
      const filePath = path.join(__dirname, '../database', fileName);
      if (fs.existsSync(filePath)) {
        console.log(`Applying ${fileName}...`);
        const sql = fs.readFileSync(filePath, 'utf8');
        await client.query(sql);
        console.log(`✓ ${fileName} applied.`);
      } else {
        console.warn(`! Skipping ${fileName} (File not found)`);
      }
    }
    
    console.log('\n--- Finalizing Alignments ---');
    const alignPath = path.join(__dirname, '../database/schema_alignment.sql');
    if (fs.existsSync(alignPath)) {
      await client.query(fs.readFileSync(alignPath, 'utf8'));
      console.log('✓ Schema alignments applied.');
    }

    console.log('\n✅ All migrations completed successfully.');
  } catch (err) {
    console.error('\n❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

migrateAll();
