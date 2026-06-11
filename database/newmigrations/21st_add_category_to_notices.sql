-- Migration: Add category column to notices table
--
-- Safety: CREATE TABLE IF NOT EXISTS guards against the notices table being
-- absent (mirrors the guard in migration 20). The ALTER … IF NOT EXISTS is a
-- no-op when the column already exists.

CREATE TABLE IF NOT EXISTS public.notices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(200) NOT NULL,
    content text NOT NULL,
    priority character varying(20) DEFAULT 'Medium' NOT NULL,
    posted_by uuid,
    branch_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.notices
  ADD COLUMN IF NOT EXISTS category VARCHAR(50) NOT NULL DEFAULT 'Academic';
