import pool from '../config/db';

async function run() {
  console.log('Running communication logs migration...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Drop existing check constraints
    await client.query(`
      ALTER TABLE communication_logs
        DROP CONSTRAINT IF EXISTS communication_logs_rating_uniform_check,
        DROP CONSTRAINT IF EXISTS communication_logs_rating_materials_check,
        DROP CONSTRAINT IF EXISTS communication_logs_rating_homework_check,
        DROP CONSTRAINT IF EXISTS communication_logs_rating_participation_check,
        DROP CONSTRAINT IF EXISTS communication_logs_rating_conduct_check,
        DROP CONSTRAINT IF EXISTS communication_logs_rating_social_check,
        DROP CONSTRAINT IF EXISTS communication_logs_rating_punctuality_check,
        DROP CONSTRAINT IF EXISTS communication_logs_rating_note_taking_check
    `);

    // Add expanded 0 to 5 check constraints
    await client.query(`
      ALTER TABLE communication_logs
        ADD CONSTRAINT communication_logs_rating_uniform_check CHECK (rating_uniform BETWEEN 0 AND 5),
        ADD CONSTRAINT communication_logs_rating_materials_check CHECK (rating_materials BETWEEN 0 AND 5),
        ADD CONSTRAINT communication_logs_rating_homework_check CHECK (rating_homework BETWEEN 0 AND 5),
        ADD CONSTRAINT communication_logs_rating_participation_check CHECK (rating_participation BETWEEN 0 AND 5),
        ADD CONSTRAINT communication_logs_rating_conduct_check CHECK (rating_conduct BETWEEN 0 AND 5),
        ADD CONSTRAINT communication_logs_rating_social_check CHECK (rating_social BETWEEN 0 AND 5),
        ADD CONSTRAINT communication_logs_rating_punctuality_check CHECK (rating_punctuality BETWEEN 0 AND 5),
        ADD CONSTRAINT communication_logs_rating_note_taking_check CHECK (rating_note_taking BETWEEN 0 AND 5)
    `);

    // Check if rating_excellent column exists, if not add it
    const colCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='communication_logs' AND column_name='rating_excellent'
    `);

    if (colCheck.rows.length === 0) {
      console.log('Adding rating_excellent column...');
      await client.query(`
        ALTER TABLE communication_logs
          ADD COLUMN rating_excellent SMALLINT NOT NULL DEFAULT 0
      `);
    }

    // Drop check constraint if exists and add it
    await client.query(`
      ALTER TABLE communication_logs
        DROP CONSTRAINT IF EXISTS communication_logs_rating_excellent_check
    `);
    await client.query(`
      ALTER TABLE communication_logs
        ADD CONSTRAINT communication_logs_rating_excellent_check CHECK (rating_excellent BETWEEN 0 AND 5)
    `);

    await client.query('COMMIT');
    console.log('Migration successful!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();



