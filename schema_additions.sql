-- ============================================================
-- ADDITIONAL SCHEMA CHANGES FOR NEW FEATURES
-- Date: May 9, 2026
-- ============================================================

-- 1. GRADE/SECTION CAPACITY LIMITS (Super Admin)
ALTER TABLE classes ADD COLUMN IF NOT EXISTS capacity INT DEFAULT 0;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS section VARCHAR(10);

-- 2. BRANCH IDENTITY (School Admin)
ALTER TABLE branches ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS address TEXT;

-- 3. ACADEMIC YEAR CONFIGURATION (Super Admin & School Admin)
CREATE TABLE IF NOT EXISTS academic_years (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year_name       VARCHAR(50) NOT NULL,  -- e.g., "2025/2026"
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT FALSE,
    branch_id       UUID REFERENCES branches(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. GRADE LOCKING (Vice Principal)
CREATE TABLE IF NOT EXISTS grade_locks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grade_level     VARCHAR(20) NOT NULL,
    is_locked       BOOLEAN NOT NULL DEFAULT FALSE,
    locked_by       UUID REFERENCES users(id),
    locked_at       TIMESTAMPTZ,
    branch_id       UUID REFERENCES branches(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES academic_years(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(grade_level, branch_id, academic_year_id)
);

-- 5. REVENUE TARGETS (Auditor & Finance Clerk)
CREATE TABLE IF NOT EXISTS revenue_targets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id       UUID REFERENCES branches(id) ON DELETE CASCADE,
    target_amount   NUMERIC(14,2) NOT NULL,
    actual_amount   NUMERIC(14,2) NOT NULL DEFAULT 0,
    month           VARCHAR(10) NOT NULL,  -- e.g., "January"
    year            INT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(branch_id, month, year)
);

-- 6. COURSE MATERIALS (Teacher)
CREATE TABLE IF NOT EXISTS course_materials (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    teacher_id      UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    file_url        TEXT NOT NULL,
    file_type       VARCHAR(50),  -- pdf, doc, ppt, etc.
    file_size       BIGINT,  -- in bytes
    uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. PROFIT GOALS (Finance Clerk)
CREATE TABLE IF NOT EXISTS profit_goals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id       UUID REFERENCES branches(id) ON DELETE CASCADE,
    goal_amount     NUMERIC(14,2) NOT NULL,
    actual_profit   NUMERIC(14,2) NOT NULL DEFAULT 0,
    month           VARCHAR(10) NOT NULL,
    year            INT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(branch_id, month, year)
);

-- 8. PEER REVIEW FOR LESSON PLANS (Teacher - Dept Head)
ALTER TABLE weekly_plans ADD COLUMN IF NOT EXISTS peer_reviewed_by UUID REFERENCES teachers(id);
ALTER TABLE weekly_plans ADD COLUMN IF NOT EXISTS peer_feedback TEXT;
ALTER TABLE weekly_plans ADD COLUMN IF NOT EXISTS peer_rating SMALLINT CHECK (peer_rating BETWEEN 1 AND 5);
ALTER TABLE weekly_plans ADD COLUMN IF NOT EXISTS peer_reviewed_at TIMESTAMPTZ;

-- 9. FEE REDUCTION APPROVAL BY AUDITOR
-- Auditor can only update fee_approval_status (Approved/Rejected)
-- This is already in students table: fee_approval_status ENUM ('none', 'pending', 'approved', 'rejected')
ALTER TABLE students ADD COLUMN IF NOT EXISTS fee_reduction_reviewed_by UUID REFERENCES users(id);
ALTER TABLE students ADD COLUMN IF NOT EXISTS fee_reduction_reviewed_at TIMESTAMPTZ;

-- 10. BRANCH DATA MIGRATION LOG (Super Admin)
CREATE TABLE IF NOT EXISTS data_migrations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_branch_id  UUID NOT NULL REFERENCES branches(id),
    to_branch_id    UUID NOT NULL REFERENCES branches(id),
    entity_type     VARCHAR(50) NOT NULL,  -- 'student', 'teacher', 'class'
    entity_id       UUID NOT NULL,
    migrated_by     UUID NOT NULL REFERENCES users(id),
    migrated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes           TEXT
);

-- 11. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_academic_years_active ON academic_years(is_active);
CREATE INDEX IF NOT EXISTS idx_grade_locks_branch ON grade_locks(branch_id);
CREATE INDEX IF NOT EXISTS idx_revenue_targets_branch ON revenue_targets(branch_id);
CREATE INDEX IF NOT EXISTS idx_course_materials_course ON course_materials(course_id);
CREATE INDEX IF NOT EXISTS idx_course_materials_teacher ON course_materials(teacher_id);

-- 12. TRIGGERS FOR AUTO-UPDATE
CREATE TRIGGER IF NOT EXISTS trg_academic_years_updated 
    BEFORE UPDATE ON academic_years 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS trg_revenue_targets_updated 
    BEFORE UPDATE ON revenue_targets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS trg_profit_goals_updated 
    BEFORE UPDATE ON profit_goals 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- END OF ADDITIONAL SCHEMA
-- ============================================================
