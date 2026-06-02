-- Clinic Visits Table
CREATE TABLE IF NOT EXISTS silo_clinic_visits (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID         NOT NULL REFERENCES silo_identities(id) ON DELETE CASCADE,
  student_name VARCHAR(255) NOT NULL,
  visit_time   TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
  reason       TEXT         NOT NULL,
  treatment    TEXT,
  created_at   TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
);

-- Chat Placeholder Table
CREATE TABLE IF NOT EXISTS silo_clinic_messages (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   UUID         NOT NULL,
  receiver_id UUID         NOT NULL,
  message     TEXT         NOT NULL,
  created_at  TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_silo_clinic_visits_student_id ON silo_clinic_visits(student_id);
CREATE INDEX IF NOT EXISTS idx_silo_clinic_visits_time ON silo_clinic_visits(visit_time);
