-- Remove global unique constraint on courses(code) to allow duplicate course codes across different classes, sections, and branches.
ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_code_key;
