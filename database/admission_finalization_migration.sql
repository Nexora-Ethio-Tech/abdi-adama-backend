-- Migration: Add final registration fields to pending_applications
-- This migration adds support for the complete admission → finance → registration workflow
-- Add columns to pending_applications table for storing finalized registration details
ALTER TABLE pending_applications
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE
SET NULL,
    ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES silo_sections(id) ON DELETE
SET NULL,
    ADD COLUMN IF NOT EXISTS student_id_generated VARCHAR(50),
    ADD COLUMN IF NOT EXISTS student_password_temp VARCHAR(255),
    ADD COLUMN IF NOT EXISTS parent_id_generated VARCHAR(50),
    ADD COLUMN IF NOT EXISTS parent_password_temp VARCHAR(255),
    ADD COLUMN IF NOT EXISTS credentials_generated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS registration_finalized_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS registered_by UUID REFERENCES users(id) ON DELETE
SET NULL;
-- Create indexes for faster queries on the new fields
CREATE INDEX IF NOT EXISTS idx_pending_applications_class_id ON pending_applications(class_id);
CREATE INDEX IF NOT EXISTS idx_pending_applications_section_id ON pending_applications(section_id);
CREATE INDEX IF NOT EXISTS idx_pending_applications_student_id_generated ON pending_applications(student_id_generated);
CREATE INDEX IF NOT EXISTS idx_pending_applications_status_finance ON pending_applications(status, payment_confirmed);
-- Add comment to explain the workflow
COMMENT ON COLUMN pending_applications.status IS 'Workflow statuses: pending → awaiting-payment → payment-confirmed → registered';
COMMENT ON COLUMN pending_applications.class_id IS 'Class assigned after school admin finalizes registration';
COMMENT ON COLUMN pending_applications.section_id IS 'Section assigned after school admin finalizes registration';
COMMENT ON COLUMN pending_applications.student_id_generated IS 'Generated Student ID (e.g., STU-20260524-12345)';
COMMENT ON COLUMN pending_applications.parent_id_generated IS 'Generated Parent ID (e.g., PAR-20260524-12345)';
COMMENT ON COLUMN pending_applications.registration_finalized_at IS 'Timestamp when school admin completed registration';