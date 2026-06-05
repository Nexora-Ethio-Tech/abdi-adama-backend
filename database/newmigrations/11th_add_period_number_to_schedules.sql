-- Migration: Add period_number column to schedules table
-- The Schedule Builder generates timetables by period, but previously only stored
-- time_slot when approving. This column allows the teacher-facing schedule view
-- to display "Period 1", "Period 2", etc. instead of raw time strings.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'schedules'
          AND column_name  = 'period_number'
    ) THEN
        ALTER TABLE public.schedules
            ADD COLUMN period_number INT;
    END IF;
END $$;
