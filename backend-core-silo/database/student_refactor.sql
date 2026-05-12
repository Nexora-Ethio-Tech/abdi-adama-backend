-- Add grading components to silo_student_grades
ALTER TABLE silo_student_grades ADD COLUMN IF NOT EXISTS quiz_1 NUMERIC;
ALTER TABLE silo_student_grades ADD COLUMN IF NOT EXISTS quiz_2 NUMERIC;
ALTER TABLE silo_student_grades ADD COLUMN IF NOT EXISTS test_1 NUMERIC;
ALTER TABLE silo_student_grades ADD COLUMN IF NOT EXISTS test_2 NUMERIC;
ALTER TABLE silo_student_grades ADD COLUMN IF NOT EXISTS participation NUMERIC;
ALTER TABLE silo_student_grades ADD COLUMN IF NOT EXISTS mid_exam NUMERIC;
ALTER TABLE silo_student_grades ADD COLUMN IF NOT EXISTS final_exam NUMERIC;

-- Add semester column (1 or 2)
ALTER TABLE silo_student_grades ADD COLUMN IF NOT EXISTS semester INTEGER DEFAULT 1;

-- Create silo_courses table for scalability
CREATE TABLE IF NOT EXISTS silo_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    teacher_id UUID REFERENCES silo_identities(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enrollment table to link students to courses per year/semester
CREATE TABLE IF NOT EXISTS silo_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES silo_identities(id),
    course_id UUID REFERENCES silo_courses(id),
    academic_year TEXT NOT NULL, -- e.g. "2024/2025"
    semester INTEGER NOT NULL,    -- 1 or 2
    progress INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, course_id, academic_year, semester)
);

-- Link grades to enrollments (optional but cleaner)
ALTER TABLE silo_student_grades ADD COLUMN IF NOT EXISTS enrollment_id UUID REFERENCES silo_enrollments(id);
