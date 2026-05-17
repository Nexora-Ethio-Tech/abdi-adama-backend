-- Seed family links, grades, stats, communication book, and announcements for STU-8995
-- Modified to comply with the modern v2 database structure.

DO $$
DECLARE
  v_identity_id    UUID;
  v_parent_user_id UUID;
  v_section_id     UUID := 'd1000000-0000-0000-0000-000000000001'; -- Grade 10A
  v_course_math    UUID;
  v_course_english UUID;
  v_course_biology UUID;
  v_course_physics UUID;
  v_enroll_id      UUID;
BEGIN
  -- Get identity for our test student
  SELECT id INTO v_identity_id FROM silo_identities WHERE school_id = 'STU-8995';

  IF v_identity_id IS NULL THEN
    RAISE EXCEPTION 'Student STU-8995 not found. Please create them first.';
  END IF;

  -- Get the Parent user row for this same identity
  SELECT id INTO v_parent_user_id FROM silo_users
  WHERE identity_id = v_identity_id AND role = 'Parent';

  IF v_parent_user_id IS NULL THEN
    RAISE EXCEPTION 'Parent user for STU-8995 not found. Please create them first.';
  END IF;

  -- 1. Family Link (Parent → Student)
  INSERT INTO silo_family_links (parent_user_id, student_identity_id)
  VALUES (v_parent_user_id, v_identity_id)
  ON CONFLICT DO NOTHING;

  -- Get/Insert Courses
  SELECT id INTO v_course_math FROM silo_courses WHERE code = 'MATH10';
  SELECT id INTO v_course_english FROM silo_courses WHERE code = 'ENGL10';
  SELECT id INTO v_course_biology FROM silo_courses WHERE code = 'BIO10';
  SELECT id INTO v_course_physics FROM silo_courses WHERE code = 'PHYS10';

  -- 2. Academic Grades (EC 2017 + EC 2016 mapped to v2 enrollments)
  
  -- Enrollment 1: Mathematics (2025/2026, Sem 2)
  INSERT INTO silo_enrollments (id, student_id, course_id, section_id, academic_year, semester, progress)
  VALUES ('e8995000-0000-0000-0000-000000000001', v_identity_id, v_course_math, v_section_id, '2025/2026', 2, 85)
  ON CONFLICT (student_id, course_id, academic_year, semester) DO UPDATE SET progress = 85
  RETURNING id INTO v_enroll_id;

  INSERT INTO silo_student_grades (enrollment_id, quiz_10, assignment_10, mid_30, final_50)
  VALUES (v_enroll_id, 8, 9, 26, 42)
  ON CONFLICT (enrollment_id) DO UPDATE SET quiz_10 = 8, assignment_10 = 9, mid_30 = 26, final_50 = 42;

  -- Enrollment 2: English Language (2025/2026, Sem 2)
  INSERT INTO silo_enrollments (id, student_id, course_id, section_id, academic_year, semester, progress)
  VALUES ('e8995000-0000-0000-0000-000000000002', v_identity_id, v_course_english, v_section_id, '2025/2026', 2, 78)
  ON CONFLICT (student_id, course_id, academic_year, semester) DO UPDATE SET progress = 78
  RETURNING id INTO v_enroll_id;

  INSERT INTO silo_student_grades (enrollment_id, quiz_10, assignment_10, mid_30, final_50)
  VALUES (v_enroll_id, 7, 8, 24, 38)
  ON CONFLICT (enrollment_id) DO UPDATE SET quiz_10 = 7, assignment_10 = 8, mid_30 = 24, final_50 = 38;

  -- Enrollment 3: Biology (2025/2026, Sem 2)
  INSERT INTO silo_enrollments (id, student_id, course_id, section_id, academic_year, semester, progress)
  VALUES ('e8995000-0000-0000-0000-000000000003', v_identity_id, v_course_biology, v_section_id, '2025/2026', 2, 92)
  ON CONFLICT (student_id, course_id, academic_year, semester) DO UPDATE SET progress = 92
  RETURNING id INTO v_enroll_id;

  INSERT INTO silo_student_grades (enrollment_id, quiz_10, assignment_10, mid_30, final_50)
  VALUES (v_enroll_id, 9, 9, 28, 45)
  ON CONFLICT (enrollment_id) DO UPDATE SET quiz_10 = 9, assignment_10 = 9, mid_30 = 28, final_50 = 45;

  -- Enrollment 4: Physics (2024/2025, Sem 1)
  INSERT INTO silo_enrollments (id, student_id, course_id, section_id, academic_year, semester, progress)
  VALUES ('e8995000-0000-0000-0000-000000000004', v_identity_id, v_course_physics, v_section_id, '2024/2025', 1, 90)
  ON CONFLICT (student_id, course_id, academic_year, semester) DO UPDATE SET progress = 90
  RETURNING id INTO v_enroll_id;

  INSERT INTO silo_student_grades (enrollment_id, quiz_10, assignment_10, mid_30, final_50)
  VALUES (v_enroll_id, 6, 7, 22, 36)
  ON CONFLICT (enrollment_id) DO UPDATE SET quiz_10 = 6, assignment_10 = 7, mid_30 = 22, final_50 = 36;

  -- Enrollment 5: Mathematics (2024/2025, Sem 1)
  INSERT INTO silo_enrollments (id, student_id, course_id, section_id, academic_year, semester, progress)
  VALUES ('e8995000-0000-0000-0000-000000000005', v_identity_id, v_course_math, v_section_id, '2024/2025', 1, 88)
  ON CONFLICT (student_id, course_id, academic_year, semester) DO UPDATE SET progress = 88
  RETURNING id INTO v_enroll_id;

  INSERT INTO silo_student_grades (enrollment_id, quiz_10, assignment_10, mid_30, final_50)
  VALUES (v_enroll_id, 9, 8, 25, 40)
  ON CONFLICT (enrollment_id) DO UPDATE SET quiz_10 = 9, assignment_10 = 8, mid_30 = 25, final_50 = 40;

  -- 3. Student Stats
  INSERT INTO silo_student_stats (student_id, attendance_percentage, academic_rank)
  VALUES (v_identity_id, 94.5, 3)
  ON CONFLICT (student_id) DO UPDATE
    SET attendance_percentage = 94.5, academic_rank = 3;

  -- 4. Communication Book (Weekly Behavioral)
  INSERT INTO silo_communication_book
    (student_id, week_ending, uniform, materials, homework, participation,
     conduct, social, punctuality, note_taking,
     teacher_observation, progress_insight)
  VALUES (
    v_identity_id, CURRENT_DATE,
    4, 3, 4, 3, 4, 4, 3, 3,
    'Student shows great improvement in class engagement this week.',
    'Continue to encourage participation in group projects.'
  ) ON CONFLICT DO NOTHING;

  -- 5. School Announcement
  INSERT INTO silo_announcements (priority, title, content)
  VALUES (
    'High',
    'End of Term Exams',
    'Final exams for EC 2017 will begin on Hamle 5. All students must arrive by 7:30 AM.'
  ) ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Seed complete. identity_id=%, parent_user_id=%', v_identity_id, v_parent_user_id;
END;
$$;
