-- =============================================================================
-- STUDENT SCHEMA v2  ΓÇö  run against school_silo_db
-- Safe to re-run: all statements use IF NOT EXISTS / DO $$ ... END $$
-- =============================================================================

-- ΓöÇΓöÇΓöÇ Sections ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
-- A "section" is a physical class group, e.g. "Grade 10A"
CREATE TABLE IF NOT EXISTS silo_sections (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(50)  NOT NULL UNIQUE,   -- e.g. "Grade 10A"
  grade      VARCHAR(10)  NOT NULL,           -- e.g. "10"
  created_at TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
);

-- ΓöÇΓöÇΓöÇ Courses (Subjects) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
CREATE TABLE IF NOT EXISTS silo_courses (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  code        VARCHAR(30)  UNIQUE,
  teacher_id  UUID         REFERENCES silo_identities(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_silo_courses_teacher ON silo_courses(teacher_id);

-- ΓöÇΓöÇΓöÇ Enrollments ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
-- Links a student (silo_identities.id) to a course for a given year+semester
CREATE TABLE IF NOT EXISTS silo_enrollments (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID         NOT NULL REFERENCES silo_identities(id) ON DELETE CASCADE,
  course_id     UUID         NOT NULL REFERENCES silo_courses(id)    ON DELETE CASCADE,
  section_id    UUID         REFERENCES silo_sections(id)            ON DELETE SET NULL,
  academic_year VARCHAR(20)  NOT NULL,   -- e.g. "2025/2026"
  semester      SMALLINT     NOT NULL CHECK (semester IN (1, 2)),
  progress      SMALLINT     DEFAULT 0,
  created_at    TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uq_enrollment UNIQUE (student_id, course_id, academic_year, semester)
);

CREATE INDEX IF NOT EXISTS idx_silo_enrollments_student ON silo_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_silo_enrollments_course  ON silo_enrollments(course_id);

-- ΓöÇΓöÇΓöÇ Schedule ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
-- Weekly timetable per section
CREATE TABLE IF NOT EXISTS silo_schedule (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id  UUID         NOT NULL REFERENCES silo_sections(id)  ON DELETE CASCADE,
  course_id   UUID         NOT NULL REFERENCES silo_courses(id)   ON DELETE CASCADE,
  day_of_week SMALLINT     NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  -- 0=Sunday, 1=Monday ΓÇª 6=Saturday
  start_time  TIME         NOT NULL,   -- e.g. 08:00
  end_time    TIME         NOT NULL,   -- e.g. 09:30
  room        VARCHAR(50),
  created_at  TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_silo_schedule_section ON silo_schedule(section_id);
CREATE INDEX IF NOT EXISTS idx_silo_schedule_day     ON silo_schedule(day_of_week);

-- ΓöÇΓöÇΓöÇ Student Grades ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
-- One row per enrollment; stores raw component marks.
-- Weights: Quiz=10, Assignment=10, Mid=30, Final=50 (total=100)
CREATE TABLE IF NOT EXISTS silo_student_grades (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id  UUID    NOT NULL UNIQUE REFERENCES silo_enrollments(id) ON DELETE CASCADE,

  -- Component marks (nullable = not yet recorded)
  quiz_10        NUMERIC(5,2),   -- max 10
  assignment_10  NUMERIC(5,2),   -- max 10
  mid_30         NUMERIC(5,2),   -- max 30
  final_50       NUMERIC(5,2),   -- max 50

  -- Legacy granular marks kept for backward compat with existing getCurrentCourses
  quiz_1         NUMERIC(5,2),
  quiz_2         NUMERIC(5,2),
  test_1         NUMERIC(5,2),
  test_2         NUMERIC(5,2),
  participation  NUMERIC(5,2),
  mid_exam       NUMERIC(5,2),
  final_exam     NUMERIC(5,2),

  updated_at     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Calculated total column (generated, stored)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'silo_student_grades' AND column_name = 'total'
  ) THEN
    ALTER TABLE silo_student_grades
      ADD COLUMN total NUMERIC(6,2) GENERATED ALWAYS AS (
        COALESCE(quiz_10,0) + COALESCE(assignment_10,0) +
        COALESCE(mid_30,0)  + COALESCE(final_50,0)
      ) STORED;
  END IF;
END $$;

-- ΓöÇΓöÇΓöÇ Deadlines ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
-- Upcoming assignments / tasks visible to a whole section
CREATE TABLE IF NOT EXISTS silo_deadlines (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id  UUID         REFERENCES silo_sections(id) ON DELETE SET NULL,
  course_id   UUID         REFERENCES silo_courses(id)  ON DELETE SET NULL,
  title       VARCHAR(200) NOT NULL,
  type        VARCHAR(30)  NOT NULL DEFAULT 'Assignment',  -- 'Assignment' | 'Task' | 'Live Exam'
  due_date    DATE         NOT NULL,
  created_at  TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_silo_deadlines_section  ON silo_deadlines(section_id);
CREATE INDEX IF NOT EXISTS idx_silo_deadlines_due_date ON silo_deadlines(due_date);

-- ΓöÇΓöÇΓöÇ Teacher Rewards ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
-- Monthly "Teacher of the Week / Month" recognition
CREATE TABLE IF NOT EXISTS silo_teacher_rewards (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_identity_id UUID         NOT NULL REFERENCES silo_identities(id) ON DELETE CASCADE,
  award_label         VARCHAR(100) NOT NULL DEFAULT 'Teacher of the Month',
  reward_month        SMALLINT     NOT NULL CHECK (reward_month BETWEEN 1 AND 12),
  reward_year         SMALLINT     NOT NULL,
  created_at          TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uq_teacher_reward UNIQUE (teacher_identity_id, reward_month, reward_year)
);

-- ΓöÇΓöÇΓöÇ Sample seed data (idempotent) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
-- Insert a default section so the schema is immediately testable
INSERT INTO silo_sections (name, grade)
  VALUES ('Grade 10A', '10'), ('Grade 9B', '9'), ('Grade 11C', '11')
  ON CONFLICT (name) DO NOTHING;
