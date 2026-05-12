-- Fix Driver notices table: add title and stations columns
ALTER TABLE silo_logistics_notices ADD COLUMN IF NOT EXISTS title   VARCHAR(255);
ALTER TABLE silo_logistics_notices ADD COLUMN IF NOT EXISTS stations TEXT; -- comma-separated

-- Fix Library loans: add returned_at alias column
ALTER TABLE silo_loans ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ;

-- Add student_name to loans for quick display without join
ALTER TABLE silo_loans ADD COLUMN IF NOT EXISTS student_name VARCHAR(200);
ALTER TABLE silo_loans ADD COLUMN IF NOT EXISTS book_title   VARCHAR(255);
