-- =============================================================================
-- schema_isolated.sql
-- Clean, Isolated PostgreSQL Database Schema Script (Narrowed Focus)
-- Scope: Student, Parent, Driver, Clinic Admin, and Librarian roles.
-- =============================================================================

BEGIN;

-- Install standard extension for robust UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── CLEANUP EXISTING TABLES ──────────────────────────────────────────────────
-- Drop tables in reverse dependency order to prevent cascade issues.

DROP TABLE IF EXISTS clinic_messages CASCADE;
DROP TABLE IF EXISTS clinic_logs CASCADE;
DROP TABLE IF EXISTS library_loans CASCADE;
DROP TABLE IF EXISTS library_books CASCADE;
DROP TABLE IF EXISTS student_bus_assignments CASCADE;
DROP TABLE IF EXISTS bus_routes CASCADE;
DROP TABLE IF EXISTS student_parents CASCADE;

DROP TABLE IF EXISTS librarians CASCADE;
DROP TABLE IF EXISTS clinic_admins CASCADE;
DROP TABLE IF EXISTS drivers CASCADE;
DROP TABLE IF EXISTS parents CASCADE;
DROP TABLE IF EXISTS students CASCADE;

DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- ── STEP 1: CORE 'ROLES' LOOKUP TABLE & SEEDING ──────────────────────────────

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Seed exactly the 5 focused roles
INSERT INTO roles (name, description) VALUES
    ('Student', 'School attendee enrolled in courses'),
    ('Parent', 'Guardian or relative associated with students'),
    ('Driver', 'Bus coordinator for school logistics and routing'),
    ('Clinic Admin', 'Medical practitioner managing student clinic records'),
    ('Librarian', 'Library catalog administrator managing checkout records');

-- ── STEP 2: MAIN 'USERS' TABLE ───────────────────────────────────────────────

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_id ON users(role_id);

-- ── STEP 3: SPECIFIC PROFILE / SUB-TABLES ────────────────────────────────────

-- A. Student Profile Table
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_code VARCHAR(50) UNIQUE NOT NULL,  -- e.g., "STU-00123"
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    grade VARCHAR(50) NOT NULL,
    enrollment_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_students_user_id ON students(user_id);
CREATE INDEX idx_students_student_code ON students(student_code);

-- B. Parent Profile Table
CREATE TABLE parents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_parents_user_id ON parents(user_id);

-- C. Driver Profile Table
CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(200) NOT NULL,
    license_number VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    vehicle_plate VARCHAR(30) NOT NULL,
    status VARCHAR(20) DEFAULT 'available',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_drivers_user_id ON drivers(user_id);
CREATE INDEX idx_drivers_license_number ON drivers(license_number);

-- D. Clinic Admin Profile Table
CREATE TABLE clinic_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(200) NOT NULL,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    license_number VARCHAR(100),
    phone_number VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_clinic_admins_user_id ON clinic_admins(user_id);
CREATE INDEX idx_clinic_admins_employee_id ON clinic_admins(employee_id);

-- E. Librarian Profile Table
CREATE TABLE librarians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(200) NOT NULL,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    phone_number VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_librarians_user_id ON librarians(user_id);
CREATE INDEX idx_librarians_employee_id ON librarians(employee_id);

-- ── 3.1: PARENT-STUDENT LINKAGE ──────────────────────────────────────────────

CREATE TABLE student_parents (
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL, -- e.g., 'Father', 'Mother', 'Guardian'
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (student_id, parent_id)
);

CREATE INDEX idx_student_parents_parent ON student_parents(parent_id);

-- ── 3.2: LOGISTICS AND BUS ALLOCATIONS ────────────────────────────────────────

CREATE TABLE bus_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    bus_number VARCHAR(50) NOT NULL,
    route_name VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bus_routes_driver ON bus_routes(driver_id);

CREATE TABLE student_bus_assignments (
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    route_id UUID NOT NULL REFERENCES bus_routes(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (student_id, route_id)
);

CREATE INDEX idx_bus_assignments_route ON student_bus_assignments(route_id);

-- ── 3.3: LIBRARY CATALOGUE & BOOK LOANS ───────────────────────────────────────

CREATE TABLE library_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    isbn VARCHAR(50) UNIQUE NOT NULL,
    stock INTEGER NOT NULL DEFAULT 1 CHECK (stock >= 0),
    shelf_location VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_library_books_isbn ON library_books(isbn);

CREATE TABLE library_loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID NOT NULL REFERENCES library_books(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    librarian_id UUID REFERENCES librarians(id) ON DELETE SET NULL,
    loan_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    return_date DATE,
    status VARCHAR(30) DEFAULT 'Borrowed', -- 'Borrowed', 'Returned', 'Overdue'
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_library_loans_book ON library_loans(book_id);
CREATE INDEX idx_library_loans_student ON library_loans(student_id);

-- ── 3.4: CLINIC LOGS AND ALERTS ──────────────────────────────────────────────

CREATE TABLE clinic_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    clinic_admin_id UUID NOT NULL REFERENCES clinic_admins(id) ON DELETE CASCADE,
    visit_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    symptoms TEXT NOT NULL,
    diagnosis TEXT NOT NULL,
    treatment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_clinic_logs_student ON clinic_logs(student_id);
CREATE INDEX idx_clinic_logs_admin ON clinic_logs(clinic_admin_id);

CREATE TABLE clinic_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    clinic_admin_id UUID NOT NULL REFERENCES clinic_admins(id) ON DELETE CASCADE,
    parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    sender_type VARCHAR(50) NOT NULL CHECK (sender_type IN ('Clinic Admin', 'Parent')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_clinic_messages_student ON clinic_messages(student_id);
CREATE INDEX idx_clinic_messages_parent ON clinic_messages(parent_id);

COMMIT;
