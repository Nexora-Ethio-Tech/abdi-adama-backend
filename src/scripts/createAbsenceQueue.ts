import pool from '../config/database';

async function run() {
  const client = await pool.connect();
  try {
    console.log('Creating absence_queue table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS absence_queue (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id  UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        reason      TEXT,
        status      VARCHAR(20) NOT NULL DEFAULT 'pending',
        reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        resolved_at TIMESTAMPTZ,
        resolved_by UUID        REFERENCES users(id),
        notes       TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_absence_queue_student ON absence_queue(student_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_absence_queue_status  ON absence_queue(status);`);
    console.log('✅ absence_queue table created successfully.');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
