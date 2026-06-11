-- Migration: Add audience column to notices table
-- This allows school admins to target notices to specific role groups.
-- Audience is stored as a comma-separated text of roles, e.g. 'teacher,driver'
-- or the special value 'all' to target everyone.
--
-- Safety: CREATE TABLE IF NOT EXISTS guards the case where a fresh DB never
-- received the notices table from migration 1 (e.g. if migration 1 partially
-- failed or was applied before the notices table was added to the schema dump).
-- The ALTER … IF NOT EXISTS is a no-op when the column already exists.

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
  ADD COLUMN IF NOT EXISTS audience TEXT NOT NULL DEFAULT 'all';
