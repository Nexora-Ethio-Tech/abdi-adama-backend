-- Migration: Add grade column to classes table for better section filtering

-- Add grade column to classes table
ALTER TABLE classes
ADD COLUMN IF NOT EXISTS grade VARCHAR(10);

-- Populate existing classes with grade extracted from name
-- Handles patterns like "Grade 10-A", "Grade 10A", "Grade 10", "10-A", etc.
UPDATE classes
SET grade = (
  CASE 
    -- Try to extract 1-2 digit number after "Grade " prefix
    WHEN name ILIKE 'Grade %' THEN 
      SUBSTRING(name, 7, 2)::VARCHAR(10)
    -- Try to extract 1-2 digit number from start
    WHEN name ~ '^\d{1,2}' THEN 
      (SUBSTRING(name FROM '^\d{1,2}'))::VARCHAR(10)
    -- Fallback: use first 2 chars if numeric
    WHEN SUBSTRING(name, 1, 2) ~ '^\d+$' THEN 
      SUBSTRING(name, 1, 2)
    ELSE NULL
  END
)
WHERE grade IS NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_classes_grade ON classes(grade);

-- Verify data was populated correctly
-- SELECT id, name, grade FROM classes WHERE grade IS NULL LIMIT 5;
