import dotenv from 'dotenv';
import pool from '../config/database';

dotenv.config();

async function createAllMissingTables() {
  const client = await pool.connect();
  try {
    console.log('🌱 Creating all missing database tables...\n');
    await client.query('BEGIN');

    // ── 1. absence_queue ─────────────────────────────────────────────────────
    console.log('Creating "absence_queue"...');
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
    console.log('✅ "absence_queue" ready.\n');

    // ── 2. grade_locks ────────────────────────────────────────────────────────
    console.log('Creating "grade_locks"...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS grade_locks (
        id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        grade_level      VARCHAR(20) NOT NULL,
        is_locked        BOOLEAN     NOT NULL DEFAULT FALSE,
        branch_id        UUID        REFERENCES branches(id) ON DELETE CASCADE,
        academic_year_id UUID        REFERENCES academic_years(id) ON DELETE SET NULL,
        locked_by        UUID        REFERENCES users(id) ON DELETE SET NULL,
        locked_at        TIMESTAMPTZ,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (grade_level, branch_id, academic_year_id)
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_grade_locks_branch ON grade_locks(branch_id);`);
    console.log('✅ "grade_locks" ready.\n');

    // ── 3. pending_applications ───────────────────────────────────────────────
    console.log('Creating "pending_applications"...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS pending_applications (
        id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        branch_id       UUID        REFERENCES branches(id) ON DELETE CASCADE,
        applicant_name  VARCHAR(200) NOT NULL,
        applicant_email VARCHAR(255),
        applicant_phone VARCHAR(30),
        grade_applying  VARCHAR(20),
        parent_name     VARCHAR(200),
        parent_phone    VARCHAR(30),
        dob             DATE,
        gender          VARCHAR(10),
        address         TEXT,
        notes           TEXT,
        status          VARCHAR(20) NOT NULL DEFAULT 'pending',
        reviewed_by     UUID        REFERENCES users(id) ON DELETE SET NULL,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_pending_apps_branch  ON pending_applications(branch_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_pending_apps_status  ON pending_applications(status);`);
    console.log('✅ "pending_applications" ready.\n');

    // ── 4. audit_log ──────────────────────────────────────────────────────────
    console.log('Creating "audit_log"...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id  UUID        REFERENCES students(id) ON DELETE CASCADE,
        user_id     UUID        REFERENCES users(id)    ON DELETE SET NULL,
        action      VARCHAR(100) NOT NULL,
        entity      VARCHAR(50),
        entity_id   UUID,
        old_value   TEXT,
        new_value   TEXT,
        ip_address  VARCHAR(50),
        description TEXT,
        timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_log_student   ON audit_log(student_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);`);
    console.log('✅ "audit_log" ready.\n');

    // ── 5. schedule engine tables ───────────────────────────────────────────
    console.log('Creating "schedule_config", "teacher_unavailability", "course_frequency", "timetable_runs", and "schedule_structure"...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS schedule_config (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        academic_year VARCHAR(20) NOT NULL DEFAULT '2025/2026',
        periods_per_day INT NOT NULL DEFAULT 8 CHECK (periods_per_day BETWEEN 3 AND 12),
        start_time TIME NOT NULL DEFAULT '08:00',
        end_time TIME NOT NULL DEFAULT '15:30',
        max_consecutive_periods INT NOT NULL DEFAULT 3 CHECK (max_consecutive_periods BETWEEN 1 AND 6),
        distribute_subjects BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(branch_id, academic_year)
      );

      CREATE INDEX IF NOT EXISTS idx_schedule_config_branch ON schedule_config(branch_id);

      CREATE TABLE IF NOT EXISTS teacher_unavailability (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
        branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        academic_year VARCHAR(20) NOT NULL DEFAULT '2025/2026',
        day_of_week VARCHAR(15) NOT NULL CHECK (day_of_week IN ('Monday','Tuesday','Wednesday','Thursday','Friday')),
        period_number INT NOT NULL CHECK (period_number >= 1),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(teacher_id, day_of_week, period_number, academic_year)
      );

      CREATE INDEX IF NOT EXISTS idx_teacher_unavail_teacher ON teacher_unavailability(teacher_id);
      CREATE INDEX IF NOT EXISTS idx_teacher_unavail_branch ON teacher_unavailability(branch_id);

      CREATE TABLE IF NOT EXISTS course_frequency (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        academic_year VARCHAR(20) NOT NULL DEFAULT '2025/2026',
        sessions_per_week INT NOT NULL DEFAULT 5 CHECK (sessions_per_week BETWEEN 1 AND 10),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(course_id, academic_year)
      );

      CREATE INDEX IF NOT EXISTS idx_course_freq_course ON course_frequency(course_id);
      CREATE INDEX IF NOT EXISTS idx_course_freq_branch ON course_frequency(branch_id);

      CREATE TABLE IF NOT EXISTS timetable_runs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        academic_year VARCHAR(20) NOT NULL DEFAULT '2025/2026',
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
        candidates JSONB NOT NULL DEFAULT '[]',
        approved_candidate INT,
        total_slots_filled INT NOT NULL DEFAULT 0,
        total_slots_possible INT NOT NULL DEFAULT 0,
        conflicts_count INT NOT NULL DEFAULT 0,
        generated_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_timetable_runs_branch ON timetable_runs(branch_id);
      CREATE INDEX IF NOT EXISTS idx_timetable_runs_status ON timetable_runs(status);

      CREATE TABLE IF NOT EXISTS schedule_structure (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        academic_year VARCHAR(20) NOT NULL DEFAULT '2025/2026',
        class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
        subject VARCHAR(100) NOT NULL,
        sessions_per_week INT NOT NULL DEFAULT 1 CHECK (sessions_per_week BETWEEN 1 AND 10),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(branch_id, academic_year, class_id, teacher_id, subject)
      );

      CREATE INDEX IF NOT EXISTS idx_schedule_structure_branch ON schedule_structure(branch_id);
      CREATE INDEX IF NOT EXISTS idx_schedule_structure_year ON schedule_structure(academic_year);
    `);
    console.log('✅ schedule engine tables ready.\n');

    await client.query('COMMIT');

    console.log('════════════════════════════════════════════════');
    console.log('🎉 All missing tables created successfully!');
    console.log('  ✅ absence_queue');
    console.log('  ✅ grade_locks');
    console.log('  ✅ pending_applications');
    console.log('  ✅ audit_log');
    console.log('  ✅ schedule engine tables');
    console.log('════════════════════════════════════════════════');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to create tables:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

createAllMissingTables();
