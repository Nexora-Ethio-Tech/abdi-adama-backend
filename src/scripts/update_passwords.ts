import pool from '../config/database';
import { hashPassword } from '../utils/password';

async function main() {
  const usersResult = await pool.query(`
    SELECT u.id, u.digital_id, u.role
    FROM users u
  `);

  console.log(`Found ${usersResult.rows.length} silo users to update.`);

  for (const row of usersResult.rows) {
    let pin = '';
    const digitalId = row.digital_id;

    if (digitalId.includes('3001')) pin = '3001';
    else if (digitalId.includes('1111')) pin = '1111';
    else if (digitalId.includes('2002') && row.role === 'parent') pin = '2002';
    else if (digitalId.includes('2002') && row.role === 'student') pin = '1234';
    else if (digitalId.includes('2001')) pin = '1234';
    else if (digitalId.includes('2003')) pin = '2003';
    else if (digitalId.includes('2004')) pin = '2004';
    else if (digitalId.includes('2005')) pin = '2005';
    else if (digitalId.includes('2007')) pin = '2007';
    else if (digitalId.includes('2008')) pin = '2008';
    else if (digitalId.includes('1001') && row.role === 'parent') pin = '1234';
    else if (digitalId.includes('1001') && row.role === 'student') pin = '1001';
    else if (digitalId.includes('1002')) pin = '1002';
    else if (digitalId.includes('1003')) pin = '1003';
    else if (digitalId.includes('1004')) pin = '1004';
    else if (digitalId.includes('1005')) pin = '1005';
    else if (digitalId.includes('1112')) pin = '1112';
    else if (digitalId.includes('8995')) pin = '7293';
    else if (digitalId.includes('4001')) pin = 'CLN-4';
    else {
      pin = '1234';
    }

    const hash = await hashPassword(pin);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, row.id]);
    console.log(`Updated user ${digitalId} (${row.role}) password to: "${pin}"`);
  }

  console.log('All users updated successfully.');
  pool.end();
}

main().catch(console.error);
