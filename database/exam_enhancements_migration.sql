-- =============================================================================
-- exam_enhancements_migration.sql
-- Enhancements to teacher exams for grade selection, subject mapping, and password protection
-- Run against school_silo_db
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Extend teacher_exams table with new columns
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE teacher_exams
  ADD COLUMN IF NOT EXISTS grade_id UUID REFERENCES grades(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS exam_password VARCHAR(255),
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS password_required BOOLEAN DEFAULT FALSE;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Create exam_results table for storing student results
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS exam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES teacher_exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score NUMERIC(5,2),
  total_marks INTEGER,
  percentage NUMERIC(5,2),
  submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  graded_at TIMESTAMPTZ,
  graded_by UUID REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'pending', -- pending, graded, approved
  feedback TEXT,
  is_submitted BOOLEAN DEFAULT FALSE,
  
  -- Ensure one result per student per exam
  CONSTRAINT uq_exam_student_result UNIQUE (exam_id, student_id)
);

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Create exam_sessions table to track student exam sessions
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS exam_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES teacher_exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_start TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  session_end TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  password_verified BOOLEAN DEFAULT FALSE,
  password_verified_at TIMESTAMPTZ,
  last_activity TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT uq_exam_student_session UNIQUE (exam_id, student_id)
);

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Create exam_answers table to store individual question answers
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS exam_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES teacher_exams(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id VARCHAR(255),
  student_answer TEXT,
  is_correct BOOLEAN,
  marked_points NUMERIC(5,2),
  saved_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT uq_exam_session_question UNIQUE (session_id, question_id)
);

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Add columns to grades table for exam submission tracking
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE grades
  ADD COLUMN IF NOT EXISTS exam_score NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS exam_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS exam_feedback TEXT;

-- ─────────────────────────────────────────────────────────────────────────
-- 6. Create indexes for performance
-- ─────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_exam_results_exam ON exam_results(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_student ON exam_results(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_status ON exam_results(status);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_exam ON exam_sessions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_student ON exam_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_active ON exam_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_exam_answers_exam ON exam_answers(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_answers_student ON exam_answers(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_answers_session ON exam_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_teacher_exams_grade ON teacher_exams(grade_id);
CREATE INDEX IF NOT EXISTS idx_teacher_exams_subject ON teacher_exams(subject_id);
CREATE INDEX IF NOT EXISTS idx_grades_exam_score ON grades(exam_score);

COMMIT;
