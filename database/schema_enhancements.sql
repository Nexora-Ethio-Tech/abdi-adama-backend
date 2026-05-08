-- ============================================================
-- Abdi Adama School Management System — Schema Enhancements
-- Module Implementation: Dynamic Academic Structure, Admissions, etc.
-- ============================================================

-- ============================================================
-- MODULE 1: DYNAMIC ACADEMIC STRUCTURE
-- ============================================================

-- Grades table (Admin-managed)
CREATE TABLE IF NOT EXISTS academic_grades (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grade_level     VARCHAR(10)  NOT NULL UNIQUE, -- '1', '2', ..., '12'
    branch_id       UUID         REFERENCES branches(id) ON DELETE CASCADE,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Sections table (Dynamic per grade)
CREATE TABLE IF NOT EXISTS academic_sections (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grade_id        UUID         NOT NULL REFERENCES academic_grades(id) ON DELETE CASCADE,
    section_name    VARCHAR(10)  NOT NULL, -- 'A', 'B', 'C', etc.
    branch_id       UUID         REFERENCES branches(id) ON DELETE CASCADE,
    capacity        INT          NOT NULL DEFAULT 40,
    current_count   INT          NOT NULL DEFAULT 0,
    room_teacher_id UUID         REFERENCES teachers(id) ON DELETE SET NULL,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE(grade_id, section_name)
);

CREATE INDEX idx_academic_sections_grade ON academic_sections(grade_id);
CREATE INDEX idx_academic_sections_branch ON academic_sections(branch_id);

-- ============================================================
-- MODULE 2: ADMISSION PIPELINE & FINANCIAL INTEGRATION
-- ============================================================

-- Registration window control
CREATE TABLE IF NOT EXISTS registration_config (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id       UUID         REFERENCES branches(id) ON DELETE CASCADE,
    is_open         BOOLEAN      NOT NULL DEFAULT FALSE,
    start_date      DATE,
    end_date        DATE,
    admission_fee   NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Enhanced pending_applications with file handling
ALTER TABLE pending_applications 
    ADD COLUMN IF NOT EXISTS transcript_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS transcript_size_kb INT,
    ADD COLUMN IF NOT EXISTS admission_fee NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS grade_applying VARCHAR(10),
    ADD COLUMN IF NOT EXISTS section_assigned UUID REFERENCES academic_sections(id),
    ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS payment_confirmed_by UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMPTZ;

-- Bulk communication tracking
CREATE TABLE IF NOT EXISTS bulk_communications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sent_by         UUID         NOT NULL REFERENCES users(id),
    recipient_count INT          NOT NULL DEFAULT 0,
    message_type    VARCHAR(20)  NOT NULL, -- 'SMS', 'EMAIL', 'BOTH'
    subject         VARCHAR(200),
    message         TEXT         NOT NULL,
    sent_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    application_ids UUID[]       -- Array of application IDs
);

CREATE TABLE IF NOT EXISTS bulk_communication_recipients (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    communication_id    UUID NOT NULL REFERENCES bulk_communications(id) ON DELETE CASCADE,
    application_id      UUID NOT NULL REFERENCES pending_applications(id) ON DELETE CASCADE,
    phone               VARCHAR(30),
    email               VARCHAR(255),
    status              VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    delivered_at        TIMESTAMPTZ
);

-- ============================================================
-- MODULE 3: IDENTITY & CREDENTIAL GENERATION
-- ============================================================

-- Add password field for parents (students already have users table)
ALTER TABLE parents 
    ADD COLUMN IF NOT EXISTS linked_student_id UUID REFERENCES students(id);

-- Credentials log for tracking generated passwords
CREATE TABLE IF NOT EXISTS credential_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    digital_id      VARCHAR(20)  NOT NULL,
    initial_password VARCHAR(10), -- For audit (hashed version in users table)
    generated_by    UUID         REFERENCES users(id),
    generated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    password_changed BOOLEAN     NOT NULL DEFAULT FALSE
);

-- ============================================================
-- MODULE 4: TEACHER LIFECYCLE & DYNAMIC ASSIGNMENTS
-- ============================================================

-- Enhanced teacher fields
ALTER TABLE teachers 
    ADD COLUMN IF NOT EXISTS age INT,
    ADD COLUMN IF NOT EXISTS sex VARCHAR(10),
    ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(30),
    ADD COLUMN IF NOT EXISTS background_details TEXT,
    ADD COLUMN IF NOT EXISTS assigned_room_section_id UUID REFERENCES academic_sections(id);

-- Teacher exam assignments
CREATE TABLE IF NOT EXISTS teacher_exam_assignments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id      UUID         NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    exam_id         UUID         REFERENCES exams(id) ON DELETE CASCADE,
    exam_title      VARCHAR(200) NOT NULL,
    exam_date       DATE,
    assigned_class  VARCHAR(50),
    assigned_by     UUID         REFERENCES users(id),
    assigned_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE
);

-- Teacher department head assignments
CREATE TABLE IF NOT EXISTS teacher_department_heads (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id      UUID         NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    department_name VARCHAR(100) NOT NULL,
    assigned_by     UUID         REFERENCES users(id),
    assigned_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    UNIQUE(teacher_id, department_name)
);

-- ============================================================
-- MODULE 5: BRANCH-SPECIFIC DATA RESTRICTIONS
-- ============================================================

-- Add branch_id to users if not exists for better filtering
-- (already exists in schema)

-- Audit trail for cross-branch access attempts
CREATE TABLE IF NOT EXISTS access_audit_trail (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID         NOT NULL REFERENCES users(id),
    attempted_branch UUID         REFERENCES branches(id),
    user_branch     UUID         REFERENCES branches(id),
    action          VARCHAR(100) NOT NULL,
    was_blocked     BOOLEAN      NOT NULL DEFAULT FALSE,
    occurred_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TRIGGERS FOR AUTO-UPDATED FIELDS
-- ============================================================

CREATE TRIGGER trg_academic_grades_updated 
    BEFORE UPDATE ON academic_grades 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_academic_sections_updated 
    BEFORE UPDATE ON academic_sections 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_registration_config_updated 
    BEFORE UPDATE ON registration_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SEED DATA FOR TESTING
-- ============================================================

-- Create default grades for all branches (1-12)
INSERT INTO academic_grades (grade_level, is_active)
SELECT gs.level, TRUE
FROM (
    SELECT '1' AS level UNION SELECT '2' UNION SELECT '3' UNION SELECT '4' 
    UNION SELECT '5' UNION SELECT '6' UNION SELECT '7' UNION SELECT '8'
    UNION SELECT '9' UNION SELECT '10' UNION SELECT '11' UNION SELECT '12'
) gs
ON CONFLICT (grade_level) DO NOTHING;

-- Create initial registration config for each branch
INSERT INTO registration_config (branch_id, is_open, admission_fee)
SELECT id, FALSE, 5000
FROM branches
ON CONFLICT DO NOTHING;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Function to auto-sort students alphabetically in section
CREATE OR REPLACE FUNCTION sort_students_in_section()
RETURNS TRIGGER AS $$
BEGIN
    -- This is handled in application logic
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to format Ethiopian phone numbers
CREATE OR REPLACE FUNCTION format_ethiopian_phone(phone TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Remove any existing +251 prefix
    phone := REGEXP_REPLACE(phone, '^\+?251', '');
    -- Remove any non-digit characters
    phone := REGEXP_REPLACE(phone, '[^0-9]', '', 'g');
    -- Return formatted number
    RETURN '+251' || phone;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- END OF ENHANCEMENTS
-- ============================================================
