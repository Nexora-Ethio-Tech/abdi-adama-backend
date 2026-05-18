-- =============================================================================
-- seed_bikila_family.sql
-- Seeds the "Bikila" family test data for integration testing.
--
-- Inserts:
--   PAR-1001 ΓåÆ Mr. Bikila (Parent)
--   STU-2001 ΓåÆ Abebe Bikila (Student)
--   STU-2002 ΓåÆ Sara Bikila  (Student)
--   Family links: Mr. Bikila is linked to both children
--   Academic grades for EC 2017 / 2024-2025 for both students
--
-- PIN for all accounts: 1234 (bcrypt hash of "1234" with 10 rounds)
-- Replace the hash below with the output of:
--   node -e "const b=require('bcrypt'); b.hash('1234',10).then(h=>console.log(h))"
-- =============================================================================

BEGIN;

-- ΓöÇΓöÇΓöÇ Step 1: Insert Identities ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

INSERT INTO silo_identities (id, school_id, full_name)
VALUES
  ('a1000000-0000-0000-0000-000000000001', 'PAR-1001', 'Mr. Bikila'),
  ('a2000000-0000-0000-0000-000000000002', 'STU-2001', 'Abebe Bikila'),
  ('a3000000-0000-0000-0000-000000000003', 'STU-2002', 'Sara Bikila')
ON CONFLICT (school_id) DO NOTHING;

-- ΓöÇΓöÇΓöÇ Step 2: Insert User accounts ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
-- bcrypt hash of "1234" (10 rounds). Replace with live hash for production.

INSERT INTO silo_users (id, identity_id, role, password_hash, is_active)
VALUES
  -- Mr. Bikila ΓåÆ Parent
  ('b1000000-0000-0000-0000-000000000001',
   'a1000000-0000-0000-0000-000000000001',
   'Parent',
   '$2b$10$YourBcryptHashFor1234HereReplaceMe1111111111111111111',
   TRUE),

  -- Abebe Bikila ΓåÆ Student
  ('b2000000-0000-0000-0000-000000000002',
   'a2000000-0000-0000-0000-000000000002',
   'Student',
   '$2b$10$YourBcryptHashFor1234HereReplaceMe1111111111111111111',
   TRUE),

  -- Sara Bikila ΓåÆ Student
  ('b3000000-0000-0000-0000-000000000003',
   'a3000000-0000-0000-0000-000000000003',
   'Student',
   '$2b$10$YourBcryptHashFor1234HereReplaceMe1111111111111111111',
   TRUE)
ON CONFLICT (identity_id, role) DO NOTHING;

-- ΓöÇΓöÇΓöÇ Step 3: Family Links ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
-- Mr. Bikila (Parent user) is linked to both student identities

INSERT INTO silo_family_links (parent_user_id, student_identity_id)
VALUES
  ('b1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000002'), -- ΓåÆ Abebe
  ('b1000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000003')  -- ΓåÆ Sara
ON CONFLICT (parent_user_id, student_identity_id) DO NOTHING;

-- ΓöÇΓöÇΓöÇ Step 4: Academic Grades (EC 2017 / 2024-2025) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

-- Abebe Bikila grades
INSERT INTO silo_student_grades (student_id, subject, mid_30, quiz_10, assignment_10, final_50, teacher_name, academic_year)
VALUES
  ('a2000000-0000-0000-0000-000000000002', 'Mathematics',     25.5,  8.5,  9.0,  42.0, 'Ato Tesfaye Lemma',   'EC 2017'),
  ('a2000000-0000-0000-0000-000000000002', 'English Language', 22.0,  7.0,  8.5,  38.5, 'W/ro Almaz Haile',   'EC 2017'),
  ('a2000000-0000-0000-0000-000000000002', 'Amharic',         27.0,  9.0,  9.5,  44.0, 'Ato Girma Bekele',   'EC 2017'),
  ('a2000000-0000-0000-0000-000000000002', 'Science',         24.0,  8.0,  8.0,  40.5, 'W/ro Tigist Alemu',  'EC 2017'),
  ('a2000000-0000-0000-0000-000000000002', 'Social Studies',  26.5,  9.5,  9.0,  43.0, 'Ato Henok Gebre',    'EC 2017')
ON CONFLICT DO NOTHING;

-- Sara Bikila grades
INSERT INTO silo_student_grades (student_id, subject, mid_30, quiz_10, assignment_10, final_50, teacher_name, academic_year)
VALUES
  ('a3000000-0000-0000-0000-000000000003', 'Mathematics',     28.0,  9.5,  9.5,  46.0, 'Ato Tesfaye Lemma',   'EC 2017'),
  ('a3000000-0000-0000-0000-000000000003', 'English Language', 26.0,  9.0,  9.0,  44.5, 'W/ro Almaz Haile',   'EC 2017'),
  ('a3000000-0000-0000-0000-000000000003', 'Amharic',         27.5,  9.5,  9.5,  45.0, 'Ato Girma Bekele',   'EC 2017'),
  ('a3000000-0000-0000-0000-000000000003', 'Science',         27.0,  8.5,  9.0,  43.5, 'W/ro Tigist Alemu',  'EC 2017'),
  ('a3000000-0000-0000-0000-000000000003', 'Social Studies',  29.0,  9.5,  9.5,  46.5, 'Ato Henok Gebre',    'EC 2017')
ON CONFLICT DO NOTHING;

COMMIT;

-- =============================================================================
-- NOTE: After inserting, generate a real bcrypt hash and UPDATE the rows:
--
--   UPDATE silo_users
--   SET password_hash = '$2b$10$<real-hash-here>'
--   WHERE identity_id IN (
--     'a1000000-0000-0000-0000-000000000001',
--     'a2000000-0000-0000-0000-000000000002',
--     'a3000000-0000-0000-0000-000000000003'
--   );
-- =============================================================================
