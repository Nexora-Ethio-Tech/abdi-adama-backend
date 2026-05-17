import pool from './config/db';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    console.log('Connecting to database...');
    // 1. Update silo_official_exams
    const updateResult = await pool.query(`
      UPDATE silo_official_exams 
      SET section_id = NULL, is_published = TRUE
    `);
    console.log('Update result:', updateResult.rowCount, 'exams modified.');

    // 2. Fetch and print the updated exams
    const exams = await pool.query('SELECT * FROM silo_official_exams');
    console.log('Updated Exams in database:', exams.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();
