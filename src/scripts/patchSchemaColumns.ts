import dotenv from 'dotenv';
import pool from '../config/database';

dotenv.config();

async function patchSchemaColumns() {
  const client = await pool.connect();
  try {
    console.log('🔧 Patching missing columns in existing tables...\n');
    await client.query('BEGIN');

    const alterIfNotExists = async (table: string, column: string, definition: string) => {
      const check = await client.query(`
        SELECT 1 FROM information_schema.columns
        WHERE table_name = $1 AND column_name = $2
      `, [table, column]);
      if (check.rows.length === 0) {
        await client.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
        console.log(`  ✅ Added "${column}" to "${table}"`);
      } else {
        console.log(`  ⏭️  "${column}" already exists in "${table}"`);
      }
    };

    // ── classes table ─────────────────────────────────────────────────────────
    console.log('📌 classes:');
    await alterIfNotExists('classes', 'capacity', 'INT NOT NULL DEFAULT 0');
    await alterIfNotExists('classes', 'section',  'VARCHAR(20)');
    console.log();

    // ── branches table ────────────────────────────────────────────────────────
    console.log('📌 branches:');
    await alterIfNotExists('branches', 'code',     'VARCHAR(20)');
    await alterIfNotExists('branches', 'logo_url', 'TEXT');
    await alterIfNotExists('branches', 'phone',    'VARCHAR(30)');
    await alterIfNotExists('branches', 'email',    'VARCHAR(255)');
    await alterIfNotExists('branches', 'address',  'TEXT');
    console.log();

    // ── students table ────────────────────────────────────────────────────────
    console.log('📌 students:');
    await alterIfNotExists('students', 'parent_phone', 'VARCHAR(30)');
    console.log();

    // ── teachers table ────────────────────────────────────────────────────────
    console.log('📌 teachers:');
    await alterIfNotExists('teachers', 'is_examiner', 'BOOLEAN NOT NULL DEFAULT FALSE');
    console.log();

    // ── library_books table ───────────────────────────────────────────────────
    console.log('📌 library_books:');
    await alterIfNotExists('library_books', 'book_code',    'VARCHAR(50)');
    await alterIfNotExists('library_books', 'description',  'TEXT');
    await alterIfNotExists('library_books', 'isbn',         'VARCHAR(50)');
    await alterIfNotExists('library_books', 'shelf',        'VARCHAR(100)');
    console.log();

    // ── library_loans table ───────────────────────────────────────────────────
    console.log('📌 library_loans:');
    await alterIfNotExists('library_loans', 'teacher_id',        'UUID REFERENCES teachers(id) ON DELETE CASCADE');
    await alterIfNotExists('library_loans', 'borrower_type',     'VARCHAR(20) DEFAULT \'student\'');
    await alterIfNotExists('library_loans', 'borrower_name',     'VARCHAR(255)');
    await alterIfNotExists('library_loans', 'book_title',        'VARCHAR(300)');
    await alterIfNotExists('library_loans', 'book_code',         'VARCHAR(50)');
    await alterIfNotExists('library_loans', 'student_school_id', 'VARCHAR(50)');
    await alterIfNotExists('library_loans', 'loan_status',        'VARCHAR(20) DEFAULT \'Borrowed\'');
    // Drop NOT NULL constraint on student_id to support teacher loans
    await client.query('ALTER TABLE library_loans ALTER COLUMN student_id DROP NOT NULL').catch(() => null);
    console.log();

    // ── medicine_inventory ────────────────────────────────────────────────────
    console.log('📌 medicine_inventory:');
    await alterIfNotExists('medicine_inventory', 'description', 'TEXT');
    console.log();

    // ── clinic_visits ─────────────────────────────────────────────────────────
    // The controller inserts without date/time separately — ensure nullables
    console.log('📌 clinic_visits:');
    await client.query(`ALTER TABLE clinic_visits ALTER COLUMN date SET DEFAULT CURRENT_DATE`).catch(() => null);
    await client.query(`ALTER TABLE clinic_visits ALTER COLUMN time SET DEFAULT '00:00'`).catch(() => null);
    await client.query(`ALTER TABLE clinic_visits ALTER COLUMN treatment SET DEFAULT ''`).catch(() => null);
    console.log('  ✅ clinic_visits defaults relaxed.\n');

    await client.query('COMMIT');

    console.log('════════════════════════════════════════════════');
    console.log('🎉 Schema column patch complete!');
    console.log('════════════════════════════════════════════════');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Patch failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

patchSchemaColumns();
