-- Migration: 19th_add_rating_excellent_to_communication_logs.sql
-- Adds the rating_excellent column to communication_logs table
-- and updates all rating constraints to use 0-5 (5-star) scale.

-- Step 1: Drop old constraints (if they still exist with old ranges)
ALTER TABLE public.communication_logs
  DROP CONSTRAINT IF EXISTS communication_logs_rating_uniform_check,
  DROP CONSTRAINT IF EXISTS communication_logs_rating_materials_check,
  DROP CONSTRAINT IF EXISTS communication_logs_rating_homework_check,
  DROP CONSTRAINT IF EXISTS communication_logs_rating_participation_check,
  DROP CONSTRAINT IF EXISTS communication_logs_rating_conduct_check,
  DROP CONSTRAINT IF EXISTS communication_logs_rating_social_check,
  DROP CONSTRAINT IF EXISTS communication_logs_rating_punctuality_check,
  DROP CONSTRAINT IF EXISTS communication_logs_rating_note_taking_check,
  DROP CONSTRAINT IF EXISTS communication_logs_rating_excellent_check;

-- Step 2: Add the missing rating_excellent column (idempotent)
ALTER TABLE public.communication_logs
  ADD COLUMN IF NOT EXISTS rating_excellent SMALLINT NOT NULL DEFAULT 0;

-- Step 3: Re-add all rating constraints with 0-5 range
DO $$ BEGIN
  ALTER TABLE public.communication_logs
    ADD CONSTRAINT communication_logs_rating_uniform_check CHECK (rating_uniform BETWEEN 0 AND 5);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.communication_logs
    ADD CONSTRAINT communication_logs_rating_materials_check CHECK (rating_materials BETWEEN 0 AND 5);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.communication_logs
    ADD CONSTRAINT communication_logs_rating_homework_check CHECK (rating_homework BETWEEN 0 AND 5);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.communication_logs
    ADD CONSTRAINT communication_logs_rating_participation_check CHECK (rating_participation BETWEEN 0 AND 5);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.communication_logs
    ADD CONSTRAINT communication_logs_rating_conduct_check CHECK (rating_conduct BETWEEN 0 AND 5);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.communication_logs
    ADD CONSTRAINT communication_logs_rating_social_check CHECK (rating_social BETWEEN 0 AND 5);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.communication_logs
    ADD CONSTRAINT communication_logs_rating_punctuality_check CHECK (rating_punctuality BETWEEN 0 AND 5);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.communication_logs
    ADD CONSTRAINT communication_logs_rating_note_taking_check CHECK (rating_note_taking BETWEEN 0 AND 5);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.communication_logs
    ADD CONSTRAINT communication_logs_rating_excellent_check CHECK (rating_excellent BETWEEN 0 AND 5);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
