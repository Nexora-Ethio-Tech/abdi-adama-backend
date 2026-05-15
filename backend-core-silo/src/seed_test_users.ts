import pool from './config/db';
import { hashPassword } from './shared/passwordUtils';
import { generateSchoolId } from './shared/idUtils';
import { UserRole } from './shared/types';

async function seedUser(fullName: string, role: UserRole, customId: string, pin: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Check if school_id already exists
    const existing = await client.query('SELECT id FROM silo_identities WHERE school_id = $1', [customId]);
    let identityId;
    
    if (existing.rowCount === 0) {
      const idRes = await client.query(
        'INSERT INTO silo_identities (school_id, full_name) VALUES ($1, $2) RETURNING id',
        [customId, fullName]
      );
      identityId = idRes.rows[0].id;
      console.log(`[+] Created identity: ${customId} (${fullName})`);
    } else {
      identityId = existing.rows[0].id;
      console.log(`[~] Using existing identity: ${customId}`);
    }

    const hashed = await hashPassword(pin);
    
    // Check if user/role already exists
    const userExists = await client.query(
      'SELECT id FROM silo_users WHERE identity_id = $1 AND role = $2',
      [identityId, role]
    );

    if (userExists.rowCount === 0) {
      await client.query(
        'INSERT INTO silo_users (identity_id, role, password_hash) VALUES ($1, $2, $3)',
        [identityId, role, hashed]
      );
      console.log(`    -> Created user row: ${role} (PIN: ${pin})`);
    } else {
      console.log(`    -> User row for ${role} already exists.`);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`[!] Failed to seed ${role}:`, err);
  } finally {
    client.release();
  }
}

async function run() {
  console.log('--- SEEDING TEST USERS ---');
  
  // 1. Student & Parent (Independent identities for testing ease)
  await seedUser('Test Student', 'Student', 'STU-1111', '1234');
  await seedUser('Test Parent',  'Parent',  'PAR-1111', '1234');
  
  // 2. Staff Roles
  await seedUser('Test Teacher',     'Teacher',     'TCH-1111', '1234');
  await seedUser('Test Driver',      'Driver',      'DRV-1111', '1234');
  await seedUser('Test Librarian',   'Librarian',   'LIB-1111', '1234');
  await seedUser('Test ClinicAdmin', 'ClinicAdmin', 'CLN-1111', '1234');

  console.log('--- SEEDING COMPLETE ---');

  // 3. Link Student and Parent for testing
  console.log('--- LINKING FAMILY ---');
  try {
    const studentRes = await pool.query('SELECT id FROM silo_identities WHERE school_id = $1', ['STU-1111']);
    const parentRes = await pool.query('SELECT u.id FROM silo_users u JOIN silo_identities i ON u.identity_id = i.id WHERE i.school_id = $1 AND u.role = $2', ['PAR-1111', 'Parent']);
    
    if (studentRes.rowCount && studentRes.rowCount > 0 && parentRes.rowCount && parentRes.rowCount > 0) {
      const studentId = (studentRes.rows[0] as any).id;
      const parentUserId = (parentRes.rows[0] as any).id;
      
      await pool.query(
        'INSERT INTO silo_family_links (student_identity_id, parent_user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [studentId, parentUserId]
      );
      console.log('✓ Linked STU-1111 to PAR-1111');
    }
  } catch (err) {
    console.error('[!] Failed to link family:', err);
  }
  console.log('--- ALL DONE ---');
  process.exit(0);
}

run().catch(console.error);
