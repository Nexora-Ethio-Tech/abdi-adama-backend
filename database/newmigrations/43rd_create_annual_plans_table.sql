-- ============================================================
-- Migration #43: Create annual_plans table
-- Stores teacher yearly lesson plans for dept-head review.
-- ============================================================

CREATE TABLE IF NOT EXISTS annual_plans (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id        UUID        NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  dept_head_id      UUID        REFERENCES teachers(id) ON DELETE SET NULL,
  course_id         UUID        REFERENCES courses(id)  ON DELETE SET NULL,
  academic_year     VARCHAR(50) NOT NULL,
  subject           VARCHAR(100) NOT NULL,
  grade             VARCHAR(50) NOT NULL,
  working_days_year INT         NOT NULL DEFAULT 180,
  periods_year      INT         NOT NULL DEFAULT 160,
  periods_week      INT         NOT NULL DEFAULT 4,
  duration_period   VARCHAR(50) NOT NULL DEFAULT '45 minutes',
  items             JSONB       NOT NULL DEFAULT '[]'::jsonb,
  status            VARCHAR(30) NOT NULL DEFAULT 'Pending',
  rating            INT         CHECK (rating BETWEEN 1 AND 5),
  feedback          TEXT,
  reviewed_by       UUID        REFERENCES teachers(id) ON DELETE SET NULL,
  reviewed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_annual_plans_teacher   ON annual_plans(teacher_id);
CREATE INDEX IF NOT EXISTS idx_annual_plans_dept_head ON annual_plans(dept_head_id);
CREATE INDEX IF NOT EXISTS idx_annual_plans_status    ON annual_plans(status);
