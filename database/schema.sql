-- =============================================================================
-- SILO IDENTITY MODEL  (run this file against school_silo_db)
-- =============================================================================

-- Role Enum
DO $$ BEGIN
  CREATE TYPE silo_role AS ENUM (
    'Student', 'Parent', 'Driver', 'Librarian', 'ClinicAdmin'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ΓöÇΓöÇΓöÇ Identity Table ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
-- One row per real-world person / entity.
-- Students and their Parents SHARE a single identity (same school_id).
-- Staff (Driver, Librarian, ClinicAdmin) each get their own identity.
CREATE TABLE IF NOT EXISTS silo_identities (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  VARCHAR(20)  NOT NULL UNIQUE,   -- e.g. "STU-000123"
  full_name  VARCHAR(200) NOT NULL,
  created_at TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_silo_identities_school_id ON silo_identities(school_id);

-- ΓöÇΓöÇΓöÇ User Table ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
-- One row per (identity, role) pair.
-- A single school_id can have a "Student" row AND a "Parent" row, but
-- cannot have two "Student" rows for the same identity.
CREATE TABLE IF NOT EXISTS silo_users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id   UUID        NOT NULL REFERENCES silo_identities(id) ON DELETE CASCADE,
  role          silo_role   NOT NULL,
  password_hash VARCHAR(255) NOT NULL,          -- bcrypt hash stored here
  is_active     BOOLEAN     DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  -- KEY CONSTRAINT: one identity cannot have duplicate roles
  CONSTRAINT uq_identity_role UNIQUE (identity_id, role)
);

CREATE INDEX IF NOT EXISTS idx_silo_users_identity_id ON silo_users(identity_id);

-- ΓöÇΓöÇΓöÇ Existing Role-Specific Tables ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
-- (unchanged from original schema, kept for reference linkage)

CREATE TABLE IF NOT EXISTS silo_students (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        REFERENCES silo_users(id) ON DELETE CASCADE,
  first_name      VARCHAR(100) NOT NULL,
  last_name       VARCHAR(100) NOT NULL,
  email           VARCHAR(255) UNIQUE,
  enrollment_date DATE        DEFAULT CURRENT_DATE,
  status          VARCHAR(20) DEFAULT 'active',
  created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS silo_parents (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        REFERENCES silo_users(id) ON DELETE CASCADE,
  first_name   VARCHAR(100) NOT NULL,
  last_name    VARCHAR(100) NOT NULL,
  email        VARCHAR(255) UNIQUE,
  phone_number VARCHAR(20),
  created_at   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS silo_student_parents (
  student_id        UUID REFERENCES silo_students(id) ON DELETE CASCADE,
  parent_id         UUID REFERENCES silo_parents(id) ON DELETE CASCADE,
  relationship_type VARCHAR(50),
  PRIMARY KEY (student_id, parent_id)
);

CREATE TABLE IF NOT EXISTS silo_drivers (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        REFERENCES silo_users(id) ON DELETE CASCADE,
  full_name      VARCHAR(200) NOT NULL,
  license_number VARCHAR(50) UNIQUE NOT NULL,
  phone_number   VARCHAR(20),
  vehicle_plate  VARCHAR(20),
  status         VARCHAR(20) DEFAULT 'available',
  created_at     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS silo_library_books (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title            VARCHAR(255) NOT NULL,
  author           VARCHAR(255),
  isbn             VARCHAR(20) UNIQUE,
  total_copies     INTEGER     DEFAULT 1,
  available_copies INTEGER     DEFAULT 1,
  created_at       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS silo_library_checkouts (
  id            UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id       UUID      REFERENCES silo_library_books(id),
  borrower_id   UUID      NOT NULL,
  borrower_type VARCHAR(20),
  checkout_date DATE      DEFAULT CURRENT_DATE,
  due_date      DATE,
  return_date   DATE,
  status        VARCHAR(20) DEFAULT 'borrowed'
);

CREATE TABLE IF NOT EXISTS silo_clinic_records (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID        NOT NULL,
  patient_type    VARCHAR(20),
  visit_date      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  symptoms        TEXT,
  diagnosis       TEXT,
  treatment       TEXT,
  administered_by UUID        NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Common Indexes
CREATE INDEX IF NOT EXISTS idx_silo_students_email       ON silo_students(email);
CREATE INDEX IF NOT EXISTS idx_silo_parents_email        ON silo_parents(email);
CREATE INDEX IF NOT EXISTS idx_silo_library_books_isbn   ON silo_library_books(isbn);
