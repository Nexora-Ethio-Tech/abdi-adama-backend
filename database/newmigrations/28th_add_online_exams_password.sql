-- Migration: 28th_add_online_exams_password.sql
-- Add exam_password and password_required columns to online_exams table

ALTER TABLE public.online_exams
  ADD COLUMN IF NOT EXISTS exam_password VARCHAR(100),
  ADD COLUMN IF NOT EXISTS password_required BOOLEAN DEFAULT FALSE NOT NULL;
