-- Book Status Enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'silo_book_status') THEN
    CREATE TYPE silo_book_status AS ENUM (
      'Available', 'Borrowed', 'Out of Stock'
    );
  END IF;
END $$;

DROP TABLE IF EXISTS silo_loans CASCADE;
DROP TABLE IF EXISTS silo_books CASCADE;

CREATE TABLE silo_books (
  id             UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  title          VARCHAR(255)     NOT NULL,
  author         VARCHAR(255)     NOT NULL,
  isbn           VARCHAR(50)      UNIQUE,
  shelf_location VARCHAR(100),
  stock          INTEGER          NOT NULL DEFAULT 1,
  total_copies   INTEGER          NOT NULL DEFAULT 1,
  book_code      VARCHAR(50),
  status         silo_book_status NOT NULL DEFAULT 'Available',
  created_at     TIMESTAMPTZ      DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE silo_loans (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id           UUID         NOT NULL REFERENCES silo_books(id) ON DELETE CASCADE,
  student_id        UUID         NOT NULL REFERENCES silo_identities(id) ON DELETE CASCADE,
  student_school_id VARCHAR(50),
  student_name      VARCHAR(255),
  book_title        VARCHAR(255),
  book_code         VARCHAR(50),
  loan_date         DATE         NOT NULL DEFAULT CURRENT_DATE,
  due_date          DATE         NOT NULL,
  returned_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_silo_books_status ON silo_books(status);
CREATE INDEX idx_silo_loans_student_id ON silo_loans(student_id);

-- Insert some dummy books for testing
INSERT INTO silo_books (title, author, isbn, shelf_location, stock, total_copies, book_code, status) VALUES
('The Lord of the Rings', 'J.R.R. Tolkien', '978-0544003415', 'Rack A-1', 5, 5, 'BK-1234', 'Available'),
('Introduction to Algorithms', 'Thomas H. Cormen', '978-0262033848', 'Rack B-2', 2, 2, 'BK-5678', 'Available'),
('Clean Code', 'Robert C. Martin', '978-0132350884', 'Rack C-3', 0, 3, 'BK-9012', 'Out of Stock');
