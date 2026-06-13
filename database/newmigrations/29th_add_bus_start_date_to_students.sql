-- Add bus_start_date so transport student assignments can record start dates
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS bus_start_date DATE DEFAULT NULL;
