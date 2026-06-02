-- ============================================================
-- Create Missing Accounts & Parent-Student Links
-- PAR-MB-0001 → STD-MB-0011
-- PAR-MB-0006 → STD-MB-0007, STD-MB-0010
-- Main Branch ID: bb66fc0b-0deb-411d-9572-0a9631cbd456
-- ============================================================

DO $$
DECLARE
  v_main_branch_id   UUID := 'bb66fc0b-0deb-411d-9572-0a9631cbd456';

  -- User IDs
  v_par_0001_user_id  UUID;
  v_par_0006_user_id  UUID;
  v_std_0007_user_id  UUID;
  v_std_0010_user_id  UUID;
  v_std_0011_user_id  UUID;

  -- Student table IDs
  v_std_0007_id  UUID;
  v_std_0010_id  UUID;
  v_std_0011_id  UUID;

  -- Parent profile IDs
  v_par_0001_id  UUID;
  v_par_0006_id  UUID;

  -- PIN hashes (bcrypt of 4-digit PINs)
  -- PAR-MB-0001 PIN: 4721 → we'll store a bcrypt hash
  -- PAR-MB-0006 PIN: 8364
  -- For students, we'll use default PIN: 0000
  -- We'll use pgcrypto to hash; if unavailable, use a placeholder
  v_hash_4721  TEXT;
  v_hash_8364  TEXT;
  v_hash_0000  TEXT;
BEGIN
  -- ============================================================
  -- STEP 1: Hash the PINs using pgcrypto (if available)
  -- ============================================================
  BEGIN
    v_hash_4721 := crypt('4721', gen_salt('bf', 10));
    v_hash_8364 := crypt('8364', gen_salt('bf', 10));
    v_hash_0000 := crypt('0000', gen_salt('bf', 10));
  EXCEPTION WHEN undefined_function THEN
    -- pgcrypto not available; use a known bcrypt hash of these PINs
    -- These are bcrypt($2b$10$...) hashes generated externally
    -- We'll mark them so the user knows to reset after
    v_hash_4721 := '$2b$10$placeholder_4721_RESET_REQUIRED_xxxxxxxxxxxxxxxxxxxxxxxxx';
    v_hash_8364 := '$2b$10$placeholder_8364_RESET_REQUIRED_xxxxxxxxxxxxxxxxxxxxxxxxx';
    v_hash_0000 := '$2b$10$placeholder_0000_RESET_REQUIRED_xxxxxxxxxxxxxxxxxxxxxxxxx';
    RAISE NOTICE 'pgcrypto unavailable – placeholder hashes used. Please reset PINs via the admin panel.';
  END;

  -- ============================================================
  -- STEP 2: Create or update PAR-MB-0001
  -- ============================================================
  SELECT id INTO v_par_0001_user_id
  FROM users WHERE digital_id = 'PAR-MB-0001' LIMIT 1;

  IF v_par_0001_user_id IS NULL THEN
    INSERT INTO users (digital_id, username, name, email, password_hash, role, branch_id, status, is_active)
    VALUES (
      'PAR-MB-0001',
      'par-mb-0001',
      'Parent MB 0001',
      'par-mb-0001@abdiadama.school',
      v_hash_4721,
      'parent',
      v_main_branch_id,
      'Approved',
      TRUE
    ) RETURNING id INTO v_par_0001_user_id;
    RAISE NOTICE 'Created PAR-MB-0001 user: %', v_par_0001_user_id;
  ELSE
    -- Update email and password to match user's spec
    UPDATE users
    SET email = 'par-mb-0001@abdiadama.school',
        password_hash = v_hash_4721,
        status = 'Approved',
        branch_id = v_main_branch_id,
        updated_at = NOW()
    WHERE id = v_par_0001_user_id;
    RAISE NOTICE 'Updated PAR-MB-0001 user: %', v_par_0001_user_id;
  END IF;

  -- Ensure parents profile row
  INSERT INTO parents (user_id, branch_id)
  VALUES (v_par_0001_user_id, v_main_branch_id)
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_par_0001_id FROM parents WHERE user_id = v_par_0001_user_id LIMIT 1;
  RAISE NOTICE 'PAR-MB-0001 parent profile id: %', v_par_0001_id;

  -- ============================================================
  -- STEP 3: Create PAR-MB-0006
  -- ============================================================
  SELECT id INTO v_par_0006_user_id
  FROM users WHERE digital_id = 'PAR-MB-0006' LIMIT 1;

  IF v_par_0006_user_id IS NULL THEN
    INSERT INTO users (digital_id, username, name, email, password_hash, role, branch_id, status, is_active)
    VALUES (
      'PAR-MB-0006',
      'par-mb-0006',
      'Parent MB 0006',
      'par-mb-0006@abdiadama.school',
      v_hash_8364,
      'parent',
      v_main_branch_id,
      'Approved',
      TRUE
    ) RETURNING id INTO v_par_0006_user_id;
    RAISE NOTICE 'Created PAR-MB-0006 user: %', v_par_0006_user_id;
  ELSE
    UPDATE users
    SET email = 'par-mb-0006@abdiadama.school',
        password_hash = v_hash_8364,
        status = 'Approved',
        branch_id = v_main_branch_id,
        updated_at = NOW()
    WHERE id = v_par_0006_user_id;
    RAISE NOTICE 'Updated PAR-MB-0006 user: %', v_par_0006_user_id;
  END IF;

  -- Ensure parents profile row
  INSERT INTO parents (user_id, branch_id)
  VALUES (v_par_0006_user_id, v_main_branch_id)
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_par_0006_id FROM parents WHERE user_id = v_par_0006_user_id LIMIT 1;
  RAISE NOTICE 'PAR-MB-0006 parent profile id: %', v_par_0006_id;

  -- ============================================================
  -- STEP 4: Create students STD-MB-0007, STD-MB-0010, STD-MB-0011
  -- ============================================================

  -- STD-MB-0007
  SELECT id INTO v_std_0007_user_id FROM users WHERE digital_id = 'STD-MB-0007' LIMIT 1;
  IF v_std_0007_user_id IS NULL THEN
    INSERT INTO users (digital_id, username, name, email, password_hash, role, branch_id, status, is_active)
    VALUES ('STD-MB-0007','std-mb-0007','Student MB 0007','std-mb-0007@abdiadama.school',
            v_hash_0000,'student',v_main_branch_id,'Approved',TRUE)
    RETURNING id INTO v_std_0007_user_id;
    INSERT INTO students (user_id, branch_id, grade, status) VALUES (v_std_0007_user_id, v_main_branch_id, 'Grade 5', 'Active');
    RAISE NOTICE 'Created STD-MB-0007: %', v_std_0007_user_id;
  END IF;
  SELECT id INTO v_std_0007_id FROM students WHERE user_id = v_std_0007_user_id LIMIT 1;

  -- STD-MB-0010
  SELECT id INTO v_std_0010_user_id FROM users WHERE digital_id = 'STD-MB-0010' LIMIT 1;
  IF v_std_0010_user_id IS NULL THEN
    INSERT INTO users (digital_id, username, name, email, password_hash, role, branch_id, status, is_active)
    VALUES ('STD-MB-0010','std-mb-0010','Student MB 0010','std-mb-0010@abdiadama.school',
            v_hash_0000,'student',v_main_branch_id,'Approved',TRUE)
    RETURNING id INTO v_std_0010_user_id;
    INSERT INTO students (user_id, branch_id, grade, status) VALUES (v_std_0010_user_id, v_main_branch_id, 'Grade 6', 'Active');
    RAISE NOTICE 'Created STD-MB-0010: %', v_std_0010_user_id;
  END IF;
  SELECT id INTO v_std_0010_id FROM students WHERE user_id = v_std_0010_user_id LIMIT 1;

  -- STD-MB-0011
  SELECT id INTO v_std_0011_user_id FROM users WHERE digital_id = 'STD-MB-0011' LIMIT 1;
  IF v_std_0011_user_id IS NULL THEN
    INSERT INTO users (digital_id, username, name, email, password_hash, role, branch_id, status, is_active)
    VALUES ('STD-MB-0011','std-mb-0011','Student MB 0011','std-mb-0011@abdiadama.school',
            v_hash_0000,'student',v_main_branch_id,'Approved',TRUE)
    RETURNING id INTO v_std_0011_user_id;
    INSERT INTO students (user_id, branch_id, grade, status) VALUES (v_std_0011_user_id, v_main_branch_id, 'Grade 7', 'Active');
    RAISE NOTICE 'Created STD-MB-0011: %', v_std_0011_user_id;
  END IF;
  SELECT id INTO v_std_0011_id FROM students WHERE user_id = v_std_0011_user_id LIMIT 1;

  -- ============================================================
  -- STEP 5: Create parent_student links
  -- ============================================================

  -- PAR-MB-0001 → STD-MB-0011
  IF v_par_0001_id IS NOT NULL AND v_std_0011_id IS NOT NULL THEN
    INSERT INTO parent_student (parent_id, student_id)
    VALUES (v_par_0001_id, v_std_0011_id)
    ON CONFLICT (parent_id, student_id) DO NOTHING;
    RAISE NOTICE 'Linked PAR-MB-0001 → STD-MB-0011';
  END IF;

  -- PAR-MB-0006 → STD-MB-0007
  IF v_par_0006_id IS NOT NULL AND v_std_0007_id IS NOT NULL THEN
    INSERT INTO parent_student (parent_id, student_id)
    VALUES (v_par_0006_id, v_std_0007_id)
    ON CONFLICT (parent_id, student_id) DO NOTHING;
    RAISE NOTICE 'Linked PAR-MB-0006 → STD-MB-0007';
  END IF;

  -- PAR-MB-0006 → STD-MB-0010
  IF v_par_0006_id IS NOT NULL AND v_std_0010_id IS NOT NULL THEN
    INSERT INTO parent_student (parent_id, student_id)
    VALUES (v_par_0006_id, v_std_0010_id)
    ON CONFLICT (parent_id, student_id) DO NOTHING;
    RAISE NOTICE 'Linked PAR-MB-0006 → STD-MB-0010';
  END IF;

END $$;

-- ============================================================
-- STEP 6: Verify final state
-- ============================================================
SELECT
  pu.digital_id        AS parent_digital_id,
  pu.name              AS parent_name,
  pu.email             AS parent_email,
  su.digital_id        AS student_digital_id,
  su.name              AS student_name,
  s.grade              AS student_grade
FROM parents p
JOIN users pu ON p.user_id = pu.id
JOIN parent_student ps ON ps.parent_id = p.id
JOIN students s ON s.id = ps.student_id
JOIN users su ON su.id = s.user_id
WHERE pu.digital_id IN ('PAR-MB-0001', 'PAR-MB-0006')
ORDER BY pu.digital_id, su.digital_id;
