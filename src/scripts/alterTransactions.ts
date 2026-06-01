import pool from '../config/database';

async function run() {
  try {
    console.log('Altering finance_transactions table...');
    await pool.query(`ALTER TABLE finance_transactions ALTER COLUMN student_id DROP NOT NULL;`);
    await pool.query(`ALTER TABLE finance_transactions ALTER COLUMN student_name DROP NOT NULL;`);
    console.log('Successfully altered finance_transactions.');
  } catch (err) {
    console.error('Error altering table:', err);
  } finally {
    await pool.end();
  }
}

run();
