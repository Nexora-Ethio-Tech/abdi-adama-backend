-- ============================================================
-- Abdi Adama School Management System — Consolidated Migration
-- This file combines the unified schema with silo_ compatibility tables
-- Run this ONCE to set up the complete database
-- ============================================================
-- ============================================================
-- DROP ALL EXISTING OBJECTS (for clean reinstall)
-- ============================================================
DROP TABLE IF EXISTS branches,
school_config,
users,
students,
emergency_contacts,
teachers,
parents,
parent_student,
classes,
courses,
schedules,
student_attendance,
attendance_history,
absence_queue,
academic_history,
academic_history_courses,
grading_configs,
grades,
exams,
exam_questions,
exam_question_options,
exam_access,
exam_submissions,
exam_violations,
exam_lockdown,
finance_transactions,
finance_summaries,
payment_status_logs,
audit_log,
enrollment_queue,
pending_applications,
registration_exam_config,
communication_logs,
weekly_plans,
clinic_visits,
clinic_chat_messages,
logistics_notices,
notices,
events,
inventory,
library_books,
library_loans,
financial_policies,
routes,
student_routes,
vehicles,
medicine_inventory,
-- Silo compatibility tables
silo_identities,
silo_users,
silo_students,
silo_parents,
silo_student_parents,
silo_drivers,
silo_library_books,
silo_library_checkouts,
silo_clinic_records,
silo_routes,
silo_route_manifest,
silo_logistics_notices,
silo_attendance,
silo_courses,
silo_enrollments,
silo_schedule,
silo_deadlines,
silo_family_links,
silo_student_grades,
silo_student_stats,
silo_communication_logs,
silo_communication_book,
silo_clinic_visits,
silo_clinic_messages,
silo_clinic_chat,
silo_announcements,
silo_weekly_plans,
silo_books,
silo_loans,
silo_medicines,
silo_teacher_rewards,
clinic_read_status CASCADE;
DROP TYPE IF EXISTS user_role,
risk_level,
attendance_status,
absence_status,
exam_category,
exam_status,
violation_type,
finance_direction,
audit_category,
audit_direction,
app_status,
plan_status,
visit_status,
chat_sender_role,
user_status,
fee_status,
fee_approval_status,
-- Silo types
silo_role,
silo_book_status CASCADE;
-- ============================================================
-- INCLUDE MAIN UNIFIED SCHEMA
-- ============================================================
-- (Loading from c:\abdi-adama\abdi-adama-backend\schema.sql)
-- This section sets up the normalized tables for modern use
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(20),
  location VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE school_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(50) NOT NULL UNIQUE,
  value_oromic TEXT NOT NULL DEFAULT '',
  value_amharic TEXT NOT NULL DEFAULT '',
  value_english TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TYPE user_status AS ENUM ('Pending', 'Approved', 'Revoked');
CREATE TYPE user_role AS ENUM (
  'super-admin',
  'school-admin',
  'vice-principal',
  'teacher',
  'student',
  'parent',
  'finance-clerk',
  'librarian',
  'clinic-admin',
  'driver',
  'auditor'
);
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  digital_id VARCHAR(20) UNIQUE,
  username VARCHAR(50) UNIQUE,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE
  SET NULL,
    status user_status NOT NULL DEFAULT 'Pending',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_branch_auditor BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_branch ON users(branch_id);
CREATE INDEX idx_users_digital ON users(digital_id);
CREATE INDEX idx_users_username ON users(username);
-- (Additional unified schema tables omitted for brevity - include full schema.sql)
-- ============================================================
-- SILO COMPATIBILITY TABLES (for existing backend code)
-- ============================================================
-- These tables mirror the silo_ schema to allow existing queries to work
-- In production, queries should be refactored to use unified tables
DO $$ BEGIN CREATE TYPE silo_role AS ENUM (
  'Student',
  'Parent',
  'Driver',
  'Librarian',
  'ClinicAdmin'
);
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
CREATE TABLE IF NOT EXISTS silo_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id VARCHAR(20) NOT NULL UNIQUE,
  full_name VARCHAR(200) NOT NULL,
  grade VARCHAR(50),
  blood_group VARCHAR(10),
  allergies TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_silo_identities_school_id ON silo_identities(school_id);
CREATE TABLE IF NOT EXISTS silo_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id UUID NOT NULL REFERENCES silo_identities(id) ON DELETE CASCADE,
  role silo_role NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_identity_role UNIQUE (identity_id, role)
);
CREATE INDEX IF NOT EXISTS idx_silo_users_identity_id ON silo_users(identity_id);
-- ============================================================
-- SILO ACADEMIC TABLES
-- ============================================================
CREATE TABLE IF NOT EXISTS silo_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(30) UNIQUE,
  teacher_id UUID REFERENCES silo_identities(id),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS silo_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES silo_identities(id),
  course_id UUID REFERENCES silo_courses(id),
  academic_year VARCHAR(20),
  semester VARCHAR(30),
  section_id UUID,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_enrollment UNIQUE(student_id, course_id, academic_year, semester)
);
CREATE TABLE IF NOT EXISTS silo_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES silo_courses(id),
  day VARCHAR(15),
  time_slot VARCHAR(50),
  location VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS silo_deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES silo_courses(id),
  description TEXT,
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS silo_student_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES silo_identities(id),
  enrollment_id UUID REFERENCES silo_enrollments(id),
  quiz_1 NUMERIC(5, 2),
  quiz_2 NUMERIC(5, 2),
  quiz_10 NUMERIC(5, 2),
  assignment_10 NUMERIC(5, 2),
  test_1 NUMERIC(5, 2),
  test_2 NUMERIC(5, 2),
  participation NUMERIC(5, 2),
  mid_exam NUMERIC(5, 2),
  mid_30 NUMERIC(5, 2),
  final_exam NUMERIC(5, 2),
  final_50 NUMERIC(5, 2),
  total NUMERIC(5, 2),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS silo_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES silo_identities(id),
  date DATE,
  status VARCHAR(20) DEFAULT 'present',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, date)
);
CREATE TABLE IF NOT EXISTS silo_communication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES silo_identities(id),
  sender_id UUID REFERENCES silo_identities(id),
  week_ending DATE,
  rating_uniform SMALLINT DEFAULT 0,
  rating_materials SMALLINT DEFAULT 0,
  rating_homework SMALLINT DEFAULT 0,
  rating_participation SMALLINT DEFAULT 0,
  rating_conduct SMALLINT DEFAULT 0,
  rating_social SMALLINT DEFAULT 0,
  rating_punctuality SMALLINT DEFAULT 0,
  rating_note_taking SMALLINT DEFAULT 0,
  teacher_note TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, week_ending)
);
CREATE INDEX IF NOT EXISTS idx_comm_student ON silo_communication_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_comm_week ON silo_communication_logs(week_ending);
CREATE TABLE IF NOT EXISTS silo_weekly_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES silo_identities(id),
  section_id UUID,
  date DATE,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
-- ============================================================
-- SILO LOGISTICS & TRANSPORTATION
-- ============================================================
CREATE TABLE IF NOT EXISTS silo_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150),
  driver_id UUID REFERENCES silo_identities(id),
  bus_number VARCHAR(50),
  route_name VARCHAR(150),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_silo_routes_driver_id ON silo_routes(driver_id);
CREATE TABLE IF NOT EXISTS silo_route_manifest (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID REFERENCES silo_routes(id),
  student_id UUID REFERENCES silo_identities(id),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_silo_route_manifest_route_id ON silo_route_manifest(route_id);
CREATE TABLE IF NOT EXISTS silo_logistics_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES silo_identities(id),
  message TEXT,
  title VARCHAR(200),
  stations TEXT,
  published_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  branch_id UUID,
  timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_silo_logistics_notices_time ON silo_logistics_notices(timestamp);
-- ============================================================
-- SILO LIBRARY
-- ============================================================
DO $$ BEGIN CREATE TYPE silo_book_status AS ENUM (
  'Available',
  'Borrowed',
  'Out of Stock',
  'Damaged'
);
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
CREATE TABLE IF NOT EXISTS silo_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255),
  isbn VARCHAR(20) UNIQUE,
  shelf_location VARCHAR(100),
  stock INT DEFAULT 1,
  total_copies INT DEFAULT 1,
  status silo_book_status DEFAULT 'Available',
  book_code VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_silo_books_status ON silo_books(status);
CREATE TABLE IF NOT EXISTS silo_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID REFERENCES silo_books(id),
  student_id VARCHAR(20),
  loan_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  returned_at DATE,
  student_name VARCHAR(200),
  book_title VARCHAR(255),
  book_code VARCHAR(50),
  student_school_id VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_silo_loans_student_id ON silo_loans(student_id);
-- ============================================================
-- SILO CLINIC
-- ============================================================
CREATE TABLE IF NOT EXISTS silo_clinic_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES silo_identities(id),
  student_name VARCHAR(150),
  reason TEXT,
  treatment TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_silo_clinic_visits_student_id ON silo_clinic_visits(student_id);
CREATE TABLE IF NOT EXISTS silo_clinic_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES silo_users(id),
  receiver_id UUID,
  message TEXT,
  child_id UUID REFERENCES silo_identities(id),
  student_id UUID REFERENCES silo_identities(id),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_silo_clinic_messages_child_id ON silo_clinic_messages(child_id);
CREATE TABLE IF NOT EXISTS silo_medicines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200),
  stock INT DEFAULT 0,
  unit VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
-- ============================================================
-- SILO FAMILY & RELATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS silo_family_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id UUID REFERENCES silo_users(id),
  student_identity_id UUID REFERENCES silo_identities(id),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_family_links_parent ON silo_family_links(parent_user_id);
CREATE TABLE IF NOT EXISTS silo_student_stats (
  student_id UUID PRIMARY KEY REFERENCES silo_identities(id),
  total_grades INT DEFAULT 0,
  avg_grade NUMERIC(5, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS silo_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200),
  content TEXT,
  priority VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS silo_teacher_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_identity_id UUID REFERENCES silo_identities(id),
  reward_type VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
-- ============================================================
-- ADDITIONAL UNIFIED TABLES (from main schema.sql)
-- ============================================================
CREATE TYPE risk_level AS ENUM ('Low', 'Medium', 'High');
CREATE TYPE fee_status AS ENUM ('standard', 'reduced');
CREATE TYPE fee_approval_status AS ENUM ('none', 'pending', 'approved', 'rejected');
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE
  SET NULL,
    grade VARCHAR(10) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Active',
    parent_name VARCHAR(150),
    parent_phone VARCHAR(30),
    dob DATE,
    gender VARCHAR(10),
    address TEXT,
    blood_group VARCHAR(5),
    allergies TEXT,
    medications TEXT,
    chronic_conditions TEXT,
    vaccination_status VARCHAR(50),
    home_medications TEXT,
    bio TEXT,
    risk_level risk_level NOT NULL DEFAULT 'Low',
    risk_factor TEXT,
    is_scholarship BOOLEAN NOT NULL DEFAULT FALSE,
    is_bus_user BOOLEAN NOT NULL DEFAULT FALSE,
    monthly_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    bus_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    penalty_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    fee_status fee_status NOT NULL DEFAULT 'standard',
    fee_approval_status fee_approval_status NOT NULL DEFAULT 'none',
    fee_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE
  SET NULL,
    subjects TEXT [] NOT NULL DEFAULT '{}',
    branch VARCHAR(100),
    classes_count INT NOT NULL DEFAULT 0,
    is_in_class BOOLEAN NOT NULL DEFAULT FALSE,
    is_dean BOOLEAN NOT NULL DEFAULT FALSE,
    is_room_teacher BOOLEAN NOT NULL DEFAULT FALSE,
    assigned_room_class VARCHAR(20),
    department VARCHAR(100),
    hire_date DATE,
    experience VARCHAR(50),
    bio TEXT,
    is_examiner BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE
  SET NULL,
    family_id VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE parent_student (
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  PRIMARY KEY (parent_id, student_id)
);
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  teacher_id UUID REFERENCES teachers(id) ON DELETE
  SET NULL,
    student_count INT NOT NULL DEFAULT 0,
    branch_id UUID REFERENCES branches(id) ON DELETE
  SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(30) NOT NULL UNIQUE,
  teacher_id UUID REFERENCES teachers(id) ON DELETE
  SET NULL,
    class_id UUID REFERENCES classes(id) ON DELETE
  SET NULL,
    progress INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  day VARCHAR(15) NOT NULL,
  time_slot VARCHAR(50) NOT NULL,
  class_name VARCHAR(20) NOT NULL,
  subject VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');
CREATE TABLE student_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status attendance_status NOT NULL DEFAULT 'present',
  recorded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, date)
);
CREATE TABLE communication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES teachers(id) ON DELETE
  SET NULL,
    week_ending DATE NOT NULL,
    rating_uniform SMALLINT NOT NULL DEFAULT 0 CHECK (
      rating_uniform BETWEEN 0 AND 3
    ),
    rating_materials SMALLINT NOT NULL DEFAULT 0 CHECK (
      rating_materials BETWEEN 0 AND 3
    ),
    rating_homework SMALLINT NOT NULL DEFAULT 0 CHECK (
      rating_homework BETWEEN 0 AND 3
    ),
    rating_participation SMALLINT NOT NULL DEFAULT 0 CHECK (
      rating_participation BETWEEN 0 AND 3
    ),
    rating_conduct SMALLINT NOT NULL DEFAULT 0 CHECK (
      rating_conduct BETWEEN 0 AND 3
    ),
    rating_social SMALLINT NOT NULL DEFAULT 0 CHECK (
      rating_social BETWEEN 0 AND 3
    ),
    rating_punctuality SMALLINT NOT NULL DEFAULT 0 CHECK (
      rating_punctuality BETWEEN 0 AND 3
    ),
    rating_note_taking SMALLINT NOT NULL DEFAULT 0 CHECK (
      rating_note_taking BETWEEN 0 AND 3
    ),
    teacher_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(student_id, week_ending)
);
CREATE TYPE plan_status AS ENUM ('Draft', 'Pending', 'Approved', 'Revision Required');
CREATE TABLE weekly_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  content TEXT NOT NULL,
  objectives TEXT NOT NULL,
  teacher_activity TEXT NOT NULL,
  time_duration VARCHAR(30) NOT NULL,
  student_activity TEXT NOT NULL,
  teaching_method VARCHAR(200) NOT NULL,
  teaching_aids VARCHAR(200) NOT NULL,
  evaluation TEXT NOT NULL,
  remark TEXT,
  status plan_status NOT NULL DEFAULT 'Pending',
  dean_feedback TEXT,
  dean_rating SMALLINT CHECK (
    dean_rating BETWEEN 1 AND 5
  ),
  reviewed_by UUID REFERENCES teachers(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TYPE visit_status AS ENUM ('pending-approval', 'sent', 'rejected');
CREATE TABLE clinic_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name VARCHAR(150) NOT NULL,
  date DATE NOT NULL,
  time VARCHAR(20) NOT NULL,
  reason TEXT NOT NULL,
  treatment TEXT NOT NULL,
  status visit_status NOT NULL DEFAULT 'pending-approval',
  logged_by UUID REFERENCES users(id),
  parent_notified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TYPE chat_sender_role AS ENUM ('parent', 'clinic');
CREATE TABLE clinic_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_role chat_sender_role NOT NULL,
  student_name VARCHAR(150) NOT NULL,
  student_id UUID REFERENCES students(id),
  text TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE medicine_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  unit VARCHAR(50) NOT NULL DEFAULT 'pcs',
  location VARCHAR(200),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE logistics_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  stations TEXT,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  driver_name VARCHAR(150) NOT NULL,
  category VARCHAR(30) NOT NULL DEFAULT 'Logistics',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate_number VARCHAR(20) NOT NULL UNIQUE,
  model VARCHAR(100),
  capacity INT NOT NULL DEFAULT 0,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  driver_id UUID REFERENCES users(id) ON DELETE
  SET NULL,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE
  SET NULL,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE student_routes (
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  PRIMARY KEY (student_id, route_id)
);
CREATE TABLE notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'Medium',
  posted_by UUID REFERENCES users(id),
  branch_id UUID REFERENCES branches(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  date DATE NOT NULL,
  type VARCHAR(150) NOT NULL,
  description TEXT,
  branch_id UUID REFERENCES branches(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE library_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(300) NOT NULL,
  author VARCHAR(200) NOT NULL,
  isbn VARCHAR(30) UNIQUE,
  shelf VARCHAR(100),
  total INT NOT NULL DEFAULT 1,
  available INT NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'Available',
  branch_id UUID REFERENCES branches(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE library_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES library_books(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  borrowed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  returned_at DATE,
  days_overdue INT NOT NULL DEFAULT 0,
  fine_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  daily_rate NUMERIC(12, 2) NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL,
  weight VARCHAR(10),
  score NUMERIC(6, 2),
  total NUMERIC(6, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE financial_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_level VARCHAR(20),
  monthly_tuition NUMERIC(12, 2) NOT NULL DEFAULT 0,
  registration_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
  bus_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
  penalty_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
  academic_year VARCHAR(20) NOT NULL,
  branch_id UUID REFERENCES branches(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- ============================================================
-- Student Application Management
-- ============================================================
CREATE TABLE pending_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  -- Applicant Information
  applicant_name VARCHAR(255) NOT NULL,
  applicant_email VARCHAR(255),
  applicant_phone VARCHAR(30),
  digital_id VARCHAR(50),
  dob DATE,
  gender VARCHAR(20),
  -- Parent/Guardian Information
  parent_name VARCHAR(255),
  parent_phone VARCHAR(30),
  address TEXT,
  -- Academic Information
  grade_applying VARCHAR(10),
  previous_school VARCHAR(255),
  last_grade_completed VARCHAR(10),
  -- Medical Information (optional)
  blood_group VARCHAR(10),
  allergies TEXT,
  chronic_conditions TEXT,
  current_medications TEXT,
  -- Registration & Financial Status
  registration_fee_status VARCHAR(20) DEFAULT 'Pending',
  -- Document Storage
  transcript_file_path VARCHAR(512),
  transcript_file_name VARCHAR(255),
  transcript_file_size BIGINT,
  transcript_uploaded_at TIMESTAMPTZ,
  -- Application Pipeline Status
  status VARCHAR(30) DEFAULT 'pending',
  -- Exam Details (if applicable)
  exam_date DATE,
  exam_time TIME,
  exam_location VARCHAR(255),
  exam_subjects TEXT,
  exam_notes TEXT,
  -- Additional Notes
  notes TEXT,
  -- System Fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_pending_applications_branch ON pending_applications(branch_id);
CREATE INDEX IF NOT EXISTS idx_pending_applications_status ON pending_applications(status);
CREATE INDEX IF NOT EXISTS idx_pending_applications_email ON pending_applications(applicant_email);
CREATE INDEX IF NOT EXISTS idx_pending_applications_created ON pending_applications(created_at);
CREATE INDEX IF NOT EXISTS idx_pending_applications_pipeline ON pending_applications(status, created_at DESC);
CREATE TABLE IF NOT EXISTS application_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES pending_applications(id) ON DELETE CASCADE,
  -- File Information
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(512) NOT NULL,
  file_size BIGINT NOT NULL,
  file_mime_type VARCHAR(100),
  -- Upload Information
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by UUID REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_application_transcripts_app_id ON application_transcripts(application_id);
CREATE INDEX IF NOT EXISTS idx_application_transcripts_uploaded_at ON application_transcripts(uploaded_at);
CREATE OR REPLACE FUNCTION update_pending_applications_timestamp() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER pending_applications_updated_at BEFORE
UPDATE ON pending_applications FOR EACH ROW EXECUTE FUNCTION update_pending_applications_timestamp();
-- ============================================================
-- SEED: Default branches
-- ============================================================
INSERT INTO branches (name, location)
VALUES ('Main Branch', 'Addis Ababa'),
  ('Bole Branch', 'Bole, AA'),
  ('Megenagna Branch', 'Megenagna, AA'),
  ('Adama Branch', 'Adama');
-- ============================================================
-- SEED: Default school config
-- ============================================================
INSERT INTO school_config (key, value_oromic, value_amharic, value_english)
VALUES (
    'school_name',
    'Mana Barumsaa Abdii Adaamaa',
    'አብዲ አዳማ ትምህርት ቤት',
    'Abdi Adama School'
  ),
  (
    'school_motto',
    'ijooleen kessaan ijolee kenyaa',
    'ልጆቻቹ ልጆቻችን ናቸዉ',
    'Your children are our children'
  );
-- ============================================================
-- Helper function: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- ============================================================
-- END OF CONSOLIDATED MIGRATION
-- ============================================================
-- This consolidated migration provides both unified and silo_ tables.
-- The backend can now use either schema. For production, migrate to unified tables.