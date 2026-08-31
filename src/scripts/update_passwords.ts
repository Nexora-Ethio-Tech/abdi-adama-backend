import pool from '../config/database';
import { hashPassword } from '../utils/password';
import { requireEnvironmentValue } from '../utils/secureConfig';

async function main() {
  const targetUsername = requireEnvironmentValue('PASSWORD_UPDATE_USERNAME');
  const newPassword = requireEnvironmentValue('PASSWORD_UPDATE_VALUE');
  const passwordHash = await hashPassword(newPassword);
  await pool.query(`
    UPDATE users
    SET password_hash = $1
    WHERE username = $2
  `, [passwordHash, targetUsername]);
  console.log(`Password updated successfully for ${targetUsername}.`);
  process.exit(0);
}
main();
