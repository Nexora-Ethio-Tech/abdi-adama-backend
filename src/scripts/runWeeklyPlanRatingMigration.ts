import pool from '../config/db';

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Create teacher_ratings table
    console.log('Creating teacher_ratings table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS teacher_ratings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
        weekly_plan_id UUID REFERENCES weekly_plans(id) ON DELETE CASCADE,
        rating_value INT NOT NULL CHECK (rating_value IN (100, 200, 300)),
        rated_by UUID REFERENCES teachers(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_weekly_plan_rating UNIQUE(weekly_plan_id)
      );
    `);

    // Add overall_rating_score column to teachers table if not exists
    console.log('Adding overall_rating_score column to teachers...');
    await client.query(`
      ALTER TABLE teachers 
      ADD COLUMN IF NOT EXISTS overall_rating_score INT DEFAULT 0;
    `);

    await client.query('COMMIT');
    console.log('Migration completed successfully!');
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
