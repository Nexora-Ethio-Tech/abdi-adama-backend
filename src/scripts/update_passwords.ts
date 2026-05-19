import pool from '../config/database';
import { hashPassword } from '../utils/password';

async function main() {
  const usersResult = await pool.query(`
    SELECT u.id, i.school_id, u.role
    FROM silo_users u
    JOIN silo_identities i ON u.identity_id = i.id
  `);

  console.log(`Found ${usersResult.rows.length} silo users to update.`);

  for (const row of usersResult.rows) {
    let pin = '';
    const schoolId = row.school_id;

    if (schoolId.includes('3001')) pin = '3001';
    else if (schoolId.includes('1111')) pin = '1111';
    else if (schoolId.includes('2002') && row.role === 'Parent') pin = '2002';
    else if (schoolId.includes('2002') && row.role === 'Student') pin = '1234';
    else if (schoolId.includes('2001')) pin = '1234';
    else if (schoolId.includes('2003')) pin = '2003';
    else if (schoolId.includes('2004')) pin = '2004';
    else if (schoolId.includes('2005')) pin = '2005';
    else if (schoolId.includes('2007')) pin = '2007';
    else if (schoolId.includes('2008')) pin = '2008';
    else if (schoolId.includes('1001') && row.role === 'Parent') pin = '1234';
    else if (schoolId.includes('1001') && row.role === 'Student') pin = '1001';
    else if (schoolId.includes('1002')) pin = '1002';
    else if (schoolId.includes('1003')) pin = '1003';
    else if (schoolId.includes('1004')) pin = '1004';
    else if (schoolId.includes('1005')) pin = '1005';
    else if (schoolId.includes('1112')) pin = '1112';
    else if (schoolId.includes('8995')) pin = '7293';
    else if (schoolId.includes('4001')) pin = 'CLN-4';
    else {
      pin = '1234';
    }

    const hash = await hashPassword(pin);
    await pool.query('UPDATE silo_users SET password_hash = $1 WHERE id = $2', [hash, row.id]);
    console.log(`Updated user ${schoolId} (${row.role}) password to: "${pin}"`);
  }

  console.log('All silo users updated successfully.');
  pool.end();
}

main().catch(console.error);
