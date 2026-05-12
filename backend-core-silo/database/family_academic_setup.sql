-- Family Mapping
CREATE TABLE IF NOT EXISTS silo_family_links (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id      UUID NOT NULL REFERENCES silo_users(id) ON DELETE CASCADE,
  student_identity_id UUID NOT NULL REFERENCES silo_identities(id) ON DELETE CASCADE,
  UNIQUE(parent_user_id, student_identity_id)
);

-- Tab 1: Academic Profile & History
CREATE TABLE IF NOT EXISTS silo_student_grades (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID NOT NULL REFERENCES silo_identities(id) ON DELETE CASCADE,
  subject       VARCHAR(100) NOT NULL,
  mid_30        NUMERIC(5,2) DEFAULT 0,
  quiz_10       NUMERIC(5,2) DEFAULT 0,
  assignment_10 NUMERIC(5,2) DEFAULT 0,
  final_50      NUMERIC(5,2) DEFAULT 0,
  teacher_name  VARCHAR(200),
  academic_year VARCHAR(20) NOT NULL, -- e.g. 'EC 2017'
  created_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS silo_student_stats (
  student_id            UUID PRIMARY KEY REFERENCES silo_identities(id) ON DELETE CASCADE,
  attendance_percentage NUMERIC(5,2) DEFAULT 100,
  academic_rank        INTEGER,
  last_updated          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tab 2: Communication Book (Weekly Behavioral)
CREATE TABLE IF NOT EXISTS silo_communication_book (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          UUID NOT NULL REFERENCES silo_identities(id) ON DELETE CASCADE,
  week_ending         DATE NOT NULL DEFAULT CURRENT_DATE,
  -- 8 Metrics (1-4 scale)
  uniform             INTEGER CHECK (uniform >= 1 AND uniform <= 4),
  materials           INTEGER CHECK (materials >= 1 AND materials <= 4),
  homework            INTEGER CHECK (homework >= 1 AND homework <= 4),
  participation       INTEGER CHECK (participation >= 1 AND participation <= 4),
  conduct             INTEGER CHECK (conduct >= 1 AND conduct <= 4),
  social              INTEGER CHECK (social >= 1 AND social <= 4),
  punctuality         INTEGER CHECK (punctuality >= 1 AND punctuality <= 4),
  note_taking         INTEGER CHECK (note_taking >= 1 AND note_taking <= 4),
  -- Observations
  teacher_observation TEXT,
  progress_insight    TEXT,
  created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tab 3: Clinic Support (Chat)
CREATE TABLE IF NOT EXISTS silo_clinic_chat (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID NOT NULL REFERENCES silo_identities(id) ON DELETE CASCADE,
  sender_id   UUID NOT NULL REFERENCES silo_users(id), -- Either Parent or ClinicAdmin
  message     TEXT NOT NULL,
  is_encrypted BOOLEAN DEFAULT TRUE,
  timestamp   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tab 4: School Announcements
CREATE TABLE IF NOT EXISTS silo_announcements (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  priority  VARCHAR(20) DEFAULT 'Medium', -- 'High', 'Medium'
  title     VARCHAR(255) NOT NULL,
  content   TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_family_links_parent ON silo_family_links(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_student_grades_id ON silo_student_grades(student_id);
CREATE INDEX IF NOT EXISTS idx_comm_book_id ON silo_communication_book(student_id);
CREATE INDEX IF NOT EXISTS idx_clinic_chat_student ON silo_clinic_chat(student_id);
