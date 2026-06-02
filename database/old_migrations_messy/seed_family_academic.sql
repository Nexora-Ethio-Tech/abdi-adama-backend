-- Seed family links, grades, stats, communication book, and announcements for STU-8995

DO $$
DECLARE
  v_identity_id    UUID;
  v_parent_user_id UUID;
BEGIN
  -- Get identity for our test student
  SELECT id INTO v_identity_id FROM silo_identities WHERE school_id = 'STU-8995';

  IF v_identity_id IS NULL THEN
    RAISE EXCEPTION 'Student STU-8995 not found. Please create them first.';
  END IF;

  -- Get the Parent user row for this same identity
  SELECT id INTO v_parent_user_id FROM silo_users
  WHERE identity_id = v_identity_id AND role = 'Parent';

  -- 1. Family Link (Parent ΓåÆ Student)
  INSERT INTO silo_family_links (parent_user_id, student_identity_id)
  VALUES (v_parent_user_id, v_identity_id)
  ON CONFLICT DO NOTHING;

  -- 2. Academic Grades (EC 2017 + EC 2016)
  INSERT INTO silo_student_grades
    (student_id, subject, mid_30, quiz_10, assignment_10, final_50, teacher_name, academic_year)
  VALUES
    (v_identity_id, 'Mathematics', 26, 8, 9, 42, 'Ato Kebede',   'EC 2017'),
    (v_identity_id, 'English',     24, 7, 8, 38, 'W/ro Tigist',  'EC 2017'),
    (v_identity_id, 'Biology',     28, 9, 9, 45, 'Ato Alemu',    'EC 2017'),
    (v_identity_id, 'Physics',     22, 6, 7, 36, 'Ato Samuel',   'EC 2016'),
    (v_identity_id, 'Mathematics', 25, 9, 8, 40, 'Ato Kebede',   'EC 2016')
  ON CONFLICT DO NOTHING;

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
  );

  -- 5. School Announcement
  INSERT INTO silo_announcements (priority, title, content)
  VALUES (
    'High',
    'End of Term Exams',
    'Final exams for EC 2017 will begin on Hamle 5. All students must arrive by 7:30 AM.'
  );

  RAISE NOTICE 'Seed complete. identity_id=%, parent_user_id=%', v_identity_id, v_parent_user_id;
END;
$$;
