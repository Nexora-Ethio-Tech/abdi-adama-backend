-- Migration: Add section_id and audit columns for student section assignment

-- Add section_id FK to students table
ALTER TABLE students
ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES classes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS previous_section_id UUID REFERENCES classes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS section_assigned_at TIMESTAMPTZ DEFAULT NULL;

-- Create section_assignment_audit table for tracking assignment history
CREATE TABLE IF NOT EXISTS section_assignment_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    from_section_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    to_section_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    reason VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_section_assignment_audit_student ON section_assignment_audit(student_id);
CREATE INDEX IF NOT EXISTS idx_section_assignment_audit_created ON section_assignment_audit(created_at);

-- Ensure classes table has capacity tracking
ALTER TABLE classes
ADD COLUMN IF NOT EXISTS capacity INT DEFAULT 40,
ADD COLUMN IF NOT EXISTS current_count INT DEFAULT 0;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_students_section ON students(section_id);
CREATE INDEX IF NOT EXISTS idx_students_previous_section ON students(previous_section_id);
