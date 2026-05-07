import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function check() {
  try {
    const res = await pool.query('SELECT email, role, status, password_hash FROM users WHERE email = $1', ['abdiadamaschooloffice@gmail.com']);
    console.log('User found:', JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Database error:', err);
  } finally {
    await pool.end();
  }
}

check();
