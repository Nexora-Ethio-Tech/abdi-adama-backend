-- =============================================================================
-- exam_schema.sql
-- Official Exam Secure Environment — new tables
-- Run against school_silo_db
-- =============================================================================

BEGIN;

-- ─── Exam Status Enum ─────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE silo_exam_status AS ENUM ('active', 'submitted', 'terminated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── silo_official_exams ──────────────────────────────────────────────────────
-- One row per scheduled official exam.
-- examiner_id → identity_id of the Teacher/Admin who created it.
CREATE TABLE IF NOT EXISTS silo_official_exams (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id       UUID         REFERENCES silo_courses(id) ON DELETE SET NULL,
  title            VARCHAR(300) NOT NULL,
  start_window     TIMESTAMPTZ  NOT NULL,          -- earliest allowed start time
  duration_minutes INTEGER      NOT NULL CHECK (duration_minutes > 0),
  examiner_id      UUID         NOT NULL REFERENCES silo_identities(id),
  section_id       UUID         REFERENCES silo_sections(id) ON DELETE SET NULL,
  is_published     BOOLEAN      DEFAULT FALSE,
  created_at       TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_official_exams_subject  ON silo_official_exams(subject_id);
CREATE INDEX IF NOT EXISTS idx_official_exams_examiner ON silo_official_exams(examiner_id);
CREATE INDEX IF NOT EXISTS idx_official_exams_section  ON silo_official_exams(section_id);

-- ─── silo_exam_results ────────────────────────────────────────────────────────
-- One row per student per exam attempt.
-- answers_json holds the raw student answers (submitted blob).
-- score + approval_status are set by the Teacher after review.
-- Only after teacher sets approval_status = 'approved' should the
-- silo_student_grades.final_50 column be updated (done by a stored procedure
-- or an admin endpoint — NOT exposed directly to students).
CREATE TABLE IF NOT EXISTS silo_exam_results (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id          UUID         NOT NULL REFERENCES silo_official_exams(id) ON DELETE CASCADE,
  student_id       UUID         NOT NULL REFERENCES silo_identities(id),
  answers_json     JSONB,                          -- raw answers payload
  score            NUMERIC(5,2),                  -- populated after teacher grades
  status           silo_exam_status  NOT NULL DEFAULT 'active',
  approval_status  VARCHAR(20)  DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  start_time       TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
  end_time         TIMESTAMPTZ,                   -- set on submit OR terminate
  created_at       TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,

  -- A student can only have ONE attempt per exam
  CONSTRAINT uq_exam_student UNIQUE (exam_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_results_exam    ON silo_exam_results(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_student ON silo_exam_results(student_id);

-- ─── silo_medicines ──────────────────────────────────────────────────────────
-- Medicine inventory for the Clinic module.
CREATE TABLE IF NOT EXISTS silo_medicines (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(200) NOT NULL UNIQUE,
  stock        INTEGER      NOT NULL DEFAULT 0 CHECK (stock >= 0),
  unit         VARCHAR(50)  DEFAULT 'Tablets',
  description  TEXT,
  created_at   TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial medicines
INSERT INTO silo_medicines (name, stock, unit) VALUES
  ('Paracetamol',   100, 'Tablets'),
  ('Ibuprofen',      60, 'Tablets'),
  ('Amoxicillin',    40, 'Capsules'),
  ('ORS Sachets',    30, 'Sachets'),
  ('Antiseptic',     20, 'Bottles')
ON CONFLICT (name) DO NOTHING;

COMMIT;

-- =============================================================================
-- RESULT APPROVAL PROCEDURE
-- After a teacher approves, call this to push score to final_50:
--
--   UPDATE silo_student_grades
--   SET final_50 = (
--     SELECT score FROM silo_exam_results
--     WHERE exam_id = '<exam_id>' AND student_id = '<student_id>'
--   )
--   WHERE student_id = '<student_id>' AND subject_id = (
--     SELECT subject_id FROM silo_official_exams WHERE id = '<exam_id>'
--   );
-- =============================================================================
