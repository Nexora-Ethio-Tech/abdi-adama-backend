-- =============================================================================
-- academic_schema.sql
-- Extra tables for Teacher-Parent communication and lesson planning.
-- =============================================================================

BEGIN;

-- ΓöÇΓöÇΓöÇ Weekly Plans ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
-- Content is stored as JSONB to allow flexible planning structures.
CREATE TABLE IF NOT EXISTS silo_weekly_plans (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id   UUID         NOT NULL REFERENCES silo_identities(id),
  section_id   UUID         NOT NULL REFERENCES silo_sections(id),
  week_number  INTEGER      NOT NULL,
  year         VARCHAR(10)  DEFAULT '2025/2026',
  content      JSONB        NOT NULL,  -- [{ day: 'Monday', objective: '...', activities: '...' }]
  is_approved  BOOLEAN      DEFAULT FALSE,
  created_at   TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_plans_teacher ON silo_weekly_plans(teacher_id);
CREATE INDEX IF NOT EXISTS idx_plans_section ON silo_weekly_plans(section_id);

-- ΓöÇΓöÇΓöÇ Communication Book Logs ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
-- Weekly behavioral and performance ratings sent by teachers/admins to parents.
CREATE TABLE IF NOT EXISTS silo_communication_logs (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     UUID         NOT NULL REFERENCES silo_identities(id),
  sender_id      UUID         NOT NULL REFERENCES silo_identities(id),
  week_ending    DATE         NOT NULL,
  ratings        JSONB        NOT NULL, -- { academic: 3, behavior: 2, effort: 3, ... }
  teacher_note   TEXT,
  created_at     TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comm_student ON silo_communication_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_comm_week    ON silo_communication_logs(week_ending);

COMMIT;
