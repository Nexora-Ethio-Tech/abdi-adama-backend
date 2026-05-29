-- Scope teacher-entered grades by academic year and semester
ALTER TABLE grades
ADD COLUMN IF NOT EXISTS academic_year VARCHAR(20) DEFAULT '2025/2026',
ADD COLUMN IF NOT EXISTS semester SMALLINT DEFAULT 2;

UPDATE grades
SET academic_year = COALESCE(academic_year, '2025/2026'),
    semester = COALESCE(semester, 2)
WHERE academic_year IS NULL OR semester IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_grades_student_course_type_term
ON grades (student_id, course_id, type, academic_year, semester);
