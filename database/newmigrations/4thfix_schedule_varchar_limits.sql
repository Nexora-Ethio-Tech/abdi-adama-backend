-- Migration: Increase VARCHAR limits for schedule-related tables
-- Fixes error 22001: "value too long for type character varying(10)"

-- Assuming the table is named `schedule_structure`, increase commonly restricted columns
ALTER TABLE public.schedule_structure 
  ALTER COLUMN academic_year TYPE VARCHAR(500);

-- Uncomment and run these if the issue stems from other specific columns:
-- ALTER TABLE schedule_structure ALTER COLUMN class_name TYPE VARCHAR(100);
-- ALTER TABLE schedule_structure ALTER COLUMN subject_code TYPE VARCHAR(100);
-- ALTER TABLE schedules ALTER COLUMN time_slot TYPE VARCHAR(100);

ALTER TABLE public.academic_sections 
  ALTER COLUMN section_name TYPE VARCHAR(500);
