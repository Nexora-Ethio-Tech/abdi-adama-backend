import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function reset() {
  try {
    const hash = await bcrypt.hash('ChangeMe123!', 10);
    const res = await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id', [hash, 'abdiadamaschooloffice@gmail.com']);
    if (res.rows.length > 0) {
      console.log('✅ Password reset successful for:', 'abdiadamaschooloffice@gmail.com');
    } else {
      console.log('❌ User not found');
    }
  } catch (err) {
    console.error('Database error:', err);
  } finally {
    await pool.end();
  }
}

reset();
