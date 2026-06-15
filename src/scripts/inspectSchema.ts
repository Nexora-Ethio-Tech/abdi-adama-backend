import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('=== Columns in finance_transactions ===');
    const colsFT = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'finance_transactions'
    `);
    console.table(colsFT.rows);

    console.log('=== Columns in student_collections ===');
    const colsSC = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'student_collections'
    `);
    console.table(colsSC.rows);

  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
