import pool from '../config/database';
import { hashPassword } from '../utils/password';

async function main() {
  const passwordHash = await hashPassword('SchoolAdmin@2026');
  await pool.query(`
    UPDATE users
    SET password_hash = $1
    WHERE username = 'hailegit35'
  `, [passwordHash]);
  console.log('Password updated successfully for hailegit35!');
  process.exit(0);
}
main();
