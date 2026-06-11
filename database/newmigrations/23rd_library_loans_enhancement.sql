-- ============================================================
-- Library Loans Enhancement: Support Students and Teachers
-- ============================================================
-- This migration adds support for both students and teachers
-- to borrow books from the library

-- 1. Add missing columns to library_loans if they don't exist
ALTER TABLE library_loans
ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE;

ALTER TABLE library_loans
ADD COLUMN IF NOT EXISTS borrower_type VARCHAR(20) DEFAULT 'student';
-- 'student' or 'teacher'

ALTER TABLE library_loans
ADD COLUMN IF NOT EXISTS borrower_name VARCHAR(255);
-- Denormalized name for easier querying

ALTER TABLE library_loans
ADD COLUMN IF NOT EXISTS book_title VARCHAR(300);
-- Denormalized book title

ALTER TABLE library_loans
ADD COLUMN IF NOT EXISTS book_code VARCHAR(50);
-- Denormalized book code

ALTER TABLE library_loans
ADD COLUMN IF NOT EXISTS student_school_id VARCHAR(50);
-- Denormalized student ID

ALTER TABLE library_loans
ADD COLUMN IF NOT EXISTS loan_status VARCHAR(20) DEFAULT 'Borrowed';
-- 'Borrowed', 'Returned', 'Overdue'

-- 2. Add book_code column to library_books if it doesn't exist
ALTER TABLE library_books
ADD COLUMN IF NOT EXISTS book_code VARCHAR(50) UNIQUE;

-- 3. Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_library_loans_teacher_id ON library_loans(teacher_id);
CREATE INDEX IF NOT EXISTS idx_library_loans_borrower_type ON library_loans(borrower_type);
CREATE INDEX IF NOT EXISTS idx_library_loans_status ON library_loans(loan_status);
CREATE INDEX IF NOT EXISTS idx_library_books_book_code ON library_books(book_code);
CREATE INDEX IF NOT EXISTS idx_library_books_available ON library_books(available)
WHERE available > 0;

-- 4. Ensure student_id can be NULL now (in case someone borrowed as teacher)
ALTER TABLE library_loans
ALTER COLUMN student_id DROP NOT NULL;

-- 5. Verify library_books has required columns
ALTER TABLE library_books
ADD COLUMN IF NOT EXISTS isbn VARCHAR(50) UNIQUE;

ALTER TABLE library_books
ADD COLUMN IF NOT EXISTS shelf VARCHAR(100);

-- Done
SELECT 'Library loans enhancement completed' as status;
