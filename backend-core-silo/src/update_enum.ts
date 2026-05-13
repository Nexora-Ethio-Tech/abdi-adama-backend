import pool from './config/db';

async function updateEnum() {
  const client = await pool.connect();
  try {
    console.log('Updating silo_role enum...');
    // We can't run ALTER TYPE ADD VALUE inside a transaction block
    // So we just run them one by one
    try { await client.query("ALTER TYPE silo_role ADD VALUE 'Teacher'"); } catch (e) { console.log('Teacher might already exist'); }
    try { await client.query("ALTER TYPE silo_role ADD VALUE 'Admin'"); } catch (e) { console.log('Admin might already exist'); }
    console.log('Enum updated successfully.');
  } catch (err) {
    console.error('Failed to update enum:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

updateEnum();
