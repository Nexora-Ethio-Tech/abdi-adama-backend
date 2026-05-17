-- =============================================================================
-- seed_bikila_family.sql
-- Seeds the "Bikila" family test data for integration testing.
-- Modified to perfectly comply with the v2 SQL schema dependencies.
-- =============================================================================

BEGIN;

-- ─── Step 1: Insert Identities ───────────────────────────────────────────────
INSERT INTO silo_identities (id, school_id, full_name)
VALUES
  ('a1000000-0000-0000-0000-000000000001', 'PAR-1001', 'Mr. Bikila'),
  ('a2000000-0000-0000-0000-000000000002', 'STU-2001', 'Abebe Bikila'),
  ('a3000000-0000-0000-0000-000000000003', 'STU-2002', 'Sara Bikila'),
  -- Create STU-8995 identity (needed for verify_parent_student.js test)
  ('a8995000-0000-0000-0000-000000008995', 'STU-8995', 'Test Student')
ON CONFLICT (school_id) DO UPDATE SET full_name = EXCLUDED.full_name;

-- ─── Step 2: Insert User accounts ────────────────────────────────────────────
-- Use real bcrypt hashes:
-- '1234' -> $2b$10$MCQ2j4hRG/6iPoRBZBZh6uETldS54PR41romQhqPhH7fqR6wLplYy
-- '7293' -> $2b$10$JUPbBb74jXkQwMgsWiUDOeylylH6qj9xAyJXdfz0UWulj8q1gF0b.
-- '3551' -> $2b$10$eH1.Ye4DWRX.gATKY/.q7ugc4u3pHGXvNZeoeWSnJfkPlAsXixCS6
INSERT INTO silo_users (id, identity_id, role, password_hash, is_active)
VALUES
  -- Mr. Bikila → Parent
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Parent', '$2b$10$MCQ2j4hRG/6iPoRBZBZh6uETldS54PR41romQhqPhH7fqR6wLplYy', TRUE),
  -- Abebe Bikila → Student
  ('b2000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000002', 'Student', '$2b$10$MCQ2j4hRG/6iPoRBZBZh6uETldS54PR41romQhqPhH7fqR6wLplYy', TRUE),
  -- Sara Bikila → Student
  ('b3000000-0000-0000-0000-000000000003', 'a3000000-0000-0000-0000-000000000003', 'Student', '$2b$10$MCQ2j4hRG/6iPoRBZBZh6uETldS54PR41romQhqPhH7fqR6wLplYy', TRUE),
  
  -- STU-8995 Student row
  ('b8995000-0000-0000-0000-000000008995', 'a8995000-0000-0000-0000-000000008995', 'Student', '$2b$10$JUPbBb74jXkQwMgsWiUDOeylylH6qj9xAyJXdfz0UWulj8q1gF0b.', TRUE),
  -- STU-8995 Parent row
  ('c8995000-0000-0000-0000-000000008995', 'a8995000-0000-0000-0000-000000008995', 'Parent', '$2b$10$eH1.Ye4DWRX.gATKY/.q7ugc4u3pHGXvNZeoeWSnJfkPlAsXixCS6', TRUE)
ON CONFLICT (identity_id, role) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- ─── Step 3: Family Links ─────────────────────────────────────────────────────
INSERT INTO silo_family_links (parent_user_id, student_identity_id)
VALUES
  ('b1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000002'), -- Mr. Bikila -> Abebe
  ('b1000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000003'), -- Mr. Bikila -> Sara
  ('c8995000-0000-0000-0000-000000008995', 'a8995000-0000-0000-0000-000000008995')  -- STU-8995 Parent -> STU-8995 Student
ON CONFLICT (parent_user_id, student_identity_id) DO NOTHING;

-- ─── Step 4: Insert Courses ───────────────────────────────────────────────────
INSERT INTO silo_courses (id, name, code, teacher_id)
VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Mathematics', 'MATH10', NULL),
  ('c1000000-0000-0000-0000-000000000002', 'English Language', 'ENGL10', NULL),
  ('c1000000-0000-0000-0000-000000000003', 'Amharic', 'AMH10', NULL),
  ('c1000000-0000-0000-0000-000000000004', 'Science', 'SCI10', NULL),
  ('c1000000-0000-0000-0000-000000000005', 'Social Studies', 'SOC10', NULL),
  ('c1000000-0000-0000-0000-000000000006', 'Biology', 'BIO10', NULL),
  ('c1000000-0000-0000-0000-000000000007', 'Physics', 'PHYS10', NULL)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

-- ─── Step 5: Insert Enrollments for current year 2025/2026, Semester 2 ─────────
-- Abebe Bikila (STU-2001) Enrollments
INSERT INTO silo_enrollments (id, student_id, course_id, section_id, academic_year, semester, progress)
VALUES
  ('e1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', '2025/2026', 2, 75),
  ('e1000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000001', '2025/2026', 2, 80),
  ('e1000000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000001', '2025/2026', 2, 90),
  ('e1000000-0000-0000-0000-000000000004', 'a2000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000001', '2025/2026', 2, 85),
  ('e1000000-0000-0000-0000-000000000005', 'a2000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000005', 'd1000000-0000-0000-0000-000000000001', '2025/2026', 2, 70)
ON CONFLICT (student_id, course_id, academic_year, semester) DO UPDATE SET section_id = EXCLUDED.section_id;

-- Sara Bikila (STU-2002) Enrollments
INSERT INTO silo_enrollments (id, student_id, course_id, section_id, academic_year, semester, progress)
VALUES
  ('e2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', '2025/2026', 2, 95),
  ('e2000000-0000-0000-0000-000000000002', 'a3000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000001', '2025/2026', 2, 88),
  ('e2000000-0000-0000-0000-000000000003', 'a3000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000001', '2025/2026', 2, 92),
  ('e2000000-0000-0000-0000-000000000004', 'a3000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000001', '2025/2026', 2, 90),
  ('e2000000-0000-0000-0000-000000000005', 'a3000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000005', 'd1000000-0000-0000-0000-000000000001', '2025/2026', 2, 85)
ON CONFLICT (student_id, course_id, academic_year, semester) DO UPDATE SET section_id = EXCLUDED.section_id;

-- ─── Step 6: Insert Grades into silo_student_grades ───────────────────────────
-- Abebe Bikila (STU-2001) Grades
INSERT INTO silo_student_grades (enrollment_id, quiz_10, assignment_10, mid_30, final_50)
VALUES
  ('e1000000-0000-0000-0000-000000000001', 8.5, 9.0, 25.5, 42.0),
  ('e1000000-0000-0000-0000-000000000002', 7.0, 8.5, 22.0, 38.5),
  ('e1000000-0000-0000-0000-000000000003', 9.0, 9.5, 27.0, 44.0),
  ('e1000000-0000-0000-0000-000000000004', 8.0, 8.0, 24.0, 40.5),
  ('e1000000-0000-0000-0000-000000000005', 9.5, 9.0, 26.5, 43.0)
ON CONFLICT (enrollment_id) DO UPDATE SET 
  quiz_10 = EXCLUDED.quiz_10, 
  assignment_10 = EXCLUDED.assignment_10,
  mid_30 = EXCLUDED.mid_30,
  final_50 = EXCLUDED.final_50;

-- Sara Bikila (STU-2002) Grades
INSERT INTO silo_student_grades (enrollment_id, quiz_10, assignment_10, mid_30, final_50)
VALUES
  ('e2000000-0000-0000-0000-000000000001', 9.5, 9.5, 28.0, 46.0),
  ('e2000000-0000-0000-0000-000000000002', 9.0, 9.0, 26.0, 44.5),
  ('e2000000-0000-0000-0000-000000000003', 9.5, 9.5, 27.5, 45.0),
  ('e2000000-0000-0000-0000-000000000004', 8.5, 9.0, 27.0, 43.5),
  ('e2000000-0000-0000-0000-000000000005', 9.5, 9.5, 29.0, 46.5)
ON CONFLICT (enrollment_id) DO UPDATE SET 
  quiz_10 = EXCLUDED.quiz_10, 
  assignment_10 = EXCLUDED.assignment_10,
  mid_30 = EXCLUDED.mid_30,
  final_50 = EXCLUDED.final_50;

COMMIT;
