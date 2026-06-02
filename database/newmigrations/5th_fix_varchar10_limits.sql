-- Migration: Increase VARCHAR(10) limits across all grade and section columns
-- Fixes error 22001: "value too long for type character varying(10)" when saving schedule structures

ALTER TABLE public.classes 
  ALTER COLUMN section TYPE VARCHAR(100),
  ALTER COLUMN grade TYPE VARCHAR(100);

ALTER TABLE public.silo_sections ALTER COLUMN grade TYPE VARCHAR(100);
ALTER TABLE public.academic_sections ALTER COLUMN section_name TYPE VARCHAR(100);
ALTER TABLE public.academic_grades ALTER COLUMN grade_level TYPE VARCHAR(100);
ALTER TABLE public.students ALTER COLUMN grade TYPE VARCHAR(100);
ALTER TABLE public.absence_queue ALTER COLUMN grade TYPE VARCHAR(100);