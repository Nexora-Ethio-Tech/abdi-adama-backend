-- =============================================================================
-- Migration 33: Add event_id to school_calendar table
--
-- This links school_calendar entries to events, allowing automatic deletions
-- (via ON DELETE CASCADE) and easy synchronizations.
-- =============================================================================

ALTER TABLE public.school_calendar
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.events(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_school_calendar_event
  ON public.school_calendar (event_id);
