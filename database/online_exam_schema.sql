-- =============================================================================
-- online_exam_schema.sql
-- New Online Exam System with atomic saving and branch isolation.
-- =============================================================================

BEGIN;

-- 1. Cleanup old tables (if they exist)
DROP TABLE IF EXISTS silo_exam_results CASCADE;
DROP TABLE IF EXISTS silo_official_exams CASCADE;
DROP TYPE IF EXISTS exam_status CASCADE;

-- 2. Enums
DO $$ BEGIN
  CREATE TYPE online_exam_status AS ENUM ('active', 'submitted', 'terminated', 'timed_out');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. online_exams
-- Stores the header information for an exam.
CREATE TABLE IF NOT EXISTS online_exams (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id        UUID         NOT NULL, -- REFERENCES silo_branches(id) if exists, else generic UUID
  subject_id       UUID         REFERENCES silo_courses(id) ON DELETE SET NULL,
  section_id       UUID         REFERENCES silo_sections(id) ON DELETE SET NULL,
  creator_id       UUID         NOT NULL REFERENCES silo_identities(id),
  title            VARCHAR(300) NOT NULL,
  start_window     TIMESTAMPTZ  NOT NULL,
  duration_minutes INTEGER      NOT NULL CHECK (duration_minutes > 0),
  is_published     BOOLEAN      DEFAULT FALSE,
  created_at       TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
);

-- 4. online_exam_questions
-- Stores questions for a specific exam.
CREATE TABLE IF NOT EXISTS online_exam_questions (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id          UUID         NOT NULL REFERENCES online_exams(id) ON DELETE CASCADE,
  question_text    TEXT         NOT NULL,
  question_type    VARCHAR(50)  DEFAULT 'multiple_choice',
  options_json     JSONB,       -- e.g., ["Option A", "Option B"]
  correct_answer   TEXT,        -- For auto-grading
  points           INTEGER      DEFAULT 1,
  sort_order       INTEGER      DEFAULT 0,
  created_at       TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
);

-- 5. online_exam_sessions
-- Tracks student participation in an exam.
CREATE TABLE IF NOT EXISTS online_exam_sessions (
  id               UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id          UUID               NOT NULL REFERENCES online_exams(id) ON DELETE CASCADE,
  student_id       UUID               NOT NULL REFERENCES silo_identities(id),
  status           online_exam_status NOT NULL DEFAULT 'active',
  start_time       TIMESTAMPTZ        DEFAULT CURRENT_TIMESTAMP,
  end_time         TIMESTAMPTZ,
  final_score      NUMERIC(5,2),
  created_at       TIMESTAMPTZ        DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uq_online_exam_session UNIQUE (exam_id, student_id)
);

-- 6. online_exam_answers
-- Atomic saving of answers. Every time a student answers, we upsert here.
CREATE TABLE IF NOT EXISTS online_exam_answers (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       UUID         NOT NULL REFERENCES online_exam_sessions(id) ON DELETE CASCADE,
  question_id      UUID         NOT NULL REFERENCES online_exam_questions(id) ON DELETE CASCADE,
  student_answer   TEXT,
  is_correct       BOOLEAN,
  saved_at         TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uq_online_session_question UNIQUE (session_id, question_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_online_exams_branch  ON online_exams(branch_id);
CREATE INDEX IF NOT EXISTS idx_online_exams_subject ON online_exams(subject_id);
CREATE INDEX IF NOT EXISTS idx_online_exam_sessions_student ON online_exam_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_online_exam_answers_session  ON online_exam_answers(session_id);

COMMIT;
