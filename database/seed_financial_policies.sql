-- ============================================================
-- MIGRATION: Seed Default Financial Policies for Testing
-- Purpose: Add default bus_fee, monthly_tuition, registration_fee for all grades
-- Academic Year: 2026 E.C (Current)
-- ============================================================
-- Get all branches that exist in the system
-- Insert financial policies for each branch with common grade levels
-- Ensure we have at least one policy for each branch (NULL grade as fallback)
INSERT INTO financial_policies (
        id,
        grade_level,
        monthly_tuition,
        registration_fee,
        bus_fee,
        penalty_rate,
        academic_year,
        branch_id,
        created_at
    )
SELECT gen_random_uuid(),
    NULL,
    -- Fallback for any grade not specifically configured
    5000,
    -- Monthly tuition (ETB)
    2000,
    -- Registration fee (ETB)
    1200,
    -- Bus fee (ETB) - default transport fee
    5,
    -- Penalty rate (%)
    '2026',
    b.id,
    NOW()
FROM branches b
WHERE NOT EXISTS (
        SELECT 1
        FROM financial_policies fp
        WHERE fp.branch_id = b.id
            AND fp.academic_year = '2026'
            AND fp.grade_level IS NULL
    ) ON CONFLICT DO NOTHING;
-- Insert grade-specific policies for each branch
INSERT INTO financial_policies (
        id,
        grade_level,
        monthly_tuition,
        registration_fee,
        bus_fee,
        penalty_rate,
        academic_year,
        branch_id,
        created_at
    )
SELECT gen_random_uuid(),
    grade_level,
    monthly_tuition,
    registration_fee,
    bus_fee,
    5,
    -- penalty_rate
    '2026',
    b.id,
    NOW()
FROM branches b
    CROSS JOIN (
        VALUES ('Grade 1', 3500, 1500, 1000),
            ('Grade 2', 3500, 1500, 1000),
            ('Grade 3', 3500, 1500, 1000),
            ('Grade 4', 4000, 1500, 1000),
            ('Grade 5', 4000, 1500, 1000),
            ('Grade 6', 4500, 1500, 1200),
            ('Grade 7', 5000, 2000, 1200),
            ('Grade 8', 5000, 2000, 1200),
            ('Grade 9', 5500, 2000, 1200),
            ('Grade 10', 5500, 2000, 1200),
            ('Grade 11', 6000, 2500, 1200),
            ('Grade 12', 6500, 2500, 1200)
    ) AS grades(
        grade_level,
        monthly_tuition,
        registration_fee,
        bus_fee
    )
WHERE NOT EXISTS (
        SELECT 1
        FROM financial_policies fp
        WHERE fp.branch_id = b.id
            AND fp.academic_year = '2026'
            AND fp.grade_level = grades.grade_level
    ) ON CONFLICT DO NOTHING;
-- Verify the policies were created
SELECT COUNT(*) as total_policies,
    branch_id,
    academic_year
FROM financial_policies
WHERE academic_year = '2026'
GROUP BY branch_id,
    academic_year;
-- Display sample policies
SELECT b.name as branch_name,
    fp.grade_level,
    fp.monthly_tuition,
    fp.registration_fee,
    fp.bus_fee,
    fp.academic_year
FROM financial_policies fp
    JOIN branches b ON b.id = fp.branch_id
WHERE fp.academic_year = '2026'
ORDER BY b.name,
    COALESCE(fp.grade_level, 'zzz')
LIMIT 20;