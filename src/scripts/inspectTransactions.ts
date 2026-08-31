import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { requireEnvironmentValue } from '../utils/secureConfig';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
  host: requireEnvironmentValue('DB_HOST'),
  port: parseInt(process.env.DB_PORT || '5432'),
  database: requireEnvironmentValue('DB_NAME'),
  user: requireEnvironmentValue('DB_USER'),
  password: requireEnvironmentValue('DB_PASSWORD'),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function main() {
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT id, student_id, student_name, amount, type, date FROM finance_transactions WHERE type IN ('Expense', 'Income') OR amount < 0 LIMIT 20");
    console.log('=== Expense/Income Transactions in DB ===');
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
