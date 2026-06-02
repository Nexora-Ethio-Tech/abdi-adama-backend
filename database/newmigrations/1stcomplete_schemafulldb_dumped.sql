--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: absence_status; Type: TYPE; Schema: public; Owner: -
--

DO $$ BEGIN CREATE TYPE public.absence_status AS ENUM (
    'pending',
    'excused',
    'notified'
); EXCEPTION WHEN duplicate_object THEN null; END $$;


--
-- Name: app_status; Type: TYPE; Schema: public; Owner: -
--

DO $$ BEGIN CREATE TYPE public.app_status AS ENUM (
    'pending',
    'declined',
    'approved',
    'exam-pending',
    'exam-passed',
    'exam-failed',
    'awaiting-payment',
    'payment-confirmed'
); EXCEPTION WHEN duplicate_object THEN null; END $$;


--
-- Name: attendance_status; Type: TYPE; Schema: public; Owner: -
--

DO $$ BEGIN CREATE TYPE public.attendance_status AS ENUM (
    'present',
    'absent',
    'late',
    'excused'
); EXCEPTION WHEN duplicate_object THEN null; END $$;


--
-- Name: audit_category; Type: TYPE; Schema: public; Owner: -
--

DO $$ BEGIN CREATE TYPE public.audit_category AS ENUM (
    'Fees',
    'Staff'
); EXCEPTION WHEN duplicate_object THEN null; END $$;


--
-- Name: audit_direction; Type: TYPE; Schema: public; Owner: -
--

DO $$ BEGIN CREATE TYPE public.audit_direction AS ENUM (
    'In',
    'Out'
); EXCEPTION WHEN duplicate_object THEN null; END $$;


--
-- Name: chat_sender_role; Type: TYPE; Schema: public; Owner: -
--

DO $$ BEGIN CREATE TYPE public.chat_sender_role AS ENUM (
    'parent',
    'clinic'
); EXCEPTION WHEN duplicate_object THEN null; END $$;


--
-- Name: exam_category; Type: TYPE; Schema: public; Owner: -
--

DO $$ BEGIN CREATE TYPE public.exam_category AS ENUM (
    'Mid-term',
    'Final',
    'Quiz',
    'Assignment'
); EXCEPTION WHEN duplicate_object THEN null; END $$;


--
-- Name: exam_status; Type: TYPE; Schema: public; Owner: -
--

DO $$ BEGIN CREATE TYPE public.exam_status AS ENUM (
    'available',
    'completed',
    'draft'
); EXCEPTION WHEN duplicate_object THEN null; END $$;


--
-- Name: fee_approval_status; Type: TYPE; Schema: public; Owner: -
--

DO $$ BEGIN CREATE TYPE public.fee_approval_status AS ENUM (
    'none',
    'pending',
    'approved',
    'rejected'
); EXCEPTION WHEN duplicate_object THEN null; END $$;


--
-- Name: fee_status; Type: TYPE; Schema: public; Owner: -
--

DO $$ BEGIN CREATE TYPE public.fee_status AS ENUM (
    'standard',
    'reduced'
); EXCEPTION WHEN duplicate_object THEN null; END $$;


--
-- Name: finance_direction; Type: TYPE; Schema: public; Owner: -
--

DO $$ BEGIN CREATE TYPE public.finance_direction AS ENUM (
    'Income',
    'Expense'
); EXCEPTION WHEN duplicate_object THEN null; END $$;


--
-- Name: plan_status; Type: TYPE; Schema: public; Owner: -
--

DO $$ BEGIN CREATE TYPE public.plan_status AS ENUM (
    'Draft',
    'Pending',
    'Approved',
    'Revision Required'
); EXCEPTION WHEN duplicate_object THEN null; END $$;


--
-- Name: risk_level; Type: TYPE; Schema: public; Owner: -
--

DO $$ BEGIN CREATE TYPE public.risk_level AS ENUM (
    'Low',
    'Medium',
    'High'
); EXCEPTION WHEN duplicate_object THEN null; END $$;


--
-- Name: silo_book_status; Type: TYPE; Schema: public; Owner: -
--

DO $$ BEGIN CREATE TYPE public.silo_book_status AS ENUM (
    'Available',
    'Borrowed',
    'Out of Stock'
); EXCEPTION WHEN duplicate_object THEN null; END $$;


--
-- Name: silo_role; Type: TYPE; Schema: public; Owner: -
--

DO $$ BEGIN CREATE TYPE public.silo_role AS ENUM (
    'Student',
    'Parent',
    'Driver',
    'Librarian',
    'ClinicAdmin'
); EXCEPTION WHEN duplicate_object THEN null; END $$;


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

DO $$ BEGIN CREATE TYPE public.user_role AS ENUM (
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
); EXCEPTION WHEN duplicate_object THEN null; END $$;


--
-- Name: user_status; Type: TYPE; Schema: public; Owner: -
--

DO $$ BEGIN CREATE TYPE public.user_status AS ENUM (
    'Pending',
    'Approved',
    'Revoked'
); EXCEPTION WHEN duplicate_object THEN null; END $$;


--
-- Name: violation_type; Type: TYPE; Schema: public; Owner: -
--

DO $$ BEGIN CREATE TYPE public.violation_type AS ENUM (
    'fullscreen-exit',
    'visibility-change',
    'blur'
); EXCEPTION WHEN duplicate_object THEN null; END $$;


--
-- Name: visit_status; Type: TYPE; Schema: public; Owner: -
--

DO $$ BEGIN CREATE TYPE public.visit_status AS ENUM (
    'pending-approval',
    'sent',
    'rejected'
); EXCEPTION WHEN duplicate_object THEN null; END $$;


--
-- Name: format_ethiopian_phone(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.format_ethiopian_phone(phone text) RETURNS text
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Remove any existing +251 prefix
    phone := REGEXP_REPLACE(phone, '^\+?251', '');
    -- Remove any non-digit characters
    phone := REGEXP_REPLACE(phone, '[^0-9]', '', 'g');
    -- Return formatted number
    RETURN '+251' || phone;
END;
$$;


--
-- Name: sort_students_in_section(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.sort_students_in_section() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- This is handled in application logic
    RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: absence_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.absence_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    student_name character varying(150) NOT NULL,
    grade character varying(10) NOT NULL,
    parent_name character varying(150),
    parent_phone character varying(30),
    reported_at timestamp with time zone DEFAULT now() NOT NULL,
    reported_by character varying(150) NOT NULL,
    reason text NOT NULL,
    date date NOT NULL,
    status public.absence_status DEFAULT 'pending'::public.absence_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: academic_grades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.academic_grades (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    grade_level character varying(10) NOT NULL,
    branch_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: academic_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.academic_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    year character varying(20) NOT NULL,
    semester character varying(30),
    grade_level character varying(10) NOT NULL,
    average character varying(10),
    rank character varying(20),
    gpa character varying(10),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: academic_history_courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.academic_history_courses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    history_id uuid NOT NULL,
    course_name character varying(100) NOT NULL,
    grade character varying(5),
    score numeric(5,2)
);


--
-- Name: academic_sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.academic_sections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    grade_id uuid NOT NULL,
    section_name character varying(10) NOT NULL,
    branch_id uuid,
    capacity integer DEFAULT 40 NOT NULL,
    current_count integer DEFAULT 0 NOT NULL,
    room_teacher_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: academic_years; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.academic_years (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    year_name character varying(50) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    branch_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: access_audit_trail; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.access_audit_trail (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    attempted_branch uuid,
    user_branch uuid,
    action character varying(100) NOT NULL,
    was_blocked boolean DEFAULT false NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: asset_adjustments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.asset_adjustments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    asset_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    change_type character varying(20) NOT NULL,
    quantity_changed integer NOT NULL,
    previous_quantity integer,
    new_quantity integer,
    cost numeric(12,2),
    reason text,
    reported_by character varying(150),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.assets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    value numeric(12,2) NOT NULL,
    branch_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    amount integer DEFAULT 1 NOT NULL
);


--
-- Name: attendance_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.attendance_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    month character varying(10) NOT NULL,
    year integer NOT NULL,
    rate numeric(5,2) NOT NULL
);


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid,
    student_name character varying(150),
    section character varying(50),
    category public.audit_category NOT NULL,
    direction public.audit_direction NOT NULL,
    action_label character varying(200) NOT NULL,
    modified_by character varying(150) NOT NULL,
    approver_name character varying(150),
    old_value jsonb,
    new_value jsonb,
    status boolean DEFAULT true NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: branch_grade_fees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.branch_grade_fees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    branch_id uuid NOT NULL,
    grade_level character varying(20) NOT NULL,
    monthly_fee numeric(12,2) DEFAULT 0 NOT NULL,
    registration_fee numeric(12,2) DEFAULT 0 NOT NULL,
    bus_fee numeric(12,2) DEFAULT 0 NOT NULL,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: branches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.branches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    address character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    code character varying(50),
    logo_url text,
    phone character varying(50),
    email character varying(100),
    leaderboard_last_reset timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: bulk_communication_recipients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.bulk_communication_recipients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    communication_id uuid NOT NULL,
    application_id uuid NOT NULL,
    phone character varying(30),
    email character varying(255),
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    delivered_at timestamp with time zone
);


--
-- Name: bulk_communications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.bulk_communications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sent_by uuid NOT NULL,
    recipient_count integer DEFAULT 0 NOT NULL,
    message_type character varying(20) NOT NULL,
    subject character varying(200),
    message text NOT NULL,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    application_ids uuid[]
);


--
-- Name: class_teachers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.class_teachers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    class_id uuid NOT NULL,
    teacher_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    assigned_at timestamp with time zone DEFAULT now()
);


--
-- Name: classes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.classes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(50) NOT NULL,
    teacher_id uuid,
    student_count integer DEFAULT 0 NOT NULL,
    branch_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    section character varying(10),
    capacity integer DEFAULT 40 NOT NULL,
    grade character varying(10),
    current_count integer DEFAULT 0
);


--
-- Name: clinic_chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.clinic_chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sender_id uuid NOT NULL,
    sender_role public.chat_sender_role NOT NULL,
    student_name character varying(150) NOT NULL,
    student_id uuid,
    text text NOT NULL,
    read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: clinic_visits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.clinic_visits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    student_name character varying(150) NOT NULL,
    date date NOT NULL,
    "time" character varying(20) NOT NULL,
    reason text NOT NULL,
    treatment text NOT NULL,
    status public.visit_status DEFAULT 'pending-approval'::public.visit_status NOT NULL,
    logged_by uuid,
    parent_notified boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: communication_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.communication_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    teacher_id uuid,
    week_ending date NOT NULL,
    rating_uniform smallint DEFAULT 0 NOT NULL,
    rating_materials smallint DEFAULT 0 NOT NULL,
    rating_homework smallint DEFAULT 0 NOT NULL,
    rating_participation smallint DEFAULT 0 NOT NULL,
    rating_conduct smallint DEFAULT 0 NOT NULL,
    rating_social smallint DEFAULT 0 NOT NULL,
    rating_punctuality smallint DEFAULT 0 NOT NULL,
    rating_note_taking smallint DEFAULT 0 NOT NULL,
    teacher_note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT communication_logs_rating_conduct_check CHECK (((rating_conduct >= 0) AND (rating_conduct <= 3))),
    CONSTRAINT communication_logs_rating_homework_check CHECK (((rating_homework >= 0) AND (rating_homework <= 3))),
    CONSTRAINT communication_logs_rating_materials_check CHECK (((rating_materials >= 0) AND (rating_materials <= 3))),
    CONSTRAINT communication_logs_rating_note_taking_check CHECK (((rating_note_taking >= 0) AND (rating_note_taking <= 3))),
    CONSTRAINT communication_logs_rating_participation_check CHECK (((rating_participation >= 0) AND (rating_participation <= 3))),
    CONSTRAINT communication_logs_rating_punctuality_check CHECK (((rating_punctuality >= 0) AND (rating_punctuality <= 3))),
    CONSTRAINT communication_logs_rating_social_check CHECK (((rating_social >= 0) AND (rating_social <= 3))),
    CONSTRAINT communication_logs_rating_uniform_check CHECK (((rating_uniform >= 0) AND (rating_uniform <= 3)))
);


--
-- Name: course_frequency; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.course_frequency (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    academic_year character varying(20) DEFAULT '2025/2026'::character varying NOT NULL,
    sessions_per_week integer DEFAULT 5 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT course_frequency_sessions_per_week_check CHECK (((sessions_per_week >= 1) AND (sessions_per_week <= 10)))
);


--
-- Name: courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.courses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(30) NOT NULL,
    teacher_id uuid,
    class_id uuid,
    progress integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: credential_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.credential_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    digital_id character varying(20) NOT NULL,
    initial_password character varying(10),
    generated_by uuid,
    generated_at timestamp with time zone DEFAULT now() NOT NULL,
    password_changed boolean DEFAULT false NOT NULL
);


--
-- Name: driver_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.driver_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    driver_id uuid NOT NULL,
    message text NOT NULL,
    target_route character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);


--
-- Name: email_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.email_config (
    key character varying(100) NOT NULL,
    value text DEFAULT ''::text NOT NULL,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: email_config_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.email_config_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    config_key character varying(100) NOT NULL,
    old_value text,
    new_value text,
    changed_by uuid,
    changed_by_name character varying(255),
    changed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: emergency_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.emergency_contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    name character varying(150) NOT NULL,
    relation character varying(50) NOT NULL,
    phone character varying(30) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: employee_attendance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.employee_attendance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    date date NOT NULL,
    status character varying(20) NOT NULL,
    recorded_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT employee_attendance_status_check CHECK (((status)::text = ANY ((ARRAY['present'::character varying, 'absent'::character varying, 'late'::character varying, 'excused'::character varying, 'leave'::character varying])::text[])))
);


--
-- Name: employee_payroll_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.employee_payroll_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    basic_salary numeric DEFAULT 0 NOT NULL,
    transport_allowance numeric DEFAULT 0 NOT NULL,
    housing_allowance numeric DEFAULT 0 NOT NULL,
    position_allowance numeric DEFAULT 0 NOT NULL,
    overtime_rate_per_hour numeric DEFAULT 0 NOT NULL,
    bank_account character varying(100),
    tin_number character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: enrollment_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.enrollment_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(150) NOT NULL,
    grade character varying(10) NOT NULL,
    amount numeric(12,2) NOT NULL,
    email character varying(255),
    confirmed boolean DEFAULT false NOT NULL,
    failed boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(200) NOT NULL,
    date date NOT NULL,
    type character varying(50) NOT NULL,
    description text,
    branch_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: exam_access; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.exam_access (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    exam_id uuid NOT NULL,
    user_id uuid NOT NULL
);


--
-- Name: exam_lockdown; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.exam_lockdown (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    branch_id uuid,
    is_locked_down boolean DEFAULT false NOT NULL,
    lockdown_password character varying(100),
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: exam_question_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.exam_question_options (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question_id uuid NOT NULL,
    option_key character varying(10) NOT NULL,
    option_text text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL
);


--
-- Name: exam_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.exam_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    exam_id uuid NOT NULL,
    question_text text NOT NULL,
    correct_option_id character varying(10),
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: exam_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.exam_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    exam_id uuid NOT NULL,
    student_id uuid NOT NULL,
    answers jsonb DEFAULT '{}'::jsonb NOT NULL,
    warning_count integer DEFAULT 0 NOT NULL,
    started_at timestamp with time zone NOT NULL,
    submitted_at timestamp with time zone,
    auto_submitted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: exam_violations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.exam_violations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    submission_id uuid NOT NULL,
    violation_type public.violation_type NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: exams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.exams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(200) NOT NULL,
    course_id uuid,
    course_name character varying(100),
    teacher_id uuid,
    teacher_name character varying(150),
    category public.exam_category NOT NULL,
    duration_minutes integer DEFAULT 60 NOT NULL,
    status public.exam_status DEFAULT 'draft'::public.exam_status NOT NULL,
    is_locked boolean DEFAULT false NOT NULL,
    lock_password character varying(100),
    locked_by uuid,
    is_hidden boolean DEFAULT true NOT NULL,
    hidden_by uuid,
    principal_set_password character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: finance_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.finance_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key character varying(255) NOT NULL,
    value numeric NOT NULL,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: finance_settings_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.finance_settings_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    setting_key character varying(255) NOT NULL,
    old_value numeric,
    new_value numeric,
    changed_by uuid,
    changed_by_name character varying(255),
    changed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: finance_summaries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.finance_summaries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category character varying(100) NOT NULL,
    description text,
    amount numeric(14,2) NOT NULL,
    item_count integer DEFAULT 0 NOT NULL,
    direction public.finance_direction NOT NULL,
    date date NOT NULL,
    approved_by character varying(150),
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: finance_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.finance_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid,
    student_name character varying(150),
    amount numeric(14,2) NOT NULL,
    type character varying(50) NOT NULL,
    date date NOT NULL,
    verified_by character varying(150),
    branch_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    ethiopic_month character varying(20),
    ethiopic_year integer
);


--
-- Name: financial_policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.financial_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    grade_level character varying(20),
    monthly_tuition numeric(12,2) DEFAULT 0 NOT NULL,
    registration_fee numeric(12,2) DEFAULT 0 NOT NULL,
    bus_fee numeric(12,2) DEFAULT 0 NOT NULL,
    penalty_rate numeric(5,2) DEFAULT 0 NOT NULL,
    academic_year character varying(20) NOT NULL,
    branch_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: grade_locks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.grade_locks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    grade_level character varying(20) NOT NULL,
    is_locked boolean DEFAULT false NOT NULL,
    locked_by uuid,
    locked_at timestamp with time zone,
    branch_id uuid,
    academic_year_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: grade_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.grade_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    teacher_id uuid NOT NULL,
    submission_type character varying(50) NOT NULL,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    submitted_by uuid NOT NULL,
    is_locked boolean DEFAULT true NOT NULL
);


--
-- Name: grades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.grades (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    course_id uuid NOT NULL,
    type character varying(30) NOT NULL,
    weight character varying(10),
    score numeric(6,2),
    total numeric(6,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_submitted boolean DEFAULT false NOT NULL,
    submitted_at timestamp with time zone,
    submitted_by uuid,
    academic_year character varying(20) DEFAULT '2025/2026'::character varying,
    semester smallint DEFAULT 2
);


--
-- Name: grading_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.grading_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    grade_level character varying(20) NOT NULL,
    method_id character varying(30) NOT NULL,
    label character varying(50) NOT NULL,
    max_weight integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: inventory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.inventory (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(200) NOT NULL,
    category character varying(100) NOT NULL,
    quantity integer DEFAULT 0 NOT NULL,
    condition character varying(30) DEFAULT 'Good'::character varying NOT NULL,
    location character varying(200),
    branch_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: library_books; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.library_books (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(300) NOT NULL,
    author character varying(200) NOT NULL,
    isbn character varying(30),
    status character varying(20) DEFAULT 'Available'::character varying NOT NULL,
    shelf character varying(100),
    total integer DEFAULT 1 NOT NULL,
    available integer DEFAULT 1 NOT NULL,
    branch_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    book_code character varying(50)
);


--
-- Name: library_loans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.library_loans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    book_id uuid NOT NULL,
    student_id uuid NOT NULL,
    borrowed_at date DEFAULT CURRENT_DATE NOT NULL,
    due_date date NOT NULL,
    returned_at date,
    days_overdue integer DEFAULT 0 NOT NULL,
    fine_amount numeric(12,2) DEFAULT 0 NOT NULL,
    daily_rate numeric(12,2) DEFAULT 5 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: loan_repayments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.loan_repayments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    loan_id uuid NOT NULL,
    payroll_id uuid,
    amount numeric NOT NULL,
    remaining_after numeric NOT NULL,
    repaid_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT loan_repayments_amount_check CHECK ((amount > (0)::numeric))
);


--
-- Name: loans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.loans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    amount numeric NOT NULL,
    remaining_balance numeric NOT NULL,
    monthly_deduction numeric NOT NULL,
    max_months integer NOT NULL,
    months_paid integer DEFAULT 0,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    issued_by uuid,
    issued_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp with time zone,
    notes text,
    audited_by uuid,
    audited_at timestamp with time zone,
    paid_at timestamp with time zone,
    rejection_reason text,
    CONSTRAINT loans_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT loans_max_months_check CHECK ((max_months > 0)),
    CONSTRAINT loans_monthly_deduction_check CHECK ((monthly_deduction > (0)::numeric)),
    CONSTRAINT loans_remaining_balance_check CHECK ((remaining_balance >= (0)::numeric)),
    CONSTRAINT loans_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'active'::character varying, 'completed'::character varying, 'rejected'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: logistics_notices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.logistics_notices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(200) NOT NULL,
    content text NOT NULL,
    stations text,
    driver_id uuid NOT NULL,
    driver_name character varying(150) NOT NULL,
    category character varying(30) DEFAULT 'Logistics'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: medicine_inventory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.medicine_inventory (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(200) NOT NULL,
    stock integer DEFAULT 0 NOT NULL,
    unit character varying(50) DEFAULT 'pcs'::character varying NOT NULL,
    location character varying(200),
    branch_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: monthly_profit_targets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.monthly_profit_targets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ethiopian_month integer NOT NULL,
    target_year integer DEFAULT (EXTRACT(year FROM CURRENT_DATE))::integer NOT NULL,
    target_amount numeric(14,2) DEFAULT 0 NOT NULL,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT now(),
    branch_id uuid,
    CONSTRAINT monthly_profit_targets_ethiopian_month_check CHECK (((ethiopian_month >= 1) AND (ethiopian_month <= 13)))
);


--
-- Name: notices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.notices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(200) NOT NULL,
    content text NOT NULL,
    priority character varying(20) DEFAULT 'Medium'::character varying NOT NULL,
    posted_by uuid,
    branch_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: parent_student; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.parent_student (
    parent_id uuid NOT NULL,
    student_id uuid NOT NULL
);


--
-- Name: parents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.parents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    branch_id uuid,
    family_id character varying(20),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    linked_student_id uuid
);


--
-- Name: payment_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.payment_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payment_id uuid NOT NULL,
    fee_type character varying(100) NOT NULL,
    amount numeric NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: payment_status_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.payment_status_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    status boolean NOT NULL,
    modified_by character varying(150) NOT NULL,
    approver_name character varying(150),
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    payer_id uuid,
    branch_id uuid,
    month character varying(7),
    date date DEFAULT CURRENT_DATE,
    total_amount numeric NOT NULL,
    reference character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: payroll_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.payroll_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payroll_run_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    employee_name character varying(255) NOT NULL,
    basic_salary numeric DEFAULT 0 NOT NULL,
    transport_allowance numeric DEFAULT 0 NOT NULL,
    housing_allowance numeric DEFAULT 0 NOT NULL,
    position_allowance numeric DEFAULT 0 NOT NULL,
    overtime_hours numeric DEFAULT 0 NOT NULL,
    overtime_amount numeric DEFAULT 0 NOT NULL,
    gross_salary numeric DEFAULT 0 NOT NULL,
    absent_days integer DEFAULT 0 NOT NULL,
    penalty_amount numeric DEFAULT 0 NOT NULL,
    loan_deduction numeric DEFAULT 0 NOT NULL,
    taxable_income numeric DEFAULT 0 NOT NULL,
    income_tax numeric DEFAULT 0 NOT NULL,
    pension_employee numeric DEFAULT 0 NOT NULL,
    pension_employer numeric DEFAULT 0 NOT NULL,
    total_deductions numeric DEFAULT 0 NOT NULL,
    net_pay numeric DEFAULT 0 NOT NULL
);


--
-- Name: payroll_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.payroll_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    month character varying(20) NOT NULL,
    year integer NOT NULL,
    branch_id uuid,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    generated_by uuid,
    finalized_by uuid,
    total_gross numeric DEFAULT 0 NOT NULL,
    total_deductions numeric DEFAULT 0 NOT NULL,
    total_net numeric DEFAULT 0 NOT NULL,
    total_tax numeric DEFAULT 0 NOT NULL,
    total_pension_employee numeric DEFAULT 0 NOT NULL,
    total_pension_employer numeric DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    finalized_at timestamp with time zone,
    CONSTRAINT payroll_runs_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'finalized'::character varying, 'exported'::character varying])::text[])))
);


--
-- Name: pending_applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.pending_applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(150),
    dob date NOT NULL,
    parent_name character varying(150) NOT NULL,
    phone character varying(30),
    email character varying(255),
    previous_school character varying(200),
    last_grade character varying(10),
    date date,
    status public.app_status DEFAULT 'pending'::public.app_status NOT NULL,
    branch_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    transcript_url character varying(500),
    transcript_size_kb integer,
    admission_fee numeric(12,2) DEFAULT 0,
    grade_applying character varying(10),
    section_assigned uuid,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    payment_confirmed_by uuid,
    payment_confirmed_at timestamp with time zone,
    applicant_name character varying(200),
    applicant_email character varying(255),
    applicant_phone character varying(30),
    parent_phone character varying(30),
    gender character varying(10),
    address text,
    notes text,
    finance_status character varying(20),
    finance_user_id uuid,
    finance_approved_at timestamp with time zone,
    payment_amount numeric,
    payment_reference character varying(255),
    student_user_id uuid,
    parent_user_id uuid,
    registration_completed_at timestamp with time zone,
    blood_group character varying(10),
    allergies text,
    chronic_conditions text,
    current_medications text,
    transcript_data bytea,
    transcript_mime_type character varying(100),
    transcript_file_name character varying(255),
    transcript_file_size bigint,
    created_by uuid,
    credentials_generated_at timestamp with time zone,
    digital_id character varying(50),
    finance_removal_reason text,
    finance_removed_by uuid,
    finance_removed_at timestamp with time zone
);


--
-- Name: registration_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.registration_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    branch_id uuid,
    is_open boolean DEFAULT false NOT NULL,
    start_date date,
    end_date date,
    admission_fee numeric(12,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: registration_exam_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.registration_exam_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    exam_date date NOT NULL,
    exam_time character varying(20) NOT NULL,
    location character varying(200) NOT NULL,
    subjects text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: routes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.routes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(150) NOT NULL,
    driver_id uuid,
    vehicle_id uuid,
    branch_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: schedule_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.schedule_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    branch_id uuid NOT NULL,
    academic_year character varying(20) DEFAULT '2025/2026'::character varying NOT NULL,
    periods_per_day integer DEFAULT 8 NOT NULL,
    start_time time without time zone DEFAULT '08:00:00'::time without time zone NOT NULL,
    end_time time without time zone DEFAULT '15:30:00'::time without time zone NOT NULL,
    max_consecutive_periods integer DEFAULT 3 NOT NULL,
    distribute_subjects boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT schedule_config_max_consecutive_periods_check CHECK (((max_consecutive_periods >= 1) AND (max_consecutive_periods <= 6))),
    CONSTRAINT schedule_config_periods_per_day_check CHECK (((periods_per_day >= 3) AND (periods_per_day <= 12)))
);


--
-- Name: schedule_structure; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.schedule_structure (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    branch_id uuid NOT NULL,
    academic_year character varying(20) NOT NULL,
    class_id uuid NOT NULL,
    teacher_id uuid NOT NULL,
    subject character varying(100) NOT NULL,
    sessions_per_week integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    teacher_id uuid NOT NULL,
    day character varying(15) NOT NULL,
    time_slot character varying(50) NOT NULL,
    class_name character varying(20) NOT NULL,
    subject character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    section character varying(20),
    period_number integer
);


--
-- Name: school_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.school_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key character varying(50) NOT NULL,
    value_oromic text DEFAULT ''::text NOT NULL,
    value_amharic text DEFAULT ''::text NOT NULL,
    value_english text DEFAULT ''::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: section_assignment_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.section_assignment_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    from_section_id uuid,
    to_section_id uuid,
    assigned_by uuid NOT NULL,
    reason character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: silo_announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.silo_announcements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    priority character varying(20) DEFAULT 'Medium'::character varying,
    title character varying(255) NOT NULL,
    content text NOT NULL,
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: silo_books; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.silo_books (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(255) NOT NULL,
    author character varying(255) NOT NULL,
    isbn character varying(50),
    shelf_location character varying(100),
    stock integer DEFAULT 1 NOT NULL,
    status public.silo_book_status DEFAULT 'Available'::public.silo_book_status NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: silo_clinic_chat; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.silo_clinic_chat (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    message text NOT NULL,
    is_encrypted boolean DEFAULT true,
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: silo_clinic_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.silo_clinic_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    patient_type character varying(20),
    visit_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    symptoms text,
    diagnosis text,
    treatment text,
    administered_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: silo_communication_book; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.silo_communication_book (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    week_ending date DEFAULT CURRENT_DATE NOT NULL,
    uniform integer,
    materials integer,
    homework integer,
    participation integer,
    conduct integer,
    social integer,
    punctuality integer,
    note_taking integer,
    teacher_observation text,
    progress_insight text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT silo_communication_book_conduct_check CHECK (((conduct >= 1) AND (conduct <= 4))),
    CONSTRAINT silo_communication_book_homework_check CHECK (((homework >= 1) AND (homework <= 4))),
    CONSTRAINT silo_communication_book_materials_check CHECK (((materials >= 1) AND (materials <= 4))),
    CONSTRAINT silo_communication_book_note_taking_check CHECK (((note_taking >= 1) AND (note_taking <= 4))),
    CONSTRAINT silo_communication_book_participation_check CHECK (((participation >= 1) AND (participation <= 4))),
    CONSTRAINT silo_communication_book_punctuality_check CHECK (((punctuality >= 1) AND (punctuality <= 4))),
    CONSTRAINT silo_communication_book_social_check CHECK (((social >= 1) AND (social <= 4))),
    CONSTRAINT silo_communication_book_uniform_check CHECK (((uniform >= 1) AND (uniform <= 4)))
);


--
-- Name: silo_courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.silo_courses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(30),
    teacher_id uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: silo_deadlines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.silo_deadlines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    section_id uuid,
    course_id uuid,
    title character varying(200) NOT NULL,
    type character varying(30) DEFAULT 'Assignment'::character varying NOT NULL,
    due_date date NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: silo_drivers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.silo_drivers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    full_name character varying(200) NOT NULL,
    license_number character varying(50) NOT NULL,
    phone_number character varying(20),
    vehicle_plate character varying(20),
    status character varying(20) DEFAULT 'available'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: silo_enrollments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.silo_enrollments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    course_id uuid NOT NULL,
    section_id uuid,
    academic_year character varying(20) NOT NULL,
    semester smallint NOT NULL,
    progress smallint DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT silo_enrollments_semester_check CHECK ((semester = ANY (ARRAY[1, 2])))
);


--
-- Name: silo_family_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.silo_family_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    parent_user_id uuid NOT NULL,
    student_identity_id uuid NOT NULL
);


--
-- Name: silo_identities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.silo_identities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id character varying(20) NOT NULL,
    full_name character varying(200) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    grade character varying(50)
);


--
-- Name: silo_loans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.silo_loans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    book_id uuid NOT NULL,
    student_id character varying(20) NOT NULL,
    loan_date date DEFAULT CURRENT_DATE NOT NULL,
    due_date date NOT NULL,
    return_date date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: silo_logistics_notices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.silo_logistics_notices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sender_id uuid NOT NULL,
    message text NOT NULL,
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: silo_parents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.silo_parents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    email character varying(255),
    phone_number character varying(20),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: silo_route_manifest; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.silo_route_manifest (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    route_id uuid NOT NULL,
    student_id uuid NOT NULL
);


--
-- Name: silo_routes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.silo_routes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    driver_id uuid NOT NULL,
    bus_number character varying(50) NOT NULL,
    route_name character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: silo_schedule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.silo_schedule (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    section_id uuid NOT NULL,
    course_id uuid NOT NULL,
    day_of_week smallint NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    room character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT silo_schedule_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6)))
);


--
-- Name: silo_sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.silo_sections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(50) NOT NULL,
    grade character varying(10) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: silo_student_grades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.silo_student_grades (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    subject character varying(100) NOT NULL,
    mid_30 numeric(5,2) DEFAULT 0,
    quiz_10 numeric(5,2) DEFAULT 0,
    assignment_10 numeric(5,2) DEFAULT 0,
    final_50 numeric(5,2) DEFAULT 0,
    teacher_name character varying(200),
    academic_year character varying(20) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    total numeric(6,2) GENERATED ALWAYS AS ((((COALESCE(quiz_10, (0)::numeric) + COALESCE(assignment_10, (0)::numeric)) + COALESCE(mid_30, (0)::numeric)) + COALESCE(final_50, (0)::numeric))) STORED
);


--
-- Name: silo_student_parents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.silo_student_parents (
    student_id uuid NOT NULL,
    parent_id uuid NOT NULL,
    relationship_type character varying(50)
);


--
-- Name: silo_student_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.silo_student_stats (
    student_id uuid NOT NULL,
    attendance_percentage numeric(5,2) DEFAULT 100,
    academic_rank integer,
    last_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: silo_students; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.silo_students (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    email character varying(255),
    enrollment_date date DEFAULT CURRENT_DATE,
    status character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: silo_teacher_rewards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.silo_teacher_rewards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    teacher_identity_id uuid NOT NULL,
    award_label character varying(100) DEFAULT 'Teacher of the Month'::character varying NOT NULL,
    reward_month smallint NOT NULL,
    reward_year smallint NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT silo_teacher_rewards_reward_month_check CHECK (((reward_month >= 1) AND (reward_month <= 12)))
);


--
-- Name: silo_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.silo_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    identity_id uuid NOT NULL,
    role public.silo_role NOT NULL,
    password_hash character varying(255) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: staff_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.staff_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    type character varying(50) DEFAULT 'system'::character varying NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT staff_notifications_type_check CHECK (((type)::text = ANY ((ARRAY['loan'::character varying, 'payroll'::character varying, 'system'::character varying])::text[])))
);


--
-- Name: student_aid_usages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.student_aid_usages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_aid_id uuid NOT NULL,
    payment_id uuid,
    student_id uuid NOT NULL,
    amount numeric(12,2) DEFAULT 0 NOT NULL,
    month character varying(7) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: student_aids; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.student_aids (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    branch_id uuid,
    approved_amount numeric(12,2) DEFAULT 0 NOT NULL,
    used_amount numeric(12,2) DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    approved_by uuid,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: student_attendance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.student_attendance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    date date NOT NULL,
    status public.attendance_status DEFAULT 'present'::public.attendance_status NOT NULL,
    recorded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    remarks text
);


--
-- Name: student_collections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.student_collections (
    student_id uuid NOT NULL,
    month character varying(7) NOT NULL,
    due_date date,
    status character varying(20) DEFAULT 'in_collections'::character varying NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: student_routes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.student_routes (
    student_id uuid NOT NULL,
    route_id uuid NOT NULL
);


--
-- Name: students; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.students (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    branch_id uuid,
    grade character varying(10) NOT NULL,
    status character varying(20) DEFAULT 'Active'::character varying NOT NULL,
    parent_name character varying(150),
    parent_phone character varying(30),
    dob date,
    gender character varying(10),
    address text,
    blood_group character varying(5),
    allergies text,
    medications text,
    chronic_conditions text,
    vaccination_status character varying(50),
    home_medications text,
    bio text,
    risk_level public.risk_level DEFAULT 'Low'::public.risk_level NOT NULL,
    risk_factor text,
    is_scholarship boolean DEFAULT false NOT NULL,
    is_bus_user boolean DEFAULT false NOT NULL,
    monthly_fee numeric(12,2) DEFAULT 0 NOT NULL,
    bus_fee numeric(12,2) DEFAULT 0 NOT NULL,
    penalty_fee numeric(12,2) DEFAULT 0 NOT NULL,
    fee_status public.fee_status DEFAULT 'standard'::public.fee_status NOT NULL,
    fee_approval_status public.fee_approval_status DEFAULT 'none'::public.fee_approval_status NOT NULL,
    fee_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    requested_aid_amount numeric(12,2),
    section_id uuid,
    previous_section_id uuid,
    section_assigned_at timestamp with time zone
);


--
-- Name: subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.subjects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(30) NOT NULL,
    description text,
    grade_level character varying(20) NOT NULL,
    branch_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.system_settings (
    key character varying(100) NOT NULL,
    value text DEFAULT ''::text NOT NULL,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: teacher_department_heads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.teacher_department_heads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    teacher_id uuid NOT NULL,
    department_name character varying(100) NOT NULL,
    assigned_by uuid,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: teacher_exam_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.teacher_exam_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    teacher_id uuid NOT NULL,
    exam_id uuid,
    exam_title character varying(200) NOT NULL,
    exam_date date,
    assigned_class character varying(50),
    assigned_by uuid,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: teacher_of_week_votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.teacher_of_week_votes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    branch_id uuid NOT NULL,
    student_id uuid NOT NULL,
    teacher_id uuid NOT NULL,
    cycle_key character varying(20) NOT NULL,
    ethiopian_week_start character varying(20),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: teacher_unavailability; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.teacher_unavailability (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    teacher_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    academic_year character varying(20) DEFAULT '2025/2026'::character varying NOT NULL,
    day_of_week character varying(15) NOT NULL,
    period_number integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT teacher_unavailability_day_of_week_check CHECK (((day_of_week)::text = ANY ((ARRAY['Monday'::character varying, 'Tuesday'::character varying, 'Wednesday'::character varying, 'Thursday'::character varying, 'Friday'::character varying])::text[]))),
    CONSTRAINT teacher_unavailability_period_number_check CHECK ((period_number >= 1))
);


--
-- Name: teachers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.teachers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    branch_id uuid,
    subjects text[] DEFAULT '{}'::text[] NOT NULL,
    branch character varying(100),
    classes_count integer DEFAULT 0 NOT NULL,
    is_in_class boolean DEFAULT false NOT NULL,
    is_dean boolean DEFAULT false NOT NULL,
    is_room_teacher boolean DEFAULT false NOT NULL,
    assigned_room_class character varying(20),
    department character varying(100),
    hire_date date,
    experience character varying(50),
    bio text,
    is_examiner boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    age integer,
    sex character varying(10),
    emergency_contact character varying(30),
    background_details text,
    assigned_room_section_id uuid,
    student_vote_rating numeric(12,2) DEFAULT 0,
    student_vote_count integer DEFAULT 0,
    vp_rating integer DEFAULT 0
);


--
-- Name: timetable_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.timetable_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    branch_id uuid NOT NULL,
    academic_year character varying(20) DEFAULT '2025/2026'::character varying NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    candidates jsonb DEFAULT '[]'::jsonb NOT NULL,
    approved_candidate integer,
    total_slots_filled integer DEFAULT 0 NOT NULL,
    total_slots_possible integer DEFAULT 0 NOT NULL,
    conflicts_count integer DEFAULT 0 NOT NULL,
    generated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT timetable_runs_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])))
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    digital_id character varying(20),
    username character varying(50),
    name character varying(150) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role public.user_role NOT NULL,
    branch_id uuid,
    status public.user_status DEFAULT 'Pending'::public.user_status NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_branch_auditor boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    staff_profile jsonb,
    zk_device_id character varying(50)
);


--
-- Name: vehicles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.vehicles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plate_number character varying(20) NOT NULL,
    model character varying(100),
    capacity integer DEFAULT 0 NOT NULL,
    branch_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: weekly_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.weekly_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    teacher_id uuid NOT NULL,
    date date NOT NULL,
    content text NOT NULL,
    objectives text NOT NULL,
    teacher_activity text NOT NULL,
    time_duration character varying(30) NOT NULL,
    student_activity text NOT NULL,
    teaching_method character varying(200) NOT NULL,
    teaching_aids character varying(200) NOT NULL,
    evaluation text NOT NULL,
    remark text,
    status public.plan_status DEFAULT 'Pending'::public.plan_status NOT NULL,
    dean_feedback text,
    dean_rating smallint,
    reviewed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    course_id uuid,
    subject character varying(100),
    dept_head_id uuid,
    vc_notified boolean DEFAULT false NOT NULL,
    week_number integer,
    CONSTRAINT weekly_plans_dean_rating_check CHECK (((dean_rating >= 1) AND (dean_rating <= 5)))
);


--
-- Name: absence_queue absence_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'absence_queue_pkey') THEN ALTER TABLE ONLY public.absence_queue
    ADD CONSTRAINT absence_queue_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: academic_grades academic_grades_grade_level_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'academic_grades_grade_level_key') THEN ALTER TABLE ONLY public.academic_grades
    ADD CONSTRAINT academic_grades_grade_level_key UNIQUE (grade_level); END IF; END $$;


--
-- Name: academic_grades academic_grades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'academic_grades_pkey') THEN ALTER TABLE ONLY public.academic_grades
    ADD CONSTRAINT academic_grades_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: academic_history_courses academic_history_courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'academic_history_courses_pkey') THEN ALTER TABLE ONLY public.academic_history_courses
    ADD CONSTRAINT academic_history_courses_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: academic_history academic_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'academic_history_pkey') THEN ALTER TABLE ONLY public.academic_history
    ADD CONSTRAINT academic_history_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: academic_sections academic_sections_grade_id_section_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'academic_sections_grade_id_section_name_key') THEN ALTER TABLE ONLY public.academic_sections
    ADD CONSTRAINT academic_sections_grade_id_section_name_key UNIQUE (grade_id, section_name); END IF; END $$;


--
-- Name: academic_sections academic_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'academic_sections_pkey') THEN ALTER TABLE ONLY public.academic_sections
    ADD CONSTRAINT academic_sections_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: academic_years academic_years_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'academic_years_pkey') THEN ALTER TABLE ONLY public.academic_years
    ADD CONSTRAINT academic_years_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: access_audit_trail access_audit_trail_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'access_audit_trail_pkey') THEN ALTER TABLE ONLY public.access_audit_trail
    ADD CONSTRAINT access_audit_trail_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: asset_adjustments asset_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'asset_adjustments_pkey') THEN ALTER TABLE ONLY public.asset_adjustments
    ADD CONSTRAINT asset_adjustments_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: assets assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assets_pkey') THEN ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: attendance_history attendance_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attendance_history_pkey') THEN ALTER TABLE ONLY public.attendance_history
    ADD CONSTRAINT attendance_history_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: attendance_history attendance_history_student_id_month_year_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attendance_history_student_id_month_year_key') THEN ALTER TABLE ONLY public.attendance_history
    ADD CONSTRAINT attendance_history_student_id_month_year_key UNIQUE (student_id, month, year); END IF; END $$;


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_log_pkey') THEN ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: branch_grade_fees branch_grade_fees_branch_id_grade_level_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'branch_grade_fees_branch_id_grade_level_key') THEN ALTER TABLE ONLY public.branch_grade_fees
    ADD CONSTRAINT branch_grade_fees_branch_id_grade_level_key UNIQUE (branch_id, grade_level); END IF; END $$;


--
-- Name: branch_grade_fees branch_grade_fees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'branch_grade_fees_pkey') THEN ALTER TABLE ONLY public.branch_grade_fees
    ADD CONSTRAINT branch_grade_fees_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: branches branches_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'branches_name_key') THEN ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_name_key UNIQUE (name); END IF; END $$;


--
-- Name: branches branches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'branches_pkey') THEN ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: bulk_communication_recipients bulk_communication_recipients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bulk_communication_recipients_pkey') THEN ALTER TABLE ONLY public.bulk_communication_recipients
    ADD CONSTRAINT bulk_communication_recipients_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: bulk_communications bulk_communications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bulk_communications_pkey') THEN ALTER TABLE ONLY public.bulk_communications
    ADD CONSTRAINT bulk_communications_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: class_teachers class_teachers_class_id_teacher_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'class_teachers_class_id_teacher_id_key') THEN ALTER TABLE ONLY public.class_teachers
    ADD CONSTRAINT class_teachers_class_id_teacher_id_key UNIQUE (class_id, teacher_id); END IF; END $$;


--
-- Name: class_teachers class_teachers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'class_teachers_pkey') THEN ALTER TABLE ONLY public.class_teachers
    ADD CONSTRAINT class_teachers_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: classes classes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'classes_pkey') THEN ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: clinic_chat_messages clinic_chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clinic_chat_messages_pkey') THEN ALTER TABLE ONLY public.clinic_chat_messages
    ADD CONSTRAINT clinic_chat_messages_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: clinic_visits clinic_visits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clinic_visits_pkey') THEN ALTER TABLE ONLY public.clinic_visits
    ADD CONSTRAINT clinic_visits_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: communication_logs communication_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'communication_logs_pkey') THEN ALTER TABLE ONLY public.communication_logs
    ADD CONSTRAINT communication_logs_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: communication_logs communication_logs_student_id_week_ending_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'communication_logs_student_id_week_ending_key') THEN ALTER TABLE ONLY public.communication_logs
    ADD CONSTRAINT communication_logs_student_id_week_ending_key UNIQUE (student_id, week_ending); END IF; END $$;


--
-- Name: course_frequency course_frequency_course_id_academic_year_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'course_frequency_course_id_academic_year_key') THEN ALTER TABLE ONLY public.course_frequency
    ADD CONSTRAINT course_frequency_course_id_academic_year_key UNIQUE (course_id, academic_year); END IF; END $$;


--
-- Name: course_frequency course_frequency_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'course_frequency_pkey') THEN ALTER TABLE ONLY public.course_frequency
    ADD CONSTRAINT course_frequency_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: courses courses_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'courses_code_key') THEN ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_code_key UNIQUE (code); END IF; END $$;


--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'courses_pkey') THEN ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: credential_logs credential_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'credential_logs_pkey') THEN ALTER TABLE ONLY public.credential_logs
    ADD CONSTRAINT credential_logs_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: driver_notifications driver_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'driver_notifications_pkey') THEN ALTER TABLE ONLY public.driver_notifications
    ADD CONSTRAINT driver_notifications_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: email_config_audit email_config_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'email_config_audit_pkey') THEN ALTER TABLE ONLY public.email_config_audit
    ADD CONSTRAINT email_config_audit_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: email_config email_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'email_config_pkey') THEN ALTER TABLE ONLY public.email_config
    ADD CONSTRAINT email_config_pkey PRIMARY KEY (key); END IF; END $$;


--
-- Name: emergency_contacts emergency_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'emergency_contacts_pkey') THEN ALTER TABLE ONLY public.emergency_contacts
    ADD CONSTRAINT emergency_contacts_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: employee_attendance employee_attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_attendance_pkey') THEN ALTER TABLE ONLY public.employee_attendance
    ADD CONSTRAINT employee_attendance_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: employee_attendance employee_attendance_user_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_attendance_user_id_date_key') THEN ALTER TABLE ONLY public.employee_attendance
    ADD CONSTRAINT employee_attendance_user_id_date_key UNIQUE (user_id, date); END IF; END $$;


--
-- Name: employee_payroll_profiles employee_payroll_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_payroll_profiles_pkey') THEN ALTER TABLE ONLY public.employee_payroll_profiles
    ADD CONSTRAINT employee_payroll_profiles_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: employee_payroll_profiles employee_payroll_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_payroll_profiles_user_id_key') THEN ALTER TABLE ONLY public.employee_payroll_profiles
    ADD CONSTRAINT employee_payroll_profiles_user_id_key UNIQUE (user_id); END IF; END $$;


--
-- Name: enrollment_queue enrollment_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'enrollment_queue_pkey') THEN ALTER TABLE ONLY public.enrollment_queue
    ADD CONSTRAINT enrollment_queue_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_pkey') THEN ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: exam_access exam_access_exam_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exam_access_exam_id_user_id_key') THEN ALTER TABLE ONLY public.exam_access
    ADD CONSTRAINT exam_access_exam_id_user_id_key UNIQUE (exam_id, user_id); END IF; END $$;


--
-- Name: exam_access exam_access_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exam_access_pkey') THEN ALTER TABLE ONLY public.exam_access
    ADD CONSTRAINT exam_access_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: exam_lockdown exam_lockdown_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exam_lockdown_pkey') THEN ALTER TABLE ONLY public.exam_lockdown
    ADD CONSTRAINT exam_lockdown_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: exam_question_options exam_question_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exam_question_options_pkey') THEN ALTER TABLE ONLY public.exam_question_options
    ADD CONSTRAINT exam_question_options_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: exam_questions exam_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exam_questions_pkey') THEN ALTER TABLE ONLY public.exam_questions
    ADD CONSTRAINT exam_questions_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: exam_submissions exam_submissions_exam_id_student_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exam_submissions_exam_id_student_id_key') THEN ALTER TABLE ONLY public.exam_submissions
    ADD CONSTRAINT exam_submissions_exam_id_student_id_key UNIQUE (exam_id, student_id); END IF; END $$;


--
-- Name: exam_submissions exam_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exam_submissions_pkey') THEN ALTER TABLE ONLY public.exam_submissions
    ADD CONSTRAINT exam_submissions_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: exam_violations exam_violations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exam_violations_pkey') THEN ALTER TABLE ONLY public.exam_violations
    ADD CONSTRAINT exam_violations_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: exams exams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exams_pkey') THEN ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: finance_settings_audit finance_settings_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_settings_audit_pkey') THEN ALTER TABLE ONLY public.finance_settings_audit
    ADD CONSTRAINT finance_settings_audit_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: finance_settings finance_settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_settings_key_key') THEN ALTER TABLE ONLY public.finance_settings
    ADD CONSTRAINT finance_settings_key_key UNIQUE (key); END IF; END $$;


--
-- Name: finance_settings finance_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_settings_pkey') THEN ALTER TABLE ONLY public.finance_settings
    ADD CONSTRAINT finance_settings_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: finance_summaries finance_summaries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_summaries_pkey') THEN ALTER TABLE ONLY public.finance_summaries
    ADD CONSTRAINT finance_summaries_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: finance_transactions finance_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_transactions_pkey') THEN ALTER TABLE ONLY public.finance_transactions
    ADD CONSTRAINT finance_transactions_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: financial_policies financial_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'financial_policies_pkey') THEN ALTER TABLE ONLY public.financial_policies
    ADD CONSTRAINT financial_policies_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: grade_locks grade_locks_grade_level_branch_id_academic_year_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grade_locks_grade_level_branch_id_academic_year_id_key') THEN ALTER TABLE ONLY public.grade_locks
    ADD CONSTRAINT grade_locks_grade_level_branch_id_academic_year_id_key UNIQUE (grade_level, branch_id, academic_year_id); END IF; END $$;


--
-- Name: grade_locks grade_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grade_locks_pkey') THEN ALTER TABLE ONLY public.grade_locks
    ADD CONSTRAINT grade_locks_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: grade_submissions grade_submissions_course_id_teacher_id_submission_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grade_submissions_course_id_teacher_id_submission_type_key') THEN ALTER TABLE ONLY public.grade_submissions
    ADD CONSTRAINT grade_submissions_course_id_teacher_id_submission_type_key UNIQUE (course_id, teacher_id, submission_type); END IF; END $$;


--
-- Name: grade_submissions grade_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grade_submissions_pkey') THEN ALTER TABLE ONLY public.grade_submissions
    ADD CONSTRAINT grade_submissions_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: grades grades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grades_pkey') THEN ALTER TABLE ONLY public.grades
    ADD CONSTRAINT grades_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: grading_configs grading_configs_grade_level_method_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grading_configs_grade_level_method_id_key') THEN ALTER TABLE ONLY public.grading_configs
    ADD CONSTRAINT grading_configs_grade_level_method_id_key UNIQUE (grade_level, method_id); END IF; END $$;


--
-- Name: grading_configs grading_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grading_configs_pkey') THEN ALTER TABLE ONLY public.grading_configs
    ADD CONSTRAINT grading_configs_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: inventory inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_pkey') THEN ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: library_books library_books_isbn_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'library_books_isbn_key') THEN ALTER TABLE ONLY public.library_books
    ADD CONSTRAINT library_books_isbn_key UNIQUE (isbn); END IF; END $$;


--
-- Name: library_books library_books_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'library_books_pkey') THEN ALTER TABLE ONLY public.library_books
    ADD CONSTRAINT library_books_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: library_loans library_loans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'library_loans_pkey') THEN ALTER TABLE ONLY public.library_loans
    ADD CONSTRAINT library_loans_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: loan_repayments loan_repayments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'loan_repayments_pkey') THEN ALTER TABLE ONLY public.loan_repayments
    ADD CONSTRAINT loan_repayments_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: loans loans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'loans_pkey') THEN ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: logistics_notices logistics_notices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'logistics_notices_pkey') THEN ALTER TABLE ONLY public.logistics_notices
    ADD CONSTRAINT logistics_notices_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: medicine_inventory medicine_inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'medicine_inventory_pkey') THEN ALTER TABLE ONLY public.medicine_inventory
    ADD CONSTRAINT medicine_inventory_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: monthly_profit_targets monthly_profit_targets_branch_period_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'monthly_profit_targets_branch_period_unique') THEN ALTER TABLE ONLY public.monthly_profit_targets
    ADD CONSTRAINT monthly_profit_targets_branch_period_unique UNIQUE (branch_id, ethiopian_month, target_year); END IF; END $$;


--
-- Name: monthly_profit_targets monthly_profit_targets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'monthly_profit_targets_pkey') THEN ALTER TABLE ONLY public.monthly_profit_targets
    ADD CONSTRAINT monthly_profit_targets_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: notices notices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notices_pkey') THEN ALTER TABLE ONLY public.notices
    ADD CONSTRAINT notices_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: parent_student parent_student_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'parent_student_pkey') THEN ALTER TABLE ONLY public.parent_student
    ADD CONSTRAINT parent_student_pkey PRIMARY KEY (parent_id, student_id); END IF; END $$;


--
-- Name: parents parents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'parents_pkey') THEN ALTER TABLE ONLY public.parents
    ADD CONSTRAINT parents_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: payment_items payment_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_items_pkey') THEN ALTER TABLE ONLY public.payment_items
    ADD CONSTRAINT payment_items_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: payment_status_logs payment_status_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_status_logs_pkey') THEN ALTER TABLE ONLY public.payment_status_logs
    ADD CONSTRAINT payment_status_logs_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_pkey') THEN ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: payroll_items payroll_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_items_pkey') THEN ALTER TABLE ONLY public.payroll_items
    ADD CONSTRAINT payroll_items_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: payroll_runs payroll_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_runs_pkey') THEN ALTER TABLE ONLY public.payroll_runs
    ADD CONSTRAINT payroll_runs_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: pending_applications pending_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pending_applications_pkey') THEN ALTER TABLE ONLY public.pending_applications
    ADD CONSTRAINT pending_applications_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: registration_config registration_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'registration_config_pkey') THEN ALTER TABLE ONLY public.registration_config
    ADD CONSTRAINT registration_config_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: registration_exam_config registration_exam_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'registration_exam_config_pkey') THEN ALTER TABLE ONLY public.registration_exam_config
    ADD CONSTRAINT registration_exam_config_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: routes routes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'routes_pkey') THEN ALTER TABLE ONLY public.routes
    ADD CONSTRAINT routes_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: schedule_config schedule_config_branch_id_academic_year_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'schedule_config_branch_id_academic_year_key') THEN ALTER TABLE ONLY public.schedule_config
    ADD CONSTRAINT schedule_config_branch_id_academic_year_key UNIQUE (branch_id, academic_year); END IF; END $$;


--
-- Name: schedule_config schedule_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'schedule_config_pkey') THEN ALTER TABLE ONLY public.schedule_config
    ADD CONSTRAINT schedule_config_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: schedule_structure schedule_structure_branch_id_academic_year_class_id_teacher_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'schedule_structure_branch_id_academic_year_class_id_teacher_key') THEN ALTER TABLE ONLY public.schedule_structure
    ADD CONSTRAINT schedule_structure_branch_id_academic_year_class_id_teacher_key UNIQUE (branch_id, academic_year, class_id, teacher_id, subject); END IF; END $$;


--
-- Name: schedule_structure schedule_structure_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'schedule_structure_pkey') THEN ALTER TABLE ONLY public.schedule_structure
    ADD CONSTRAINT schedule_structure_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: schedules schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'schedules_pkey') THEN ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT schedules_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: school_config school_config_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'school_config_key_key') THEN ALTER TABLE ONLY public.school_config
    ADD CONSTRAINT school_config_key_key UNIQUE (key); END IF; END $$;


--
-- Name: school_config school_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'school_config_pkey') THEN ALTER TABLE ONLY public.school_config
    ADD CONSTRAINT school_config_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: section_assignment_audit section_assignment_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'section_assignment_audit_pkey') THEN ALTER TABLE ONLY public.section_assignment_audit
    ADD CONSTRAINT section_assignment_audit_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: silo_announcements silo_announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_announcements_pkey') THEN ALTER TABLE ONLY public.silo_announcements
    ADD CONSTRAINT silo_announcements_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: silo_books silo_books_isbn_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_books_isbn_key') THEN ALTER TABLE ONLY public.silo_books
    ADD CONSTRAINT silo_books_isbn_key UNIQUE (isbn); END IF; END $$;


--
-- Name: silo_books silo_books_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_books_pkey') THEN ALTER TABLE ONLY public.silo_books
    ADD CONSTRAINT silo_books_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: silo_clinic_chat silo_clinic_chat_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_clinic_chat_pkey') THEN ALTER TABLE ONLY public.silo_clinic_chat
    ADD CONSTRAINT silo_clinic_chat_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: silo_clinic_records silo_clinic_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_clinic_records_pkey') THEN ALTER TABLE ONLY public.silo_clinic_records
    ADD CONSTRAINT silo_clinic_records_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: silo_communication_book silo_communication_book_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_communication_book_pkey') THEN ALTER TABLE ONLY public.silo_communication_book
    ADD CONSTRAINT silo_communication_book_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: silo_courses silo_courses_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_courses_code_key') THEN ALTER TABLE ONLY public.silo_courses
    ADD CONSTRAINT silo_courses_code_key UNIQUE (code); END IF; END $$;


--
-- Name: silo_courses silo_courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_courses_pkey') THEN ALTER TABLE ONLY public.silo_courses
    ADD CONSTRAINT silo_courses_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: silo_deadlines silo_deadlines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_deadlines_pkey') THEN ALTER TABLE ONLY public.silo_deadlines
    ADD CONSTRAINT silo_deadlines_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: silo_drivers silo_drivers_license_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_drivers_license_number_key') THEN ALTER TABLE ONLY public.silo_drivers
    ADD CONSTRAINT silo_drivers_license_number_key UNIQUE (license_number); END IF; END $$;


--
-- Name: silo_drivers silo_drivers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_drivers_pkey') THEN ALTER TABLE ONLY public.silo_drivers
    ADD CONSTRAINT silo_drivers_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: silo_enrollments silo_enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_enrollments_pkey') THEN ALTER TABLE ONLY public.silo_enrollments
    ADD CONSTRAINT silo_enrollments_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: silo_family_links silo_family_links_parent_user_id_student_identity_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_family_links_parent_user_id_student_identity_id_key') THEN ALTER TABLE ONLY public.silo_family_links
    ADD CONSTRAINT silo_family_links_parent_user_id_student_identity_id_key UNIQUE (parent_user_id, student_identity_id); END IF; END $$;


--
-- Name: silo_family_links silo_family_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_family_links_pkey') THEN ALTER TABLE ONLY public.silo_family_links
    ADD CONSTRAINT silo_family_links_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: silo_identities silo_identities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_identities_pkey') THEN ALTER TABLE ONLY public.silo_identities
    ADD CONSTRAINT silo_identities_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: silo_identities silo_identities_school_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_identities_school_id_key') THEN ALTER TABLE ONLY public.silo_identities
    ADD CONSTRAINT silo_identities_school_id_key UNIQUE (school_id); END IF; END $$;


--
-- Name: silo_loans silo_loans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_loans_pkey') THEN ALTER TABLE ONLY public.silo_loans
    ADD CONSTRAINT silo_loans_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: silo_logistics_notices silo_logistics_notices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_logistics_notices_pkey') THEN ALTER TABLE ONLY public.silo_logistics_notices
    ADD CONSTRAINT silo_logistics_notices_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: silo_parents silo_parents_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_parents_email_key') THEN ALTER TABLE ONLY public.silo_parents
    ADD CONSTRAINT silo_parents_email_key UNIQUE (email); END IF; END $$;


--
-- Name: silo_parents silo_parents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_parents_pkey') THEN ALTER TABLE ONLY public.silo_parents
    ADD CONSTRAINT silo_parents_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: silo_route_manifest silo_route_manifest_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_route_manifest_pkey') THEN ALTER TABLE ONLY public.silo_route_manifest
    ADD CONSTRAINT silo_route_manifest_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: silo_route_manifest silo_route_manifest_route_id_student_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_route_manifest_route_id_student_id_key') THEN ALTER TABLE ONLY public.silo_route_manifest
    ADD CONSTRAINT silo_route_manifest_route_id_student_id_key UNIQUE (route_id, student_id); END IF; END $$;


--
-- Name: silo_routes silo_routes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_routes_pkey') THEN ALTER TABLE ONLY public.silo_routes
    ADD CONSTRAINT silo_routes_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: silo_schedule silo_schedule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_schedule_pkey') THEN ALTER TABLE ONLY public.silo_schedule
    ADD CONSTRAINT silo_schedule_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: silo_sections silo_sections_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_sections_name_key') THEN ALTER TABLE ONLY public.silo_sections
    ADD CONSTRAINT silo_sections_name_key UNIQUE (name); END IF; END $$;


--
-- Name: silo_sections silo_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_sections_pkey') THEN ALTER TABLE ONLY public.silo_sections
    ADD CONSTRAINT silo_sections_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: silo_student_grades silo_student_grades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_student_grades_pkey') THEN ALTER TABLE ONLY public.silo_student_grades
    ADD CONSTRAINT silo_student_grades_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: silo_student_parents silo_student_parents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_student_parents_pkey') THEN ALTER TABLE ONLY public.silo_student_parents
    ADD CONSTRAINT silo_student_parents_pkey PRIMARY KEY (student_id, parent_id); END IF; END $$;


--
-- Name: silo_student_stats silo_student_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_student_stats_pkey') THEN ALTER TABLE ONLY public.silo_student_stats
    ADD CONSTRAINT silo_student_stats_pkey PRIMARY KEY (student_id); END IF; END $$;


--
-- Name: silo_students silo_students_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_students_email_key') THEN ALTER TABLE ONLY public.silo_students
    ADD CONSTRAINT silo_students_email_key UNIQUE (email); END IF; END $$;


--
-- Name: silo_students silo_students_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_students_pkey') THEN ALTER TABLE ONLY public.silo_students
    ADD CONSTRAINT silo_students_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: silo_teacher_rewards silo_teacher_rewards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_teacher_rewards_pkey') THEN ALTER TABLE ONLY public.silo_teacher_rewards
    ADD CONSTRAINT silo_teacher_rewards_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: silo_users silo_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_users_pkey') THEN ALTER TABLE ONLY public.silo_users
    ADD CONSTRAINT silo_users_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: staff_notifications staff_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'staff_notifications_pkey') THEN ALTER TABLE ONLY public.staff_notifications
    ADD CONSTRAINT staff_notifications_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: student_aid_usages student_aid_usages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_aid_usages_pkey') THEN ALTER TABLE ONLY public.student_aid_usages
    ADD CONSTRAINT student_aid_usages_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: student_aids student_aids_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_aids_pkey') THEN ALTER TABLE ONLY public.student_aids
    ADD CONSTRAINT student_aids_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: student_attendance student_attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_attendance_pkey') THEN ALTER TABLE ONLY public.student_attendance
    ADD CONSTRAINT student_attendance_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: student_attendance student_attendance_student_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_attendance_student_id_date_key') THEN ALTER TABLE ONLY public.student_attendance
    ADD CONSTRAINT student_attendance_student_id_date_key UNIQUE (student_id, date); END IF; END $$;


--
-- Name: student_collections student_collections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_collections_pkey') THEN ALTER TABLE ONLY public.student_collections
    ADD CONSTRAINT student_collections_pkey PRIMARY KEY (student_id, month); END IF; END $$;


--
-- Name: student_routes student_routes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_routes_pkey') THEN ALTER TABLE ONLY public.student_routes
    ADD CONSTRAINT student_routes_pkey PRIMARY KEY (student_id, route_id); END IF; END $$;


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'students_pkey') THEN ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: subjects subjects_code_branch_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subjects_code_branch_id_key') THEN ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_code_branch_id_key UNIQUE (code, branch_id); END IF; END $$;


--
-- Name: subjects subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subjects_pkey') THEN ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'system_settings_pkey') THEN ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (key); END IF; END $$;


--
-- Name: teacher_department_heads teacher_department_heads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teacher_department_heads_pkey') THEN ALTER TABLE ONLY public.teacher_department_heads
    ADD CONSTRAINT teacher_department_heads_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: teacher_department_heads teacher_department_heads_teacher_id_department_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teacher_department_heads_teacher_id_department_name_key') THEN ALTER TABLE ONLY public.teacher_department_heads
    ADD CONSTRAINT teacher_department_heads_teacher_id_department_name_key UNIQUE (teacher_id, department_name); END IF; END $$;


--
-- Name: teacher_exam_assignments teacher_exam_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teacher_exam_assignments_pkey') THEN ALTER TABLE ONLY public.teacher_exam_assignments
    ADD CONSTRAINT teacher_exam_assignments_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: teacher_of_week_votes teacher_of_week_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teacher_of_week_votes_pkey') THEN ALTER TABLE ONLY public.teacher_of_week_votes
    ADD CONSTRAINT teacher_of_week_votes_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: teacher_of_week_votes teacher_of_week_votes_student_id_cycle_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teacher_of_week_votes_student_id_cycle_key_key') THEN ALTER TABLE ONLY public.teacher_of_week_votes
    ADD CONSTRAINT teacher_of_week_votes_student_id_cycle_key_key UNIQUE (student_id, cycle_key); END IF; END $$;


--
-- Name: teacher_unavailability teacher_unavailability_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teacher_unavailability_pkey') THEN ALTER TABLE ONLY public.teacher_unavailability
    ADD CONSTRAINT teacher_unavailability_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: teacher_unavailability teacher_unavailability_teacher_id_day_of_week_period_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teacher_unavailability_teacher_id_day_of_week_period_number_key') THEN ALTER TABLE ONLY public.teacher_unavailability
    ADD CONSTRAINT teacher_unavailability_teacher_id_day_of_week_period_number_key UNIQUE (teacher_id, day_of_week, period_number, academic_year); END IF; END $$;


--
-- Name: teachers teachers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teachers_pkey') THEN ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: timetable_runs timetable_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'timetable_runs_pkey') THEN ALTER TABLE ONLY public.timetable_runs
    ADD CONSTRAINT timetable_runs_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: silo_enrollments uq_enrollment; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_enrollment') THEN ALTER TABLE ONLY public.silo_enrollments
    ADD CONSTRAINT uq_enrollment UNIQUE (student_id, course_id, academic_year, semester); END IF; END $$;


--
-- Name: silo_users uq_identity_role; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_identity_role') THEN ALTER TABLE ONLY public.silo_users
    ADD CONSTRAINT uq_identity_role UNIQUE (identity_id, role); END IF; END $$;


--
-- Name: silo_teacher_rewards uq_teacher_reward; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_teacher_reward') THEN ALTER TABLE ONLY public.silo_teacher_rewards
    ADD CONSTRAINT uq_teacher_reward UNIQUE (teacher_identity_id, reward_month, reward_year); END IF; END $$;


--
-- Name: users users_digital_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_digital_id_key') THEN ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_digital_id_key UNIQUE (digital_id); END IF; END $$;


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_pkey') THEN ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_username_key') THEN ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username); END IF; END $$;


--
-- Name: users users_zk_device_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_zk_device_id_key') THEN ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_zk_device_id_key UNIQUE (zk_device_id); END IF; END $$;


--
-- Name: vehicles vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vehicles_pkey') THEN ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: vehicles vehicles_plate_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vehicles_plate_number_key') THEN ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_plate_number_key UNIQUE (plate_number); END IF; END $$;


--
-- Name: weekly_plans weekly_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'weekly_plans_pkey') THEN ALTER TABLE ONLY public.weekly_plans
    ADD CONSTRAINT weekly_plans_pkey PRIMARY KEY (id); END IF; END $$;


--
-- Name: idx_academic_sections_branch; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_academic_sections_branch') THEN CREATE INDEX idx_academic_sections_branch ON public.academic_sections USING btree (branch_id); END IF; END $$;


--
-- Name: idx_academic_sections_grade; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_academic_sections_grade') THEN CREATE INDEX idx_academic_sections_grade ON public.academic_sections USING btree (grade_id); END IF; END $$;


--
-- Name: idx_asset_adjustments_asset; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_asset_adjustments_asset') THEN CREATE INDEX idx_asset_adjustments_asset ON public.asset_adjustments USING btree (asset_id); END IF; END $$;


--
-- Name: idx_asset_adjustments_branch; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_asset_adjustments_branch') THEN CREATE INDEX idx_asset_adjustments_branch ON public.asset_adjustments USING btree (branch_id); END IF; END $$;


--
-- Name: idx_audit_category; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_audit_category') THEN CREATE INDEX idx_audit_category ON public.audit_log USING btree (category); END IF; END $$;


--
-- Name: idx_audit_direction; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_audit_direction') THEN CREATE INDEX idx_audit_direction ON public.audit_log USING btree (direction); END IF; END $$;


--
-- Name: idx_audit_timestamp; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_audit_timestamp') THEN CREATE INDEX idx_audit_timestamp ON public.audit_log USING btree ("timestamp"); END IF; END $$;


--
-- Name: idx_branch_grade_fees_branch; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_branch_grade_fees_branch') THEN CREATE INDEX idx_branch_grade_fees_branch ON public.branch_grade_fees USING btree (branch_id); END IF; END $$;


--
-- Name: idx_clinic_chat_student; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_clinic_chat_student') THEN CREATE INDEX idx_clinic_chat_student ON public.silo_clinic_chat USING btree (student_id); END IF; END $$;


--
-- Name: idx_comm_book_id; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_comm_book_id') THEN CREATE INDEX idx_comm_book_id ON public.silo_communication_book USING btree (student_id); END IF; END $$;


--
-- Name: idx_course_freq_branch; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_course_freq_branch') THEN CREATE INDEX idx_course_freq_branch ON public.course_frequency USING btree (branch_id); END IF; END $$;


--
-- Name: idx_course_freq_course; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_course_freq_course') THEN CREATE INDEX idx_course_freq_course ON public.course_frequency USING btree (course_id); END IF; END $$;


--
-- Name: idx_driver_notifications_created_at; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_driver_notifications_created_at') THEN CREATE INDEX idx_driver_notifications_created_at ON public.driver_notifications USING btree (created_at); END IF; END $$;


--
-- Name: idx_driver_notifications_driver_id; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_driver_notifications_driver_id') THEN CREATE INDEX idx_driver_notifications_driver_id ON public.driver_notifications USING btree (driver_id); END IF; END $$;


--
-- Name: idx_employee_attendance_user_date; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_employee_attendance_user_date') THEN CREATE INDEX idx_employee_attendance_user_date ON public.employee_attendance USING btree (user_id, date); END IF; END $$;


--
-- Name: idx_employee_payroll_profiles_user_id; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_employee_payroll_profiles_user_id') THEN CREATE INDEX idx_employee_payroll_profiles_user_id ON public.employee_payroll_profiles USING btree (user_id); END IF; END $$;


--
-- Name: idx_family_links_parent; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_family_links_parent') THEN CREATE INDEX idx_family_links_parent ON public.silo_family_links USING btree (parent_user_id); END IF; END $$;


--
-- Name: idx_finance_transactions_branch; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_finance_transactions_branch') THEN CREATE INDEX idx_finance_transactions_branch ON public.finance_transactions USING btree (branch_id); END IF; END $$;


--
-- Name: idx_finance_transactions_branch_date; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_finance_transactions_branch_date') THEN CREATE INDEX idx_finance_transactions_branch_date ON public.finance_transactions USING btree (branch_id, date); END IF; END $$;


--
-- Name: idx_finance_transactions_date; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_finance_transactions_date') THEN CREATE INDEX idx_finance_transactions_date ON public.finance_transactions USING btree (date); END IF; END $$;


--
-- Name: idx_finance_transactions_eth; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_finance_transactions_eth') THEN CREATE INDEX idx_finance_transactions_eth ON public.finance_transactions USING btree (ethiopic_month, ethiopic_year); END IF; END $$;


--
-- Name: idx_finance_transactions_student; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_finance_transactions_student') THEN CREATE INDEX idx_finance_transactions_student ON public.finance_transactions USING btree (student_id); END IF; END $$;


--
-- Name: idx_finance_transactions_student_id; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_finance_transactions_student_id') THEN CREATE INDEX idx_finance_transactions_student_id ON public.finance_transactions USING btree (student_id); END IF; END $$;


--
-- Name: idx_finance_transactions_type; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_finance_transactions_type') THEN CREATE INDEX idx_finance_transactions_type ON public.finance_transactions USING btree (type); END IF; END $$;


--
-- Name: idx_grade_locks_branch; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_grade_locks_branch') THEN CREATE INDEX idx_grade_locks_branch ON public.grade_locks USING btree (branch_id); END IF; END $$;


--
-- Name: idx_loan_repayments_loan_id; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_loan_repayments_loan_id') THEN CREATE INDEX idx_loan_repayments_loan_id ON public.loan_repayments USING btree (loan_id); END IF; END $$;


--
-- Name: idx_loans_employee_id; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_loans_employee_id') THEN CREATE INDEX idx_loans_employee_id ON public.loans USING btree (employee_id); END IF; END $$;


--
-- Name: idx_monthly_profit_targets_branch; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_monthly_profit_targets_branch') THEN CREATE INDEX idx_monthly_profit_targets_branch ON public.monthly_profit_targets USING btree (branch_id); END IF; END $$;


--
-- Name: idx_monthly_profit_targets_branch_period; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_monthly_profit_targets_branch_period') THEN CREATE UNIQUE INDEX idx_monthly_profit_targets_branch_period ON public.monthly_profit_targets USING btree (branch_id, ethiopian_month, target_year) WHERE (branch_id IS NOT NULL); END IF; END $$;


--
-- Name: idx_payment_items_fee_type; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_payment_items_fee_type') THEN CREATE INDEX idx_payment_items_fee_type ON public.payment_items USING btree (fee_type); END IF; END $$;


--
-- Name: idx_payments_student_month; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_payments_student_month') THEN CREATE INDEX idx_payments_student_month ON public.payments USING btree (student_id, month); END IF; END $$;


--
-- Name: idx_payroll_items_employee_id; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_payroll_items_employee_id') THEN CREATE INDEX idx_payroll_items_employee_id ON public.payroll_items USING btree (employee_id); END IF; END $$;


--
-- Name: idx_payroll_items_run_id; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_payroll_items_run_id') THEN CREATE INDEX idx_payroll_items_run_id ON public.payroll_items USING btree (payroll_run_id); END IF; END $$;


--
-- Name: idx_payroll_runs_month_year; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_payroll_runs_month_year') THEN CREATE INDEX idx_payroll_runs_month_year ON public.payroll_runs USING btree (month, year); END IF; END $$;


--
-- Name: idx_schedule_config_branch; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_schedule_config_branch') THEN CREATE INDEX idx_schedule_config_branch ON public.schedule_config USING btree (branch_id); END IF; END $$;


--
-- Name: idx_schedule_structure_branch; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_schedule_structure_branch') THEN CREATE INDEX idx_schedule_structure_branch ON public.schedule_structure USING btree (branch_id); END IF; END $$;


--
-- Name: idx_schedule_structure_year; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_schedule_structure_year') THEN CREATE INDEX idx_schedule_structure_year ON public.schedule_structure USING btree (academic_year); END IF; END $$;


--
-- Name: idx_section_assignment_audit_created; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_section_assignment_audit_created') THEN CREATE INDEX idx_section_assignment_audit_created ON public.section_assignment_audit USING btree (created_at); END IF; END $$;


--
-- Name: idx_section_assignment_audit_student; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_section_assignment_audit_student') THEN CREATE INDEX idx_section_assignment_audit_student ON public.section_assignment_audit USING btree (student_id); END IF; END $$;


--
-- Name: idx_silo_books_status; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_silo_books_status') THEN CREATE INDEX idx_silo_books_status ON public.silo_books USING btree (status); END IF; END $$;


--
-- Name: idx_silo_courses_teacher; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_silo_courses_teacher') THEN CREATE INDEX idx_silo_courses_teacher ON public.silo_courses USING btree (teacher_id); END IF; END $$;


--
-- Name: idx_silo_deadlines_due_date; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_silo_deadlines_due_date') THEN CREATE INDEX idx_silo_deadlines_due_date ON public.silo_deadlines USING btree (due_date); END IF; END $$;


--
-- Name: idx_silo_deadlines_section; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_silo_deadlines_section') THEN CREATE INDEX idx_silo_deadlines_section ON public.silo_deadlines USING btree (section_id); END IF; END $$;


--
-- Name: idx_silo_enrollments_course; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_silo_enrollments_course') THEN CREATE INDEX idx_silo_enrollments_course ON public.silo_enrollments USING btree (course_id); END IF; END $$;


--
-- Name: idx_silo_enrollments_student; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_silo_enrollments_student') THEN CREATE INDEX idx_silo_enrollments_student ON public.silo_enrollments USING btree (student_id); END IF; END $$;


--
-- Name: idx_silo_identities_school_id; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_silo_identities_school_id') THEN CREATE INDEX idx_silo_identities_school_id ON public.silo_identities USING btree (school_id); END IF; END $$;


--
-- Name: idx_silo_loans_student_id; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_silo_loans_student_id') THEN CREATE INDEX idx_silo_loans_student_id ON public.silo_loans USING btree (student_id); END IF; END $$;


--
-- Name: idx_silo_logistics_notices_time; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_silo_logistics_notices_time') THEN CREATE INDEX idx_silo_logistics_notices_time ON public.silo_logistics_notices USING btree ("timestamp"); END IF; END $$;


--
-- Name: idx_silo_parents_email; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_silo_parents_email') THEN CREATE INDEX idx_silo_parents_email ON public.silo_parents USING btree (email); END IF; END $$;


--
-- Name: idx_silo_route_manifest_route_id; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_silo_route_manifest_route_id') THEN CREATE INDEX idx_silo_route_manifest_route_id ON public.silo_route_manifest USING btree (route_id); END IF; END $$;


--
-- Name: idx_silo_routes_driver_id; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_silo_routes_driver_id') THEN CREATE INDEX idx_silo_routes_driver_id ON public.silo_routes USING btree (driver_id); END IF; END $$;


--
-- Name: idx_silo_schedule_day; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_silo_schedule_day') THEN CREATE INDEX idx_silo_schedule_day ON public.silo_schedule USING btree (day_of_week); END IF; END $$;


--
-- Name: idx_silo_schedule_section; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_silo_schedule_section') THEN CREATE INDEX idx_silo_schedule_section ON public.silo_schedule USING btree (section_id); END IF; END $$;


--
-- Name: idx_silo_students_email; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_silo_students_email') THEN CREATE INDEX idx_silo_students_email ON public.silo_students USING btree (email); END IF; END $$;


--
-- Name: idx_silo_users_identity_id; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_silo_users_identity_id') THEN CREATE INDEX idx_silo_users_identity_id ON public.silo_users USING btree (identity_id); END IF; END $$;


--
-- Name: idx_staff_notifications_is_read; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_staff_notifications_is_read') THEN CREATE INDEX idx_staff_notifications_is_read ON public.staff_notifications USING btree (is_read); END IF; END $$;


--
-- Name: idx_staff_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_staff_notifications_user_id') THEN CREATE INDEX idx_staff_notifications_user_id ON public.staff_notifications USING btree (user_id); END IF; END $$;


--
-- Name: idx_student_aid_usages_student_month; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_student_aid_usages_student_month') THEN CREATE INDEX idx_student_aid_usages_student_month ON public.student_aid_usages USING btree (student_id, month); END IF; END $$;


--
-- Name: idx_student_aids_student_id; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_student_aids_student_id') THEN CREATE INDEX idx_student_aids_student_id ON public.student_aids USING btree (student_id); END IF; END $$;


--
-- Name: idx_student_collections_month; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_student_collections_month') THEN CREATE INDEX idx_student_collections_month ON public.student_collections USING btree (month); END IF; END $$;


--
-- Name: idx_student_grades_id; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_student_grades_id') THEN CREATE INDEX idx_student_grades_id ON public.silo_student_grades USING btree (student_id); END IF; END $$;


--
-- Name: idx_students_grade; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_students_grade') THEN CREATE INDEX idx_students_grade ON public.students USING btree (grade); END IF; END $$;


--
-- Name: idx_students_previous_section; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_students_previous_section') THEN CREATE INDEX idx_students_previous_section ON public.students USING btree (previous_section_id); END IF; END $$;


--
-- Name: idx_students_section; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_students_section') THEN CREATE INDEX idx_students_section ON public.students USING btree (section_id); END IF; END $$;


--
-- Name: idx_students_status; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_students_status') THEN CREATE INDEX idx_students_status ON public.students USING btree (status); END IF; END $$;


--
-- Name: idx_teacher_of_week_votes_cycle; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_teacher_of_week_votes_cycle') THEN CREATE INDEX idx_teacher_of_week_votes_cycle ON public.teacher_of_week_votes USING btree (branch_id, cycle_key); END IF; END $$;


--
-- Name: idx_teacher_unavail_branch; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_teacher_unavail_branch') THEN CREATE INDEX idx_teacher_unavail_branch ON public.teacher_unavailability USING btree (branch_id); END IF; END $$;


--
-- Name: idx_teacher_unavail_teacher; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_teacher_unavail_teacher') THEN CREATE INDEX idx_teacher_unavail_teacher ON public.teacher_unavailability USING btree (teacher_id); END IF; END $$;


--
-- Name: idx_timetable_runs_branch; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_timetable_runs_branch') THEN CREATE INDEX idx_timetable_runs_branch ON public.timetable_runs USING btree (branch_id); END IF; END $$;


--
-- Name: idx_timetable_runs_status; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_timetable_runs_status') THEN CREATE INDEX idx_timetable_runs_status ON public.timetable_runs USING btree (status); END IF; END $$;


--
-- Name: idx_users_branch; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_users_branch') THEN CREATE INDEX idx_users_branch ON public.users USING btree (branch_id); END IF; END $$;


--
-- Name: idx_users_digital; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_users_digital') THEN CREATE INDEX idx_users_digital ON public.users USING btree (digital_id); END IF; END $$;


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_users_email') THEN CREATE INDEX idx_users_email ON public.users USING btree (email); END IF; END $$;


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_users_role') THEN CREATE INDEX idx_users_role ON public.users USING btree (role); END IF; END $$;


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_users_username') THEN CREATE INDEX idx_users_username ON public.users USING btree (username); END IF; END $$;


--
-- Name: uq_grades_student_course_type_term; Type: INDEX; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'uq_grades_student_course_type_term') THEN CREATE UNIQUE INDEX uq_grades_student_course_type_term ON public.grades USING btree (student_id, course_id, type, academic_year, semester); END IF; END $$;


--
-- Name: academic_grades trg_academic_grades_updated; Type: TRIGGER; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_academic_grades_updated') THEN CREATE TRIGGER trg_academic_grades_updated BEFORE UPDATE ON public.academic_grades FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column(); END IF; END $$;


--
-- Name: academic_sections trg_academic_sections_updated; Type: TRIGGER; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_academic_sections_updated') THEN CREATE TRIGGER trg_academic_sections_updated BEFORE UPDATE ON public.academic_sections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column(); END IF; END $$;


--
-- Name: exams trg_exams_updated; Type: TRIGGER; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_exams_updated') THEN CREATE TRIGGER trg_exams_updated BEFORE UPDATE ON public.exams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column(); END IF; END $$;


--
-- Name: inventory trg_inventory_updated; Type: TRIGGER; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_inventory_updated') THEN CREATE TRIGGER trg_inventory_updated BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column(); END IF; END $$;


--
-- Name: medicine_inventory trg_medicine_updated; Type: TRIGGER; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_medicine_updated') THEN CREATE TRIGGER trg_medicine_updated BEFORE UPDATE ON public.medicine_inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column(); END IF; END $$;


--
-- Name: pending_applications trg_pending_apps_upd; Type: TRIGGER; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_pending_apps_upd') THEN CREATE TRIGGER trg_pending_apps_upd BEFORE UPDATE ON public.pending_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column(); END IF; END $$;


--
-- Name: registration_config trg_registration_config_updated; Type: TRIGGER; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_registration_config_updated') THEN CREATE TRIGGER trg_registration_config_updated BEFORE UPDATE ON public.registration_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column(); END IF; END $$;


--
-- Name: students trg_students_updated; Type: TRIGGER; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_students_updated') THEN CREATE TRIGGER trg_students_updated BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column(); END IF; END $$;


--
-- Name: teachers trg_teachers_updated; Type: TRIGGER; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_teachers_updated') THEN CREATE TRIGGER trg_teachers_updated BEFORE UPDATE ON public.teachers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column(); END IF; END $$;


--
-- Name: users trg_users_updated; Type: TRIGGER; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_updated') THEN CREATE TRIGGER trg_users_updated BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column(); END IF; END $$;


--
-- Name: weekly_plans trg_weekly_plans_upd; Type: TRIGGER; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_weekly_plans_upd') THEN CREATE TRIGGER trg_weekly_plans_upd BEFORE UPDATE ON public.weekly_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column(); END IF; END $$;


--
-- Name: absence_queue absence_queue_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'absence_queue_student_id_fkey') THEN ALTER TABLE ONLY public.absence_queue
    ADD CONSTRAINT absence_queue_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: academic_grades academic_grades_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'academic_grades_branch_id_fkey') THEN ALTER TABLE ONLY public.academic_grades
    ADD CONSTRAINT academic_grades_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: academic_history_courses academic_history_courses_history_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'academic_history_courses_history_id_fkey') THEN ALTER TABLE ONLY public.academic_history_courses
    ADD CONSTRAINT academic_history_courses_history_id_fkey FOREIGN KEY (history_id) REFERENCES public.academic_history(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: academic_history academic_history_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'academic_history_student_id_fkey') THEN ALTER TABLE ONLY public.academic_history
    ADD CONSTRAINT academic_history_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: academic_sections academic_sections_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'academic_sections_branch_id_fkey') THEN ALTER TABLE ONLY public.academic_sections
    ADD CONSTRAINT academic_sections_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: academic_sections academic_sections_grade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'academic_sections_grade_id_fkey') THEN ALTER TABLE ONLY public.academic_sections
    ADD CONSTRAINT academic_sections_grade_id_fkey FOREIGN KEY (grade_id) REFERENCES public.academic_grades(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: academic_sections academic_sections_room_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'academic_sections_room_teacher_id_fkey') THEN ALTER TABLE ONLY public.academic_sections
    ADD CONSTRAINT academic_sections_room_teacher_id_fkey FOREIGN KEY (room_teacher_id) REFERENCES public.teachers(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: academic_years academic_years_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'academic_years_branch_id_fkey') THEN ALTER TABLE ONLY public.academic_years
    ADD CONSTRAINT academic_years_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: access_audit_trail access_audit_trail_attempted_branch_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'access_audit_trail_attempted_branch_fkey') THEN ALTER TABLE ONLY public.access_audit_trail
    ADD CONSTRAINT access_audit_trail_attempted_branch_fkey FOREIGN KEY (attempted_branch) REFERENCES public.branches(id); END IF; END $$;


--
-- Name: access_audit_trail access_audit_trail_user_branch_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'access_audit_trail_user_branch_fkey') THEN ALTER TABLE ONLY public.access_audit_trail
    ADD CONSTRAINT access_audit_trail_user_branch_fkey FOREIGN KEY (user_branch) REFERENCES public.branches(id); END IF; END $$;


--
-- Name: access_audit_trail access_audit_trail_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'access_audit_trail_user_id_fkey') THEN ALTER TABLE ONLY public.access_audit_trail
    ADD CONSTRAINT access_audit_trail_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id); END IF; END $$;


--
-- Name: asset_adjustments asset_adjustments_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'asset_adjustments_asset_id_fkey') THEN ALTER TABLE ONLY public.asset_adjustments
    ADD CONSTRAINT asset_adjustments_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: asset_adjustments asset_adjustments_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'asset_adjustments_branch_id_fkey') THEN ALTER TABLE ONLY public.asset_adjustments
    ADD CONSTRAINT asset_adjustments_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: assets assets_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assets_branch_id_fkey') THEN ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: attendance_history attendance_history_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attendance_history_student_id_fkey') THEN ALTER TABLE ONLY public.attendance_history
    ADD CONSTRAINT attendance_history_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: audit_log audit_log_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_log_student_id_fkey') THEN ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: branch_grade_fees branch_grade_fees_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'branch_grade_fees_branch_id_fkey') THEN ALTER TABLE ONLY public.branch_grade_fees
    ADD CONSTRAINT branch_grade_fees_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: branch_grade_fees branch_grade_fees_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'branch_grade_fees_updated_by_fkey') THEN ALTER TABLE ONLY public.branch_grade_fees
    ADD CONSTRAINT branch_grade_fees_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: bulk_communication_recipients bulk_communication_recipients_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bulk_communication_recipients_application_id_fkey') THEN ALTER TABLE ONLY public.bulk_communication_recipients
    ADD CONSTRAINT bulk_communication_recipients_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.pending_applications(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: bulk_communication_recipients bulk_communication_recipients_communication_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bulk_communication_recipients_communication_id_fkey') THEN ALTER TABLE ONLY public.bulk_communication_recipients
    ADD CONSTRAINT bulk_communication_recipients_communication_id_fkey FOREIGN KEY (communication_id) REFERENCES public.bulk_communications(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: bulk_communications bulk_communications_sent_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bulk_communications_sent_by_fkey') THEN ALTER TABLE ONLY public.bulk_communications
    ADD CONSTRAINT bulk_communications_sent_by_fkey FOREIGN KEY (sent_by) REFERENCES public.users(id); END IF; END $$;


--
-- Name: class_teachers class_teachers_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'class_teachers_class_id_fkey') THEN ALTER TABLE ONLY public.class_teachers
    ADD CONSTRAINT class_teachers_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: class_teachers class_teachers_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'class_teachers_teacher_id_fkey') THEN ALTER TABLE ONLY public.class_teachers
    ADD CONSTRAINT class_teachers_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: classes classes_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'classes_branch_id_fkey') THEN ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: classes classes_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'classes_teacher_id_fkey') THEN ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: clinic_chat_messages clinic_chat_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clinic_chat_messages_sender_id_fkey') THEN ALTER TABLE ONLY public.clinic_chat_messages
    ADD CONSTRAINT clinic_chat_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: clinic_chat_messages clinic_chat_messages_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clinic_chat_messages_student_id_fkey') THEN ALTER TABLE ONLY public.clinic_chat_messages
    ADD CONSTRAINT clinic_chat_messages_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id); END IF; END $$;


--
-- Name: clinic_visits clinic_visits_logged_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clinic_visits_logged_by_fkey') THEN ALTER TABLE ONLY public.clinic_visits
    ADD CONSTRAINT clinic_visits_logged_by_fkey FOREIGN KEY (logged_by) REFERENCES public.users(id); END IF; END $$;


--
-- Name: clinic_visits clinic_visits_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clinic_visits_student_id_fkey') THEN ALTER TABLE ONLY public.clinic_visits
    ADD CONSTRAINT clinic_visits_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: communication_logs communication_logs_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'communication_logs_student_id_fkey') THEN ALTER TABLE ONLY public.communication_logs
    ADD CONSTRAINT communication_logs_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: communication_logs communication_logs_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'communication_logs_teacher_id_fkey') THEN ALTER TABLE ONLY public.communication_logs
    ADD CONSTRAINT communication_logs_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: course_frequency course_frequency_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'course_frequency_branch_id_fkey') THEN ALTER TABLE ONLY public.course_frequency
    ADD CONSTRAINT course_frequency_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: course_frequency course_frequency_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'course_frequency_course_id_fkey') THEN ALTER TABLE ONLY public.course_frequency
    ADD CONSTRAINT course_frequency_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: courses courses_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'courses_class_id_fkey') THEN ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: courses courses_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'courses_teacher_id_fkey') THEN ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: credential_logs credential_logs_generated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'credential_logs_generated_by_fkey') THEN ALTER TABLE ONLY public.credential_logs
    ADD CONSTRAINT credential_logs_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES public.users(id); END IF; END $$;


--
-- Name: credential_logs credential_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'credential_logs_user_id_fkey') THEN ALTER TABLE ONLY public.credential_logs
    ADD CONSTRAINT credential_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: driver_notifications driver_notifications_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'driver_notifications_driver_id_fkey') THEN ALTER TABLE ONLY public.driver_notifications
    ADD CONSTRAINT driver_notifications_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.users(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: email_config_audit email_config_audit_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'email_config_audit_changed_by_fkey') THEN ALTER TABLE ONLY public.email_config_audit
    ADD CONSTRAINT email_config_audit_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: email_config email_config_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'email_config_updated_by_fkey') THEN ALTER TABLE ONLY public.email_config
    ADD CONSTRAINT email_config_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: emergency_contacts emergency_contacts_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'emergency_contacts_student_id_fkey') THEN ALTER TABLE ONLY public.emergency_contacts
    ADD CONSTRAINT emergency_contacts_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: employee_attendance employee_attendance_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_attendance_recorded_by_fkey') THEN ALTER TABLE ONLY public.employee_attendance
    ADD CONSTRAINT employee_attendance_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.users(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: employee_attendance employee_attendance_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_attendance_user_id_fkey') THEN ALTER TABLE ONLY public.employee_attendance
    ADD CONSTRAINT employee_attendance_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: employee_payroll_profiles employee_payroll_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_payroll_profiles_user_id_fkey') THEN ALTER TABLE ONLY public.employee_payroll_profiles
    ADD CONSTRAINT employee_payroll_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: events events_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_branch_id_fkey') THEN ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id); END IF; END $$;


--
-- Name: exam_access exam_access_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exam_access_exam_id_fkey') THEN ALTER TABLE ONLY public.exam_access
    ADD CONSTRAINT exam_access_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: exam_access exam_access_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exam_access_user_id_fkey') THEN ALTER TABLE ONLY public.exam_access
    ADD CONSTRAINT exam_access_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: exam_lockdown exam_lockdown_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exam_lockdown_branch_id_fkey') THEN ALTER TABLE ONLY public.exam_lockdown
    ADD CONSTRAINT exam_lockdown_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id); END IF; END $$;


--
-- Name: exam_question_options exam_question_options_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exam_question_options_question_id_fkey') THEN ALTER TABLE ONLY public.exam_question_options
    ADD CONSTRAINT exam_question_options_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.exam_questions(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: exam_questions exam_questions_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exam_questions_exam_id_fkey') THEN ALTER TABLE ONLY public.exam_questions
    ADD CONSTRAINT exam_questions_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: exam_submissions exam_submissions_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exam_submissions_exam_id_fkey') THEN ALTER TABLE ONLY public.exam_submissions
    ADD CONSTRAINT exam_submissions_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: exam_submissions exam_submissions_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exam_submissions_student_id_fkey') THEN ALTER TABLE ONLY public.exam_submissions
    ADD CONSTRAINT exam_submissions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: exam_violations exam_violations_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exam_violations_submission_id_fkey') THEN ALTER TABLE ONLY public.exam_violations
    ADD CONSTRAINT exam_violations_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.exam_submissions(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: exams exams_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exams_course_id_fkey') THEN ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: exams exams_hidden_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exams_hidden_by_fkey') THEN ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_hidden_by_fkey FOREIGN KEY (hidden_by) REFERENCES public.users(id); END IF; END $$;


--
-- Name: exams exams_locked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exams_locked_by_fkey') THEN ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_locked_by_fkey FOREIGN KEY (locked_by) REFERENCES public.users(id); END IF; END $$;


--
-- Name: exams exams_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exams_teacher_id_fkey') THEN ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: finance_settings_audit finance_settings_audit_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_settings_audit_changed_by_fkey') THEN ALTER TABLE ONLY public.finance_settings_audit
    ADD CONSTRAINT finance_settings_audit_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: finance_settings finance_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_settings_updated_by_fkey') THEN ALTER TABLE ONLY public.finance_settings
    ADD CONSTRAINT finance_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: finance_transactions finance_transactions_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_transactions_branch_id_fkey') THEN ALTER TABLE ONLY public.finance_transactions
    ADD CONSTRAINT finance_transactions_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: finance_transactions finance_transactions_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'finance_transactions_student_id_fkey') THEN ALTER TABLE ONLY public.finance_transactions
    ADD CONSTRAINT finance_transactions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: financial_policies financial_policies_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'financial_policies_branch_id_fkey') THEN ALTER TABLE ONLY public.financial_policies
    ADD CONSTRAINT financial_policies_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id); END IF; END $$;


--
-- Name: grade_locks grade_locks_academic_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grade_locks_academic_year_id_fkey') THEN ALTER TABLE ONLY public.grade_locks
    ADD CONSTRAINT grade_locks_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id); END IF; END $$;


--
-- Name: grade_locks grade_locks_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grade_locks_branch_id_fkey') THEN ALTER TABLE ONLY public.grade_locks
    ADD CONSTRAINT grade_locks_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: grade_locks grade_locks_locked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grade_locks_locked_by_fkey') THEN ALTER TABLE ONLY public.grade_locks
    ADD CONSTRAINT grade_locks_locked_by_fkey FOREIGN KEY (locked_by) REFERENCES public.users(id); END IF; END $$;


--
-- Name: grade_submissions grade_submissions_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grade_submissions_course_id_fkey') THEN ALTER TABLE ONLY public.grade_submissions
    ADD CONSTRAINT grade_submissions_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: grade_submissions grade_submissions_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grade_submissions_submitted_by_fkey') THEN ALTER TABLE ONLY public.grade_submissions
    ADD CONSTRAINT grade_submissions_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.users(id); END IF; END $$;


--
-- Name: grade_submissions grade_submissions_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grade_submissions_teacher_id_fkey') THEN ALTER TABLE ONLY public.grade_submissions
    ADD CONSTRAINT grade_submissions_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: grades grades_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grades_course_id_fkey') THEN ALTER TABLE ONLY public.grades
    ADD CONSTRAINT grades_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: grades grades_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grades_student_id_fkey') THEN ALTER TABLE ONLY public.grades
    ADD CONSTRAINT grades_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: grades grades_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grades_submitted_by_fkey') THEN ALTER TABLE ONLY public.grades
    ADD CONSTRAINT grades_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.users(id); END IF; END $$;


--
-- Name: inventory inventory_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_branch_id_fkey') THEN ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id); END IF; END $$;


--
-- Name: library_books library_books_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'library_books_branch_id_fkey') THEN ALTER TABLE ONLY public.library_books
    ADD CONSTRAINT library_books_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id); END IF; END $$;


--
-- Name: library_loans library_loans_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'library_loans_book_id_fkey') THEN ALTER TABLE ONLY public.library_loans
    ADD CONSTRAINT library_loans_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.library_books(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: library_loans library_loans_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'library_loans_student_id_fkey') THEN ALTER TABLE ONLY public.library_loans
    ADD CONSTRAINT library_loans_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: loan_repayments loan_repayments_loan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'loan_repayments_loan_id_fkey') THEN ALTER TABLE ONLY public.loan_repayments
    ADD CONSTRAINT loan_repayments_loan_id_fkey FOREIGN KEY (loan_id) REFERENCES public.loans(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: loan_repayments loan_repayments_payroll_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'loan_repayments_payroll_id_fkey') THEN ALTER TABLE ONLY public.loan_repayments
    ADD CONSTRAINT loan_repayments_payroll_id_fkey FOREIGN KEY (payroll_id) REFERENCES public.payroll_runs(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: loans loans_audited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'loans_audited_by_fkey') THEN ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_audited_by_fkey FOREIGN KEY (audited_by) REFERENCES public.users(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: loans loans_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'loans_employee_id_fkey') THEN ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.users(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: loans loans_issued_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'loans_issued_by_fkey') THEN ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_issued_by_fkey FOREIGN KEY (issued_by) REFERENCES public.users(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: logistics_notices logistics_notices_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'logistics_notices_driver_id_fkey') THEN ALTER TABLE ONLY public.logistics_notices
    ADD CONSTRAINT logistics_notices_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.users(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: medicine_inventory medicine_inventory_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'medicine_inventory_branch_id_fkey') THEN ALTER TABLE ONLY public.medicine_inventory
    ADD CONSTRAINT medicine_inventory_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: monthly_profit_targets monthly_profit_targets_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'monthly_profit_targets_branch_id_fkey') THEN ALTER TABLE ONLY public.monthly_profit_targets
    ADD CONSTRAINT monthly_profit_targets_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: monthly_profit_targets monthly_profit_targets_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'monthly_profit_targets_updated_by_fkey') THEN ALTER TABLE ONLY public.monthly_profit_targets
    ADD CONSTRAINT monthly_profit_targets_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: notices notices_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notices_branch_id_fkey') THEN ALTER TABLE ONLY public.notices
    ADD CONSTRAINT notices_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id); END IF; END $$;


--
-- Name: notices notices_posted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notices_posted_by_fkey') THEN ALTER TABLE ONLY public.notices
    ADD CONSTRAINT notices_posted_by_fkey FOREIGN KEY (posted_by) REFERENCES public.users(id); END IF; END $$;


--
-- Name: parent_student parent_student_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'parent_student_parent_id_fkey') THEN ALTER TABLE ONLY public.parent_student
    ADD CONSTRAINT parent_student_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.parents(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: parent_student parent_student_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'parent_student_student_id_fkey') THEN ALTER TABLE ONLY public.parent_student
    ADD CONSTRAINT parent_student_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: parents parents_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'parents_branch_id_fkey') THEN ALTER TABLE ONLY public.parents
    ADD CONSTRAINT parents_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: parents parents_linked_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'parents_linked_student_id_fkey') THEN ALTER TABLE ONLY public.parents
    ADD CONSTRAINT parents_linked_student_id_fkey FOREIGN KEY (linked_student_id) REFERENCES public.students(id); END IF; END $$;


--
-- Name: parents parents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'parents_user_id_fkey') THEN ALTER TABLE ONLY public.parents
    ADD CONSTRAINT parents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: payment_items payment_items_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_items_payment_id_fkey') THEN ALTER TABLE ONLY public.payment_items
    ADD CONSTRAINT payment_items_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: payment_status_logs payment_status_logs_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_status_logs_student_id_fkey') THEN ALTER TABLE ONLY public.payment_status_logs
    ADD CONSTRAINT payment_status_logs_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: payments payments_payer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_payer_id_fkey') THEN ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_payer_id_fkey FOREIGN KEY (payer_id) REFERENCES public.users(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: payments payments_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_student_id_fkey') THEN ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: payroll_items payroll_items_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_items_employee_id_fkey') THEN ALTER TABLE ONLY public.payroll_items
    ADD CONSTRAINT payroll_items_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.users(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: payroll_items payroll_items_payroll_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_items_payroll_run_id_fkey') THEN ALTER TABLE ONLY public.payroll_items
    ADD CONSTRAINT payroll_items_payroll_run_id_fkey FOREIGN KEY (payroll_run_id) REFERENCES public.payroll_runs(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: payroll_runs payroll_runs_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_runs_branch_id_fkey') THEN ALTER TABLE ONLY public.payroll_runs
    ADD CONSTRAINT payroll_runs_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: payroll_runs payroll_runs_finalized_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_runs_finalized_by_fkey') THEN ALTER TABLE ONLY public.payroll_runs
    ADD CONSTRAINT payroll_runs_finalized_by_fkey FOREIGN KEY (finalized_by) REFERENCES public.users(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: payroll_runs payroll_runs_generated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_runs_generated_by_fkey') THEN ALTER TABLE ONLY public.payroll_runs
    ADD CONSTRAINT payroll_runs_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES public.users(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: pending_applications pending_applications_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pending_applications_branch_id_fkey') THEN ALTER TABLE ONLY public.pending_applications
    ADD CONSTRAINT pending_applications_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: pending_applications pending_applications_finance_removed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pending_applications_finance_removed_by_fkey') THEN ALTER TABLE ONLY public.pending_applications
    ADD CONSTRAINT pending_applications_finance_removed_by_fkey FOREIGN KEY (finance_removed_by) REFERENCES public.users(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: pending_applications pending_applications_finance_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pending_applications_finance_user_id_fkey') THEN ALTER TABLE ONLY public.pending_applications
    ADD CONSTRAINT pending_applications_finance_user_id_fkey FOREIGN KEY (finance_user_id) REFERENCES public.users(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: pending_applications pending_applications_parent_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pending_applications_parent_user_id_fkey') THEN ALTER TABLE ONLY public.pending_applications
    ADD CONSTRAINT pending_applications_parent_user_id_fkey FOREIGN KEY (parent_user_id) REFERENCES public.users(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: pending_applications pending_applications_payment_confirmed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pending_applications_payment_confirmed_by_fkey') THEN ALTER TABLE ONLY public.pending_applications
    ADD CONSTRAINT pending_applications_payment_confirmed_by_fkey FOREIGN KEY (payment_confirmed_by) REFERENCES public.users(id); END IF; END $$;


--
-- Name: pending_applications pending_applications_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pending_applications_reviewed_by_fkey') THEN ALTER TABLE ONLY public.pending_applications
    ADD CONSTRAINT pending_applications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id); END IF; END $$;


--
-- Name: pending_applications pending_applications_section_assigned_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pending_applications_section_assigned_fkey') THEN ALTER TABLE ONLY public.pending_applications
    ADD CONSTRAINT pending_applications_section_assigned_fkey FOREIGN KEY (section_assigned) REFERENCES public.academic_sections(id); END IF; END $$;


--
-- Name: pending_applications pending_applications_student_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pending_applications_student_user_id_fkey') THEN ALTER TABLE ONLY public.pending_applications
    ADD CONSTRAINT pending_applications_student_user_id_fkey FOREIGN KEY (student_user_id) REFERENCES public.users(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: registration_config registration_config_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'registration_config_branch_id_fkey') THEN ALTER TABLE ONLY public.registration_config
    ADD CONSTRAINT registration_config_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: registration_exam_config registration_exam_config_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'registration_exam_config_application_id_fkey') THEN ALTER TABLE ONLY public.registration_exam_config
    ADD CONSTRAINT registration_exam_config_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.pending_applications(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: routes routes_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'routes_branch_id_fkey') THEN ALTER TABLE ONLY public.routes
    ADD CONSTRAINT routes_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: routes routes_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'routes_driver_id_fkey') THEN ALTER TABLE ONLY public.routes
    ADD CONSTRAINT routes_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.users(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: routes routes_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'routes_vehicle_id_fkey') THEN ALTER TABLE ONLY public.routes
    ADD CONSTRAINT routes_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: schedule_config schedule_config_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'schedule_config_branch_id_fkey') THEN ALTER TABLE ONLY public.schedule_config
    ADD CONSTRAINT schedule_config_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: schedule_structure schedule_structure_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'schedule_structure_branch_id_fkey') THEN ALTER TABLE ONLY public.schedule_structure
    ADD CONSTRAINT schedule_structure_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: schedule_structure schedule_structure_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'schedule_structure_class_id_fkey') THEN ALTER TABLE ONLY public.schedule_structure
    ADD CONSTRAINT schedule_structure_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: schedule_structure schedule_structure_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'schedule_structure_teacher_id_fkey') THEN ALTER TABLE ONLY public.schedule_structure
    ADD CONSTRAINT schedule_structure_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: schedules schedules_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'schedules_teacher_id_fkey') THEN ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT schedules_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: section_assignment_audit section_assignment_audit_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'section_assignment_audit_assigned_by_fkey') THEN ALTER TABLE ONLY public.section_assignment_audit
    ADD CONSTRAINT section_assignment_audit_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: section_assignment_audit section_assignment_audit_from_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'section_assignment_audit_from_section_id_fkey') THEN ALTER TABLE ONLY public.section_assignment_audit
    ADD CONSTRAINT section_assignment_audit_from_section_id_fkey FOREIGN KEY (from_section_id) REFERENCES public.classes(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: section_assignment_audit section_assignment_audit_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'section_assignment_audit_student_id_fkey') THEN ALTER TABLE ONLY public.section_assignment_audit
    ADD CONSTRAINT section_assignment_audit_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: section_assignment_audit section_assignment_audit_to_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'section_assignment_audit_to_section_id_fkey') THEN ALTER TABLE ONLY public.section_assignment_audit
    ADD CONSTRAINT section_assignment_audit_to_section_id_fkey FOREIGN KEY (to_section_id) REFERENCES public.classes(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: silo_clinic_chat silo_clinic_chat_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_clinic_chat_sender_id_fkey') THEN ALTER TABLE ONLY public.silo_clinic_chat
    ADD CONSTRAINT silo_clinic_chat_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.silo_users(id); END IF; END $$;


--
-- Name: silo_clinic_chat silo_clinic_chat_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_clinic_chat_student_id_fkey') THEN ALTER TABLE ONLY public.silo_clinic_chat
    ADD CONSTRAINT silo_clinic_chat_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.silo_identities(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: silo_communication_book silo_communication_book_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_communication_book_student_id_fkey') THEN ALTER TABLE ONLY public.silo_communication_book
    ADD CONSTRAINT silo_communication_book_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.silo_identities(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: silo_courses silo_courses_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_courses_teacher_id_fkey') THEN ALTER TABLE ONLY public.silo_courses
    ADD CONSTRAINT silo_courses_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.silo_identities(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: silo_deadlines silo_deadlines_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_deadlines_course_id_fkey') THEN ALTER TABLE ONLY public.silo_deadlines
    ADD CONSTRAINT silo_deadlines_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.silo_courses(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: silo_deadlines silo_deadlines_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_deadlines_section_id_fkey') THEN ALTER TABLE ONLY public.silo_deadlines
    ADD CONSTRAINT silo_deadlines_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.silo_sections(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: silo_drivers silo_drivers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_drivers_user_id_fkey') THEN ALTER TABLE ONLY public.silo_drivers
    ADD CONSTRAINT silo_drivers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.silo_users(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: silo_enrollments silo_enrollments_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_enrollments_course_id_fkey') THEN ALTER TABLE ONLY public.silo_enrollments
    ADD CONSTRAINT silo_enrollments_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.silo_courses(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: silo_enrollments silo_enrollments_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_enrollments_section_id_fkey') THEN ALTER TABLE ONLY public.silo_enrollments
    ADD CONSTRAINT silo_enrollments_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.silo_sections(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: silo_enrollments silo_enrollments_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_enrollments_student_id_fkey') THEN ALTER TABLE ONLY public.silo_enrollments
    ADD CONSTRAINT silo_enrollments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.silo_identities(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: silo_family_links silo_family_links_parent_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_family_links_parent_user_id_fkey') THEN ALTER TABLE ONLY public.silo_family_links
    ADD CONSTRAINT silo_family_links_parent_user_id_fkey FOREIGN KEY (parent_user_id) REFERENCES public.silo_users(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: silo_family_links silo_family_links_student_identity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_family_links_student_identity_id_fkey') THEN ALTER TABLE ONLY public.silo_family_links
    ADD CONSTRAINT silo_family_links_student_identity_id_fkey FOREIGN KEY (student_identity_id) REFERENCES public.silo_identities(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: silo_loans silo_loans_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_loans_book_id_fkey') THEN ALTER TABLE ONLY public.silo_loans
    ADD CONSTRAINT silo_loans_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.silo_books(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: silo_logistics_notices silo_logistics_notices_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_logistics_notices_sender_id_fkey') THEN ALTER TABLE ONLY public.silo_logistics_notices
    ADD CONSTRAINT silo_logistics_notices_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.silo_identities(id); END IF; END $$;


--
-- Name: silo_parents silo_parents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_parents_user_id_fkey') THEN ALTER TABLE ONLY public.silo_parents
    ADD CONSTRAINT silo_parents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.silo_users(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: silo_route_manifest silo_route_manifest_route_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_route_manifest_route_id_fkey') THEN ALTER TABLE ONLY public.silo_route_manifest
    ADD CONSTRAINT silo_route_manifest_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.silo_routes(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: silo_route_manifest silo_route_manifest_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_route_manifest_student_id_fkey') THEN ALTER TABLE ONLY public.silo_route_manifest
    ADD CONSTRAINT silo_route_manifest_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.silo_identities(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: silo_routes silo_routes_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_routes_driver_id_fkey') THEN ALTER TABLE ONLY public.silo_routes
    ADD CONSTRAINT silo_routes_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.silo_identities(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: silo_schedule silo_schedule_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_schedule_course_id_fkey') THEN ALTER TABLE ONLY public.silo_schedule
    ADD CONSTRAINT silo_schedule_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.silo_courses(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: silo_schedule silo_schedule_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_schedule_section_id_fkey') THEN ALTER TABLE ONLY public.silo_schedule
    ADD CONSTRAINT silo_schedule_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.silo_sections(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: silo_student_grades silo_student_grades_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_student_grades_student_id_fkey') THEN ALTER TABLE ONLY public.silo_student_grades
    ADD CONSTRAINT silo_student_grades_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.silo_identities(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: silo_student_parents silo_student_parents_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_student_parents_parent_id_fkey') THEN ALTER TABLE ONLY public.silo_student_parents
    ADD CONSTRAINT silo_student_parents_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.silo_parents(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: silo_student_parents silo_student_parents_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_student_parents_student_id_fkey') THEN ALTER TABLE ONLY public.silo_student_parents
    ADD CONSTRAINT silo_student_parents_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.silo_students(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: silo_student_stats silo_student_stats_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_student_stats_student_id_fkey') THEN ALTER TABLE ONLY public.silo_student_stats
    ADD CONSTRAINT silo_student_stats_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.silo_identities(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: silo_students silo_students_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_students_user_id_fkey') THEN ALTER TABLE ONLY public.silo_students
    ADD CONSTRAINT silo_students_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.silo_users(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: silo_teacher_rewards silo_teacher_rewards_teacher_identity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_teacher_rewards_teacher_identity_id_fkey') THEN ALTER TABLE ONLY public.silo_teacher_rewards
    ADD CONSTRAINT silo_teacher_rewards_teacher_identity_id_fkey FOREIGN KEY (teacher_identity_id) REFERENCES public.silo_identities(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: silo_users silo_users_identity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'silo_users_identity_id_fkey') THEN ALTER TABLE ONLY public.silo_users
    ADD CONSTRAINT silo_users_identity_id_fkey FOREIGN KEY (identity_id) REFERENCES public.silo_identities(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: staff_notifications staff_notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'staff_notifications_user_id_fkey') THEN ALTER TABLE ONLY public.staff_notifications
    ADD CONSTRAINT staff_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: student_aid_usages student_aid_usages_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_aid_usages_payment_id_fkey') THEN ALTER TABLE ONLY public.student_aid_usages
    ADD CONSTRAINT student_aid_usages_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: student_aid_usages student_aid_usages_student_aid_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_aid_usages_student_aid_id_fkey') THEN ALTER TABLE ONLY public.student_aid_usages
    ADD CONSTRAINT student_aid_usages_student_aid_id_fkey FOREIGN KEY (student_aid_id) REFERENCES public.student_aids(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: student_aid_usages student_aid_usages_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_aid_usages_student_id_fkey') THEN ALTER TABLE ONLY public.student_aid_usages
    ADD CONSTRAINT student_aid_usages_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: student_aids student_aids_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_aids_approved_by_fkey') THEN ALTER TABLE ONLY public.student_aids
    ADD CONSTRAINT student_aids_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id); END IF; END $$;


--
-- Name: student_aids student_aids_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_aids_branch_id_fkey') THEN ALTER TABLE ONLY public.student_aids
    ADD CONSTRAINT student_aids_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id); END IF; END $$;


--
-- Name: student_aids student_aids_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_aids_student_id_fkey') THEN ALTER TABLE ONLY public.student_aids
    ADD CONSTRAINT student_aids_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: student_attendance student_attendance_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_attendance_recorded_by_fkey') THEN ALTER TABLE ONLY public.student_attendance
    ADD CONSTRAINT student_attendance_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.users(id); END IF; END $$;


--
-- Name: student_attendance student_attendance_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_attendance_student_id_fkey') THEN ALTER TABLE ONLY public.student_attendance
    ADD CONSTRAINT student_attendance_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: student_collections student_collections_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_collections_student_id_fkey') THEN ALTER TABLE ONLY public.student_collections
    ADD CONSTRAINT student_collections_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: student_routes student_routes_route_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_routes_route_id_fkey') THEN ALTER TABLE ONLY public.student_routes
    ADD CONSTRAINT student_routes_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.routes(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: student_routes student_routes_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_routes_student_id_fkey') THEN ALTER TABLE ONLY public.student_routes
    ADD CONSTRAINT student_routes_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: students students_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'students_branch_id_fkey') THEN ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: students students_previous_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'students_previous_section_id_fkey') THEN ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_previous_section_id_fkey FOREIGN KEY (previous_section_id) REFERENCES public.classes(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: students students_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'students_section_id_fkey') THEN ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.classes(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: students students_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'students_user_id_fkey') THEN ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: subjects subjects_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subjects_branch_id_fkey') THEN ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: system_settings system_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'system_settings_updated_by_fkey') THEN ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: teacher_department_heads teacher_department_heads_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teacher_department_heads_assigned_by_fkey') THEN ALTER TABLE ONLY public.teacher_department_heads
    ADD CONSTRAINT teacher_department_heads_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id); END IF; END $$;


--
-- Name: teacher_department_heads teacher_department_heads_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teacher_department_heads_teacher_id_fkey') THEN ALTER TABLE ONLY public.teacher_department_heads
    ADD CONSTRAINT teacher_department_heads_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: teacher_exam_assignments teacher_exam_assignments_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teacher_exam_assignments_assigned_by_fkey') THEN ALTER TABLE ONLY public.teacher_exam_assignments
    ADD CONSTRAINT teacher_exam_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id); END IF; END $$;


--
-- Name: teacher_exam_assignments teacher_exam_assignments_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teacher_exam_assignments_exam_id_fkey') THEN ALTER TABLE ONLY public.teacher_exam_assignments
    ADD CONSTRAINT teacher_exam_assignments_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: teacher_exam_assignments teacher_exam_assignments_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teacher_exam_assignments_teacher_id_fkey') THEN ALTER TABLE ONLY public.teacher_exam_assignments
    ADD CONSTRAINT teacher_exam_assignments_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: teacher_of_week_votes teacher_of_week_votes_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teacher_of_week_votes_branch_id_fkey') THEN ALTER TABLE ONLY public.teacher_of_week_votes
    ADD CONSTRAINT teacher_of_week_votes_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: teacher_of_week_votes teacher_of_week_votes_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teacher_of_week_votes_student_id_fkey') THEN ALTER TABLE ONLY public.teacher_of_week_votes
    ADD CONSTRAINT teacher_of_week_votes_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: teacher_of_week_votes teacher_of_week_votes_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teacher_of_week_votes_teacher_id_fkey') THEN ALTER TABLE ONLY public.teacher_of_week_votes
    ADD CONSTRAINT teacher_of_week_votes_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: teacher_unavailability teacher_unavailability_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teacher_unavailability_branch_id_fkey') THEN ALTER TABLE ONLY public.teacher_unavailability
    ADD CONSTRAINT teacher_unavailability_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: teacher_unavailability teacher_unavailability_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teacher_unavailability_teacher_id_fkey') THEN ALTER TABLE ONLY public.teacher_unavailability
    ADD CONSTRAINT teacher_unavailability_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: teachers teachers_assigned_room_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teachers_assigned_room_section_id_fkey') THEN ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_assigned_room_section_id_fkey FOREIGN KEY (assigned_room_section_id) REFERENCES public.academic_sections(id); END IF; END $$;


--
-- Name: teachers teachers_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teachers_branch_id_fkey') THEN ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: teachers teachers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teachers_user_id_fkey') THEN ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: timetable_runs timetable_runs_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'timetable_runs_branch_id_fkey') THEN ALTER TABLE ONLY public.timetable_runs
    ADD CONSTRAINT timetable_runs_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: timetable_runs timetable_runs_generated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'timetable_runs_generated_by_fkey') THEN ALTER TABLE ONLY public.timetable_runs
    ADD CONSTRAINT timetable_runs_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES public.users(id); END IF; END $$;


--
-- Name: users users_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_branch_id_fkey') THEN ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: vehicles vehicles_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vehicles_branch_id_fkey') THEN ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE; END IF; END $$;


--
-- Name: weekly_plans weekly_plans_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'weekly_plans_course_id_fkey') THEN ALTER TABLE ONLY public.weekly_plans
    ADD CONSTRAINT weekly_plans_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: weekly_plans weekly_plans_dept_head_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'weekly_plans_dept_head_id_fkey') THEN ALTER TABLE ONLY public.weekly_plans
    ADD CONSTRAINT weekly_plans_dept_head_id_fkey FOREIGN KEY (dept_head_id) REFERENCES public.teachers(id) ON DELETE SET NULL; END IF; END $$;


--
-- Name: weekly_plans weekly_plans_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'weekly_plans_reviewed_by_fkey') THEN ALTER TABLE ONLY public.weekly_plans
    ADD CONSTRAINT weekly_plans_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.teachers(id); END IF; END $$;


--
-- Name: weekly_plans weekly_plans_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'weekly_plans_teacher_id_fkey') THEN ALTER TABLE ONLY public.weekly_plans
    ADD CONSTRAINT weekly_plans_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE; END IF; END $$;


--
-- PostgreSQL database dump complete
--

