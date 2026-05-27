import pool from '../config/database';

async function createMissingTables() {
  try {
    console.log('🌱 Starting creation of missing tables...');

    // 1. Create academic_years table
    console.log('Creating "academic_years" table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS academic_years (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        year_name VARCHAR(50) NOT NULL UNIQUE,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✅ "academic_years" table created successfully.');

    // 2. Create finance_transactions table
    console.log('Creating "finance_transactions" table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS finance_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        student_name VARCHAR(150) NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        type VARCHAR(150) NOT NULL,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        verified_by VARCHAR(150),
        branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✅ "finance_transactions" table created successfully.');

    // 3. Seed active academic year
    console.log('Seeding active academic year...');
    const existingYear = await pool.query(
      "SELECT id FROM academic_years WHERE year_name = '2025/2026'"
    );

    if (existingYear.rows.length === 0) {
      await pool.query(`
        INSERT INTO academic_years (year_name, start_date, end_date, is_active)
        VALUES ('2025/2026', '2025-09-01', '2026-06-30', true)
      `);
      console.log('✅ Default active academic year "2025/2026" seeded.');
    } else {
      // Ensure there is at least one active year
      const activeCheck = await pool.query(
        "SELECT id FROM academic_years WHERE is_active = true"
      );
      if (activeCheck.rows.length === 0) {
        await pool.query(
          "UPDATE academic_years SET is_active = true WHERE year_name = '2025/2026'"
        );
        console.log('✅ Activated academic year "2025/2026".');
      } else {
        console.log('⏭️ Active academic year already exists.');
      }
    }

    console.log('🎉 Missing tables creation complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating missing tables:', error);
    process.exit(1);
  }
}

createMissingTables();
