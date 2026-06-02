-- ============================================================
-- Schedule Builder Engine — Schema Migration
-- Run this AFTER consolidated_migration.sql
-- ============================================================

-- Schedule configuration per branch
CREATE TABLE IF NOT EXISTS schedule_config (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id     UUID        NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  academic_year VARCHAR(20) NOT NULL DEFAULT '2025/2026',
  periods_per_day INT       NOT NULL DEFAULT 8 CHECK (periods_per_day BETWEEN 3 AND 12),
  start_time    TIME        NOT NULL DEFAULT '08:00',
  end_time      TIME        NOT NULL DEFAULT '15:30',
  max_consecutive_periods INT NOT NULL DEFAULT 3 CHECK (max_consecutive_periods BETWEEN 1 AND 6),
  distribute_subjects BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(branch_id, academic_year)
);

CREATE INDEX IF NOT EXISTS idx_schedule_config_branch ON schedule_config(branch_id);

-- Teacher unavailability: blocked day+period slots
CREATE TABLE IF NOT EXISTS teacher_unavailability (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id    UUID        NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  branch_id     UUID        NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  academic_year VARCHAR(20) NOT NULL DEFAULT '2025/2026',
  day_of_week   VARCHAR(15) NOT NULL CHECK (day_of_week IN ('Monday','Tuesday','Wednesday','Thursday','Friday')),
  period_number INT         NOT NULL CHECK (period_number >= 1),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(teacher_id, day_of_week, period_number, academic_year)
);

CREATE INDEX IF NOT EXISTS idx_teacher_unavail_teacher ON teacher_unavailability(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_unavail_branch  ON teacher_unavailability(branch_id);

-- Course frequency: how many sessions per week each course needs
CREATE TABLE IF NOT EXISTS course_frequency (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id        UUID        NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  branch_id        UUID        NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  academic_year    VARCHAR(20) NOT NULL DEFAULT '2025/2026',
  sessions_per_week INT        NOT NULL DEFAULT 5 CHECK (sessions_per_week BETWEEN 1 AND 10),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id, academic_year)
);

CREATE INDEX IF NOT EXISTS idx_course_freq_course ON course_frequency(course_id);
CREATE INDEX IF NOT EXISTS idx_course_freq_branch ON course_frequency(branch_id);

-- Timetable generation runs (stores candidates as JSONB until one is approved)
CREATE TABLE IF NOT EXISTS timetable_runs (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id            UUID        NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  academic_year        VARCHAR(20) NOT NULL DEFAULT '2025/2026',
  status               VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  candidates           JSONB       NOT NULL DEFAULT '[]',
  approved_candidate   INT,                          -- index of the chosen candidate (0-based)
  total_slots_filled   INT         NOT NULL DEFAULT 0,
  total_slots_possible INT         NOT NULL DEFAULT 0,
  conflicts_count      INT         NOT NULL DEFAULT 0,
  generated_by         UUID        REFERENCES users(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timetable_runs_branch ON timetable_runs(branch_id);
CREATE INDEX IF NOT EXISTS idx_timetable_runs_status ON timetable_runs(status);

-- Timetable structure: one row per class/teacher/subject assignment used by the
-- timetable generator and saved from the Schedule Builder UI.
CREATE TABLE IF NOT EXISTS schedule_structure (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id       UUID        NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  academic_year   VARCHAR(20) NOT NULL DEFAULT '2025/2026',
  class_id        UUID        NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id      UUID        NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  subject         VARCHAR(100) NOT NULL,
  sessions_per_week INT       NOT NULL DEFAULT 1 CHECK (sessions_per_week BETWEEN 1 AND 10),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(branch_id, academic_year, class_id, teacher_id, subject)
);

CREATE INDEX IF NOT EXISTS idx_schedule_structure_branch ON schedule_structure(branch_id);
CREATE INDEX IF NOT EXISTS idx_schedule_structure_year ON schedule_structure(academic_year);
