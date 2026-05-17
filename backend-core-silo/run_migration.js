const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const sqlFiles = [
  'schema.sql',
  'student_schema_v2.sql',
  'student_refactor.sql',
  'academic_schema.sql',
  'clinic_setup.sql',
  'exam_schema.sql',
  'family_academic_setup.sql',
  'library_update.sql',
  'logistics_setup.sql',
  'schema_alignment.sql',
  'seed_bikila_family.sql',
  'seed_family_academic.sql'
];

async function run() {
  console.log('--- STARTING DATABASE MIGRATIONS ---');
  console.log('Connecting to:', process.env.DATABASE_URL);
  
  const client = await pool.connect();
  try {
    console.log('[~] Cleaning database (dropping legacy silo tables & types)...');
    await client.query(`
      DROP TABLE IF EXISTS silo_student_grades CASCADE;
      DROP TABLE IF EXISTS silo_enrollments CASCADE;
      DROP TABLE IF EXISTS silo_schedule CASCADE;
      DROP TABLE IF EXISTS silo_courses CASCADE;
      DROP TABLE IF EXISTS silo_sections CASCADE;
      DROP TABLE IF EXISTS silo_attendance CASCADE;
      DROP TABLE IF EXISTS silo_deadlines CASCADE;
      DROP TABLE IF EXISTS silo_teacher_rewards CASCADE;
      DROP TABLE IF EXISTS silo_family_links CASCADE;
      DROP TABLE IF EXISTS silo_student_stats CASCADE;
      DROP TABLE IF EXISTS silo_communication_book CASCADE;
      DROP TABLE IF EXISTS silo_communication_logs CASCADE;
      DROP TABLE IF EXISTS silo_announcements CASCADE;
      DROP TABLE IF EXISTS silo_clinic_chat CASCADE;
      DROP TABLE IF EXISTS silo_clinic_visits CASCADE;
      DROP TABLE IF EXISTS silo_clinic_messages CASCADE;
      DROP TABLE IF EXISTS silo_medicine_inventory CASCADE;
      DROP TABLE IF EXISTS silo_library_books CASCADE;
      DROP TABLE IF EXISTS silo_library_borrows CASCADE;
      DROP TABLE IF EXISTS silo_logistics_vehicles CASCADE;
      DROP TABLE IF EXISTS silo_logistics_routes CASCADE;
      DROP TABLE IF EXISTS silo_logistics_student_routes CASCADE;
      DROP TABLE IF EXISTS silo_logistics_notices CASCADE;
      DROP TABLE IF EXISTS silo_users CASCADE;
      DROP TABLE IF EXISTS silo_identities CASCADE;
      DROP TYPE IF EXISTS silo_exam_status CASCADE;
    `);
    console.log('[+] Database cleaned successfully');

    for (const file of sqlFiles) {
      const filePath = path.join(__dirname, 'database', file);
      if (!fs.existsSync(filePath)) {
        console.warn(`[!] Skipping ${file}: File not found`);
        continue;
      }
      console.log(`[~] Executing ${file}...`);
      const sqlContent = fs.readFileSync(filePath, 'utf8');
      
      // Execute the entire SQL script
      await client.query(sqlContent);
      console.log(`[+] Successfully executed ${file}`);
    }
    console.log('--- ALL MIGRATIONS COMPLETED SUCCESSFULLY ---');
  } catch (err) {
    console.error('✘ Migration failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
