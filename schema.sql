-- ============================================================
-- Abdi Adama School Management System — PostgreSQL Schema
-- Generated: 2026-04-27
-- Database: abdiadam_school_db
-- ============================================================

-- Enable UUID extension
-- Extension removed
-- Extension removed

-- ============================================================
-- CLEANUP (Allows re-running the script safely)
-- ============================================================
DROP TABLE IF EXISTS 
    branches, school_config, users, students, emergency_contacts, teachers, 
    parents, parent_student, classes, courses, schedules, student_attendance, 
    attendance_history, absence_queue, academic_history, academic_history_courses, 
    grading_configs, grades, exams, exam_questions, exam_question_options, 
    exam_access, exam_submissions, exam_violations, exam_lockdown, 
    finance_transactions, finance_summaries, payment_status_logs, audit_log, 
    enrollment_queue, pending_applications, registration_exam_config, 
    communication_logs, weekly_plans, clinic_visits, clinic_chat_messages, 
    logistics_notices, notices, events, inventory, library_books, library_loans, 
    financial_policies CASCADE;

DROP TYPE IF EXISTS 
    user_role, risk_level, attendance_status, absence_status, exam_category, 
    exam_status, violation_type, finance_direction, audit_category, audit_direction, 
    app_status, plan_status,    visit_status, chat_sender_role, user_status, 
    fee_status, fee_approval_status CASCADE;

-- ============================================================
-- 1. BRANCHES
-- ============================================================
CREATE TABLE branches (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL UNIQUE,
    location    VARCHAR(255) NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. SCHOOL CONFIG (multilingual branding)
-- ============================================================
CREATE TABLE school_config (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key             VARCHAR(50)  NOT NULL UNIQUE,  -- 'school_name', 'school_motto'
    value_oromic    TEXT NOT NULL DEFAULT '',
    value_amharic   TEXT NOT NULL DEFAULT '',
    value_english   TEXT NOT NULL DEFAULT '',
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. USERS (all roles)
-- ============================================================
CREATE TYPE user_status AS ENUM ('Pending', 'Approved', 'Revoked');

CREATE TYPE user_role AS ENUM (
    'super-admin','school-admin','vice-principal',
    'teacher','student','parent',
    'finance-clerk','librarian','clinic-admin','driver','auditor'
);

CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    digital_id  VARCHAR(20)  UNIQUE,
    username    VARCHAR(50)  UNIQUE,
    name        VARCHAR(150) NOT NULL,
    email       VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role        user_role    NOT NULL,
    branch_id   UUID         REFERENCES branches(id) ON DELETE SET NULL,
    status      user_status  NOT NULL DEFAULT 'Pending',
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    is_branch_auditor BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_role      ON users(role);
CREATE INDEX idx_users_branch    ON users(branch_id);
CREATE INDEX idx_users_digital   ON users(digital_id);
CREATE INDEX idx_users_username  ON users(username);

-- ============================================================
-- 4. STUDENTS
-- ============================================================
CREATE TYPE risk_level AS ENUM ('Low','Medium','High');
CREATE TYPE fee_status AS ENUM ('standard', 'reduced');
CREATE TYPE fee_approval_status AS ENUM ('none', 'pending', 'approved', 'rejected');

CREATE TABLE students (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    branch_id           UUID         REFERENCES branches(id) ON DELETE SET NULL,
    grade               VARCHAR(10)  NOT NULL,
    status              VARCHAR(20)  NOT NULL DEFAULT 'Active',
    parent_name         VARCHAR(150),
    parent_phone        VARCHAR(30),
    dob                 DATE,
    gender              VARCHAR(10),
    address             TEXT,
    blood_group         VARCHAR(5),
    allergies           TEXT,
    medications         TEXT,
    chronic_conditions  TEXT,
    vaccination_status  VARCHAR(50),
    home_medications    TEXT,
    bio                 TEXT,
    risk_level          risk_level   NOT NULL DEFAULT 'Low',
    risk_factor         TEXT,
    is_scholarship      BOOLEAN      NOT NULL DEFAULT FALSE,
    is_bus_user         BOOLEAN      NOT NULL DEFAULT FALSE,
    monthly_fee         NUMERIC(12,2) NOT NULL DEFAULT 0,
    bus_fee             NUMERIC(12,2) NOT NULL DEFAULT 0,
    penalty_fee         NUMERIC(12,2) NOT NULL DEFAULT 0,
    fee_status          fee_status   NOT NULL DEFAULT 'standard',
    fee_approval_status fee_approval_status NOT NULL DEFAULT 'none',
    fee_notes           TEXT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_students_grade  ON students(grade);
CREATE INDEX idx_students_status ON students(status);

-- ============================================================
-- 5. EMERGENCY CONTACTS
-- ============================================================
CREATE TABLE emergency_contacts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id  UUID         NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    name        VARCHAR(150) NOT NULL,
    relation    VARCHAR(50)  NOT NULL,
    phone       VARCHAR(30)  NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 6. TEACHERS
-- ============================================================
CREATE TABLE teachers (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    branch_id           UUID         REFERENCES branches(id) ON DELETE SET NULL,
    subjects            TEXT[]       NOT NULL DEFAULT '{}',
    branch              VARCHAR(100),
    classes_count       INT          NOT NULL DEFAULT 0,
    is_in_class         BOOLEAN      NOT NULL DEFAULT FALSE,
    is_dean             BOOLEAN      NOT NULL DEFAULT FALSE,
    is_room_teacher     BOOLEAN      NOT NULL DEFAULT FALSE,
    assigned_room_class VARCHAR(20),
    department          VARCHAR(100),
    hire_date           DATE,
    experience          VARCHAR(50),
    bio                 TEXT,
    is_examiner         BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 7. PARENTS
-- ============================================================
CREATE TABLE parents (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    branch_id   UUID         REFERENCES branches(id) ON DELETE SET NULL,
    family_id   VARCHAR(20),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE parent_student (
    parent_id   UUID NOT NULL REFERENCES parents(id)  ON DELETE CASCADE,
    student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    PRIMARY KEY (parent_id, student_id)
);

-- ============================================================
-- 8. CLASSES
-- ============================================================
CREATE TABLE classes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(50) NOT NULL,
    teacher_id      UUID        REFERENCES teachers(id) ON DELETE SET NULL,
    student_count   INT         NOT NULL DEFAULT 0,
    branch_id       UUID        REFERENCES branches(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 9. COURSES
-- ============================================================
CREATE TABLE courses (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    code        VARCHAR(30)  NOT NULL UNIQUE,
    teacher_id  UUID         REFERENCES teachers(id) ON DELETE SET NULL,
    class_id    UUID         REFERENCES classes(id)  ON DELETE SET NULL,
    progress    INT          NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 10. SCHEDULES
-- ============================================================
CREATE TABLE schedules (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id  UUID        NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    day         VARCHAR(15) NOT NULL,
    time_slot   VARCHAR(50) NOT NULL,
    class_name  VARCHAR(20) NOT NULL,
    subject     VARCHAR(50) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 11. ATTENDANCE — STUDENTS
-- ============================================================
CREATE TYPE attendance_status AS ENUM ('present','absent','late','excused');

CREATE TABLE student_attendance (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id  UUID              NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    date        DATE              NOT NULL,
    status      attendance_status NOT NULL DEFAULT 'present',
    recorded_by UUID              REFERENCES users(id),
    created_at  TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    UNIQUE(student_id, date)
);

-- ============================================================
-- 12. ATTENDANCE HISTORY (monthly aggregate)
-- ============================================================
CREATE TABLE attendance_history (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id  UUID         NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    month       VARCHAR(10)  NOT NULL,
    year        INT          NOT NULL,
    rate        NUMERIC(5,2) NOT NULL,
    UNIQUE(student_id, month, year)
);

-- ============================================================
-- 13. ABSENCE QUEUE (VP escalation)
-- ============================================================
CREATE TYPE absence_status AS ENUM ('pending','excused','notified');

CREATE TABLE absence_queue (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID          NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    student_name    VARCHAR(150)  NOT NULL,
    grade           VARCHAR(10)   NOT NULL,
    parent_name     VARCHAR(150),
    parent_phone    VARCHAR(30),
    reported_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    reported_by     VARCHAR(150)  NOT NULL,
    reason          TEXT          NOT NULL,
    date            DATE          NOT NULL,
    status          absence_status NOT NULL DEFAULT 'pending',
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 14. ACADEMIC HISTORY
-- ============================================================
CREATE TABLE academic_history (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id  UUID         NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    year        VARCHAR(20)  NOT NULL,
    semester    VARCHAR(30),
    grade_level VARCHAR(10)  NOT NULL,
    average     VARCHAR(10),
    rank        VARCHAR(20),
    gpa         VARCHAR(10),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE academic_history_courses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    history_id      UUID         NOT NULL REFERENCES academic_history(id) ON DELETE CASCADE,
    course_name     VARCHAR(100) NOT NULL,
    grade           VARCHAR(5),
    score           NUMERIC(5,2)
);

-- ============================================================
-- 15. GRADING CONFIGURATION
-- ============================================================
CREATE TABLE grading_configs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grade_level VARCHAR(20)  NOT NULL,
    method_id   VARCHAR(30)  NOT NULL,
    label       VARCHAR(50)  NOT NULL,
    max_weight  INT          NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE(grade_level, method_id)
);

-- ============================================================
-- 16. GRADES
-- ============================================================
CREATE TABLE grades (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id  UUID          NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id   UUID          NOT NULL REFERENCES courses(id)  ON DELETE CASCADE,
    type        VARCHAR(30)   NOT NULL,
    weight      VARCHAR(10),
    score       NUMERIC(6,2),
    total       NUMERIC(6,2)  NOT NULL,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 17. EXAMS
-- ============================================================
CREATE TYPE exam_category AS ENUM ('Mid-term','Final','Quiz','Assignment');
CREATE TYPE exam_status   AS ENUM ('available','completed','draft');

CREATE TABLE exams (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title                   VARCHAR(200) NOT NULL,
    course_id               UUID         REFERENCES courses(id) ON DELETE SET NULL,
    course_name             VARCHAR(100),
    teacher_id              UUID         REFERENCES teachers(id) ON DELETE SET NULL,
    teacher_name            VARCHAR(150),
    category                exam_category NOT NULL,
    duration_minutes        INT          NOT NULL DEFAULT 60,
    status                  exam_status  NOT NULL DEFAULT 'draft',
    is_locked               BOOLEAN      NOT NULL DEFAULT FALSE,
    lock_password           VARCHAR(100),
    locked_by               UUID         REFERENCES users(id),
    is_hidden               BOOLEAN      NOT NULL DEFAULT TRUE,
    hidden_by               UUID         REFERENCES users(id),
    principal_set_password  VARCHAR(100),
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 18. EXAM QUESTIONS & OPTIONS
-- ============================================================
CREATE TABLE exam_questions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id         UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    question_text   TEXT NOT NULL,
    correct_option_id VARCHAR(10),
    sort_order      INT  NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE exam_question_options (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID         NOT NULL REFERENCES exam_questions(id) ON DELETE CASCADE,
    option_key  VARCHAR(10)  NOT NULL,
    option_text TEXT         NOT NULL,
    sort_order  INT          NOT NULL DEFAULT 0
);

-- ============================================================
-- 19. EXAM ACCESS CONTROL
-- ============================================================
CREATE TABLE exam_access (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id     UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(exam_id, user_id)
);

-- ============================================================
-- 20. EXAM SUBMISSIONS (Answer Payloads)
-- ============================================================
CREATE TABLE exam_submissions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id         UUID         NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id      UUID         NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    answers         JSONB        NOT NULL DEFAULT '{}',
    warning_count   INT          NOT NULL DEFAULT 0,
    started_at      TIMESTAMPTZ  NOT NULL,
    submitted_at    TIMESTAMPTZ,
    auto_submitted  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE(exam_id, student_id)
);

-- ============================================================
-- 21. EXAM VIOLATION EVENTS
-- ============================================================
CREATE TYPE violation_type AS ENUM ('fullscreen-exit','visibility-change','blur');

CREATE TABLE exam_violations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id   UUID           NOT NULL REFERENCES exam_submissions(id) ON DELETE CASCADE,
    violation_type  violation_type NOT NULL,
    occurred_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 22. EXAM LOCKDOWN STATE
-- ============================================================
CREATE TABLE exam_lockdown (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id           UUID    REFERENCES branches(id),
    is_locked_down      BOOLEAN NOT NULL DEFAULT FALSE,
    lockdown_password   VARCHAR(100),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 23. FINANCE — TRANSACTIONS
-- ============================================================
CREATE TABLE finance_transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID          REFERENCES students(id) ON DELETE SET NULL,
    student_name    VARCHAR(150),
    amount          NUMERIC(14,2) NOT NULL,
    type            VARCHAR(50)   NOT NULL,
    date            DATE          NOT NULL,
    verified_by     VARCHAR(150),
    branch_id       UUID          REFERENCES branches(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 24. FINANCE — SUMMARIES
-- ============================================================
CREATE TYPE finance_direction AS ENUM ('Income','Expense');

CREATE TABLE finance_summaries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category        VARCHAR(100)     NOT NULL,
    description     TEXT,
    amount          NUMERIC(14,2)    NOT NULL,
    item_count      INT              NOT NULL DEFAULT 0,
    direction       finance_direction NOT NULL,
    date            DATE             NOT NULL,
    approved_by     VARCHAR(150),
    approved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 25. FINANCE — PAYMENT STATUS LOGS
-- ============================================================
CREATE TABLE payment_status_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID         NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    status          BOOLEAN      NOT NULL,
    modified_by     VARCHAR(150) NOT NULL,
    approver_name   VARCHAR(150),
    timestamp       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 26. FINANCE — AUDIT LOG
-- ============================================================
CREATE TYPE audit_category  AS ENUM ('Fees','Staff');
CREATE TYPE audit_direction AS ENUM ('In','Out');

CREATE TABLE audit_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID            REFERENCES students(id) ON DELETE SET NULL,
    student_name    VARCHAR(150),
    section         VARCHAR(50),
    category        audit_category  NOT NULL,
    direction       audit_direction NOT NULL,
    action_label    VARCHAR(200)    NOT NULL,
    modified_by     VARCHAR(150)    NOT NULL,
    approver_name   VARCHAR(150),
    old_value       JSONB,
    new_value       JSONB,
    status          BOOLEAN         NOT NULL DEFAULT TRUE,
    timestamp       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_category  ON audit_log(category);
CREATE INDEX idx_audit_direction ON audit_log(direction);
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp);

-- ============================================================
-- 27. FINANCE — ENROLLMENT QUEUE
-- ============================================================
CREATE TABLE enrollment_queue (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(150) NOT NULL,
    grade       VARCHAR(10)  NOT NULL,
    amount      NUMERIC(12,2) NOT NULL,
    email       VARCHAR(255),
    confirmed   BOOLEAN      NOT NULL DEFAULT FALSE,
    failed      BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 28. REGISTRATION — PENDING APPLICATIONS
-- ============================================================
CREATE TYPE app_status AS ENUM (
    'pending','declined','approved',
    'exam-pending','exam-passed','exam-failed',
    'awaiting-payment','payment-confirmed'
);

CREATE TABLE pending_applications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(150) NOT NULL,
    dob             DATE         NOT NULL,
    parent_name     VARCHAR(150) NOT NULL,
    phone           VARCHAR(30)  NOT NULL,
    email           VARCHAR(255),
    previous_school VARCHAR(200),
    last_grade      VARCHAR(10),
    date            DATE         NOT NULL,
    status          app_status   NOT NULL DEFAULT 'pending',
    branch_id       UUID         REFERENCES branches(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 29. REGISTRATION — EXAM CONFIG
-- ============================================================
CREATE TABLE registration_exam_config (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id  UUID         NOT NULL REFERENCES pending_applications(id) ON DELETE CASCADE,
    exam_date       DATE         NOT NULL,
    exam_time       VARCHAR(20)  NOT NULL,
    location        VARCHAR(200) NOT NULL,
    subjects        TEXT         NOT NULL,
    notes           TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 30. COMMUNICATION LOGS (weekly comm book)
-- ============================================================
CREATE TABLE communication_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID         NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    teacher_id      UUID         REFERENCES teachers(id) ON DELETE SET NULL,
    week_ending     DATE         NOT NULL,
    rating_uniform      SMALLINT NOT NULL DEFAULT 0 CHECK (rating_uniform BETWEEN 0 AND 3),
    rating_materials    SMALLINT NOT NULL DEFAULT 0 CHECK (rating_materials BETWEEN 0 AND 3),
    rating_homework     SMALLINT NOT NULL DEFAULT 0 CHECK (rating_homework BETWEEN 0 AND 3),
    rating_participation SMALLINT NOT NULL DEFAULT 0 CHECK (rating_participation BETWEEN 0 AND 3),
    rating_conduct      SMALLINT NOT NULL DEFAULT 0 CHECK (rating_conduct BETWEEN 0 AND 3),
    rating_social       SMALLINT NOT NULL DEFAULT 0 CHECK (rating_social BETWEEN 0 AND 3),
    rating_punctuality  SMALLINT NOT NULL DEFAULT 0 CHECK (rating_punctuality BETWEEN 0 AND 3),
    rating_note_taking  SMALLINT NOT NULL DEFAULT 0 CHECK (rating_note_taking BETWEEN 0 AND 3),
    teacher_note    TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE(student_id, week_ending)
);

-- ============================================================
-- 31. WEEKLY PLANS (lesson planning)
-- ============================================================
CREATE TYPE plan_status AS ENUM ('Draft','Pending','Approved','Revision Required');

CREATE TABLE weekly_plans (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id          UUID        NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    date                DATE        NOT NULL,
    content             TEXT        NOT NULL,
    objectives          TEXT        NOT NULL,
    teacher_activity    TEXT        NOT NULL,
    time_duration       VARCHAR(30) NOT NULL,
    student_activity    TEXT        NOT NULL,
    teaching_method     VARCHAR(200) NOT NULL,
    teaching_aids       VARCHAR(200) NOT NULL,
    evaluation          TEXT        NOT NULL,
    remark              TEXT,
    status              plan_status NOT NULL DEFAULT 'Pending',
    dean_feedback       TEXT,
    dean_rating         SMALLINT CHECK (dean_rating BETWEEN 1 AND 5),
    reviewed_by         UUID        REFERENCES teachers(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 32. CLINIC — VISIT LOGS
-- ============================================================
CREATE TYPE visit_status AS ENUM ('pending-approval','sent','rejected');

CREATE TABLE clinic_visits (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID         NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    student_name    VARCHAR(150) NOT NULL,
    date            DATE         NOT NULL,
    time            VARCHAR(20)  NOT NULL,
    reason          TEXT         NOT NULL,
    treatment       TEXT         NOT NULL,
    status          visit_status NOT NULL DEFAULT 'pending-approval',
    logged_by       UUID         REFERENCES users(id),
    parent_notified BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 33. CLINIC — CHAT MESSAGES
-- ============================================================
CREATE TYPE chat_sender_role AS ENUM ('parent','clinic');

CREATE TABLE clinic_chat_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id       UUID           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_role     chat_sender_role NOT NULL,
    student_name    VARCHAR(150)   NOT NULL,
    student_id      UUID           REFERENCES students(id),
    text            TEXT           NOT NULL,
    read            BOOLEAN        NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 33b. CLINIC — MEDICINE INVENTORY
-- ============================================================
CREATE TABLE medicine_inventory (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(200) NOT NULL,
    stock       INT          NOT NULL DEFAULT 0,
    unit        VARCHAR(50)  NOT NULL DEFAULT 'pcs', -- pcs, ml, mg
    location    VARCHAR(200),
    branch_id   UUID         REFERENCES branches(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 34. LOGISTICS — DRIVER NOTICES
-- ============================================================
CREATE TABLE logistics_notices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(200) NOT NULL,
    content         TEXT         NOT NULL,
    stations        TEXT,
    driver_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    driver_name     VARCHAR(150) NOT NULL,
    category        VARCHAR(30)  NOT NULL DEFAULT 'Logistics',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 34b. TRANSPORT — VEHICLES & ROUTES
-- ============================================================
CREATE TABLE vehicles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plate_number    VARCHAR(20)  NOT NULL UNIQUE,
    model           VARCHAR(100),
    capacity        INT          NOT NULL DEFAULT 0,
    branch_id       UUID         REFERENCES branches(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE routes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(150) NOT NULL,
    driver_id       UUID         REFERENCES users(id) ON DELETE SET NULL,
    vehicle_id      UUID         REFERENCES vehicles(id) ON DELETE SET NULL,
    branch_id       UUID         REFERENCES branches(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE student_routes (
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    route_id        UUID NOT NULL REFERENCES routes(id)   ON DELETE CASCADE,
    PRIMARY KEY (student_id, route_id)
);

-- ============================================================
-- 35. NOTICE BOARD
-- ============================================================
CREATE TABLE notices (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       VARCHAR(200) NOT NULL,
    content     TEXT         NOT NULL,
    priority    VARCHAR(20)  NOT NULL DEFAULT 'Medium',
    posted_by   UUID         REFERENCES users(id),
    branch_id   UUID         REFERENCES branches(id),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 36. EVENTS / CALENDAR
-- ============================================================
CREATE TABLE events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       VARCHAR(200) NOT NULL,
    date        DATE         NOT NULL,
    type        VARCHAR(50)  NOT NULL,
    description TEXT,
    branch_id   UUID         REFERENCES branches(id),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 37. INVENTORY
-- ============================================================
CREATE TABLE inventory (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(200) NOT NULL,
    category    VARCHAR(100) NOT NULL,
    quantity    INT          NOT NULL DEFAULT 0,
    condition   VARCHAR(30)  NOT NULL DEFAULT 'Good',
    location    VARCHAR(200),
    branch_id   UUID         REFERENCES branches(id),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 38. LIBRARY — BOOKS
-- ============================================================
CREATE TABLE library_books (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       VARCHAR(300) NOT NULL,
    author      VARCHAR(200) NOT NULL,
    isbn        VARCHAR(30)  UNIQUE,
    status      VARCHAR(20)  NOT NULL DEFAULT 'Available',
    shelf       VARCHAR(100),
    total       INT          NOT NULL DEFAULT 1,
    available   INT          NOT NULL DEFAULT 1,
    branch_id   UUID         REFERENCES branches(id),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 39. LIBRARY — LOANS
-- ============================================================
CREATE TABLE library_loans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id         UUID NOT NULL REFERENCES library_books(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students(id)      ON DELETE CASCADE,
    borrowed_at     DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date        DATE NOT NULL,
    returned_at     DATE,
    days_overdue    INT  NOT NULL DEFAULT 0,
    fine_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
    daily_rate      NUMERIC(12,2) NOT NULL DEFAULT 5, -- Default 5 birr/day
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 40. FINANCIAL TARGETS & POLICIES (Settings page)
-- ============================================================
CREATE TABLE financial_policies (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grade_level         VARCHAR(20),
    monthly_tuition     NUMERIC(12,2) NOT NULL DEFAULT 0,
    registration_fee    NUMERIC(12,2) NOT NULL DEFAULT 0,
    bus_fee             NUMERIC(12,2) NOT NULL DEFAULT 0,
    penalty_rate        NUMERIC(5,2)  NOT NULL DEFAULT 0,
    academic_year       VARCHAR(20)   NOT NULL,
    branch_id           UUID          REFERENCES branches(id),
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SEED: Default branches
-- ============================================================
INSERT INTO branches (name, location) VALUES
    ('Main Branch', 'Addis Ababa'),
    ('Bole Branch', 'Bole, AA'),
    ('Megenagna Branch', 'Megenagna, AA'),
    ('Adama Branch', 'Adama');

-- ============================================================
-- SEED: Default school config
-- ============================================================
INSERT INTO school_config (key, value_oromic, value_amharic, value_english) VALUES
    ('school_name', 'Mana Barumsaa Abdii Adaamaa', 'አብዲ አዳማ ትምህርት ቤት', 'Abdi Adama School'),
    ('school_motto', 'ijooleen kessaan ijolee kenyaa', 'ልጆቻቹ ልጆቻችን ናቸዉ', 'Your children are our children');

-- ============================================================
-- SEED: Default grading configurations
-- ============================================================
INSERT INTO grading_configs (grade_level, method_id, label, max_weight) VALUES
    ('default', 'mid',        'Mid-Exam',       30),
    ('default', 'final',      'Final-Exam',     50),
    ('default', 'quiz',       'Quiz',           10),
    ('default', 'assignment', 'Assignment',     10),
    ('10',      'mid',        'Mid-Exam',       30),
    ('10',      'final',      'Final-Exam',     40),
    ('10',      'quiz',       'Quiz',           10),
    ('10',      'classwork',  'Class-Work',     10),
    ('10',      'activity',   'Class Activity', 10),
    ('9',       'mid',        'Mid-Exam',       25),
    ('9',       'final',      'Final-Exam',     50),
    ('9',       'homework',   'Home-Work',      15),
    ('9',       'test',       'Test',           10);

-- ============================================================
-- Helper function: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER trg_users_updated      BEFORE UPDATE ON users      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_students_updated   BEFORE UPDATE ON students   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_teachers_updated   BEFORE UPDATE ON teachers   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_exams_updated      BEFORE UPDATE ON exams      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_inventory_updated  BEFORE UPDATE ON inventory  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_weekly_plans_upd   BEFORE UPDATE ON weekly_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_pending_apps_upd   BEFORE UPDATE ON pending_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_medicine_updated   BEFORE UPDATE ON medicine_inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- END OF SCHEMA
-- ============================================================
