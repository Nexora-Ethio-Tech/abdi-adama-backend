-- 1. Add submission fields to grades table
ALTER TABLE grades
  ADD COLUMN IF NOT EXISTS is_submitted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES users(id);

-- 2. Grade submission tracking (per course, per assessment type)
CREATE TABLE IF NOT EXISTS grade_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  submission_type VARCHAR(50) NOT NULL, -- 'Mid-Exam', 'Final-Exam', 'Quiz', etc. (maps to method_id or label in grading_configs)
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_by UUID NOT NULL REFERENCES users(id),
  is_locked BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(course_id, teacher_id, submission_type)
);

-- 3. Add subject/dept-head fields to weekly_plans
ALTER TABLE weekly_plans
  ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subject VARCHAR(100),
  ADD COLUMN IF NOT EXISTS dept_head_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vc_notified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS week_number INT;

-- 4. Add section to schedules
ALTER TABLE schedules
  ADD COLUMN IF NOT EXISTS section VARCHAR(20),
  ADD COLUMN IF NOT EXISTS period_number INT;
