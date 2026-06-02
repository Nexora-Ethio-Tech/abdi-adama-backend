-- Drop old library tables if they exist
DROP TABLE IF EXISTS silo_library_checkouts;
DROP TABLE IF EXISTS silo_library_books;
DROP TABLE IF EXISTS silo_loans;
DROP TABLE IF EXISTS silo_books;

-- Book Status Enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'silo_book_status') THEN
    CREATE TYPE silo_book_status AS ENUM (
      'Available', 'Borrowed', 'Out of Stock'
    );
  END IF;
END $$;

-- Silo Books Table
CREATE TABLE silo_books (
  id             UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  title          VARCHAR(255)     NOT NULL,
  author         VARCHAR(255)     NOT NULL,
  isbn           VARCHAR(50)      UNIQUE,
  shelf_location VARCHAR(100),
  stock          INTEGER          NOT NULL DEFAULT 1,
  status         silo_book_status NOT NULL DEFAULT 'Available',
  created_at     TIMESTAMPTZ      DEFAULT CURRENT_TIMESTAMP
);

-- Silo Loans Table
CREATE TABLE silo_loans (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id     UUID         NOT NULL REFERENCES silo_books(id) ON DELETE CASCADE,
  student_id  VARCHAR(20)  NOT NULL, -- linked to silo_identities.school_id
  loan_date   DATE         NOT NULL DEFAULT CURRENT_DATE,
  due_date    DATE         NOT NULL,
  return_date DATE,         -- NULL means it's an active loan
  created_at  TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_silo_books_status ON silo_books(status);
CREATE INDEX idx_silo_loans_student_id ON silo_loans(student_id);
