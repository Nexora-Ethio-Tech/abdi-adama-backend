-- Enable Row Level Security on core tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

-- Utility to safely get current setting with a fallback
CREATE OR REPLACE FUNCTION current_app_role() RETURNS text AS $$
BEGIN
  RETURN current_setting('app.current_role', true);
EXCEPTION WHEN OTHERS THEN
  RETURN 'anon';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION current_app_user_id() RETURNS uuid AS $$
BEGIN
  RETURN current_setting('app.current_user_id', true)::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION current_app_branch_id() RETURNS uuid AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_branch_id', true), '')::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- USERS Table Policies
-- ============================================================================
-- 1. Super Admins can see and do everything
CREATE POLICY users_super_admin_all ON users
  AS PERMISSIVE FOR ALL
  TO public
  USING (current_app_role() = 'super-admin')
  WITH CHECK (current_app_role() = 'super-admin');

-- 2. Users can see their own profile
CREATE POLICY users_self_view ON users
  FOR SELECT
  TO public
  USING (id = current_app_user_id());

-- 3. School Admins can see users in their branch
CREATE POLICY users_school_admin_view ON users
  FOR SELECT
  TO public
  USING (current_app_role() = 'school-admin' AND branch_id = current_app_branch_id());

-- 4. School Admins can update users in their branch (but not other super-admins or school-admins)
CREATE POLICY users_school_admin_update ON users
  FOR UPDATE
  TO public
  USING (current_app_role() = 'school-admin' AND branch_id = current_app_branch_id() AND role NOT IN ('super-admin', 'school-admin'));

-- Allow insert during registration (which runs as 'anon' or via backend without RLS context)
-- Since the backend uses the pool user which has bypassrls or we wrap it in a transaction,
-- we need to ensure the registration can insert.
CREATE POLICY users_insert_all ON users
  FOR INSERT
  TO public
  WITH CHECK (true);

-- ============================================================================
-- STUDENTS Table Policies
-- ============================================================================
-- 1. Super Admins can see all
CREATE POLICY students_super_admin_view ON students FOR ALL TO public USING (current_app_role() = 'super-admin');

-- 2. School Admins and VP can see students in their branch
CREATE POLICY students_branch_admin_view ON students
  FOR SELECT
  TO public
  USING (current_app_role() IN ('school-admin', 'vice-principal', 'finance-clerk') AND branch_id = current_app_branch_id());

-- 3. Students can see their own data
CREATE POLICY students_self_view ON students
  FOR SELECT
  TO public
  USING (current_app_role() = 'student' AND user_id = current_app_user_id());

-- 4. Teachers can see students in their branch (assuming they need to grade them)
CREATE POLICY students_teacher_view ON students
  FOR SELECT
  TO public
  USING (current_app_role() = 'teacher' AND branch_id = current_app_branch_id());

-- Insert policy
CREATE POLICY students_insert_all ON students FOR INSERT TO public WITH CHECK (true);

-- ============================================================================
-- TEACHERS Table Policies
-- ============================================================================
-- 1. Super Admins can see all
CREATE POLICY teachers_super_admin_view ON teachers FOR ALL TO public USING (current_app_role() = 'super-admin');

-- 2. School Admins and VP can see teachers in their branch
CREATE POLICY teachers_branch_admin_view ON teachers
  FOR SELECT
  TO public
  USING (current_app_role() IN ('school-admin', 'vice-principal') AND branch_id = current_app_branch_id());

-- 3. Teachers can see their own data
CREATE POLICY teachers_self_view ON teachers
  FOR SELECT
  TO public
  USING (current_app_role() = 'teacher' AND user_id = current_app_user_id());

-- Insert policy
CREATE POLICY teachers_insert_all ON teachers FOR INSERT TO public WITH CHECK (true);

-- NOTE: Ensure the DB user (e.g. 'abdiadam') does NOT have BYPASSRLS privilege.
-- ALTER USER abdiadam NOBYPASSRLS;
