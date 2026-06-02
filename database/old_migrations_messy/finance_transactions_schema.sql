-- ============================================================
-- Finance Transactions Table
-- Auditor financial reporting table for transaction tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS finance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  student_name VARCHAR(150),
  amount NUMERIC(12, 2) NOT NULL,
  type VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  verified_by VARCHAR(150) NOT NULL,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_transactions_branch ON finance_transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_student ON finance_transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_date ON finance_transactions(date);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_type ON finance_transactions(type);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_branch_date ON finance_transactions(branch_id, date);

-- ============================================================
-- Idempotent column alterations — safe to run on every boot
-- ============================================================

-- Allow non-student transactions (e.g. expenses) by making student_id nullable
ALTER TABLE finance_transactions ALTER COLUMN student_id DROP NOT NULL;

-- Allow non-student transactions by making student_name nullable
ALTER TABLE finance_transactions ALTER COLUMN student_name DROP NOT NULL;

-- ============================================================
-- Ethiopic calendar columns — store month name & EC year
-- ============================================================

ALTER TABLE finance_transactions ADD COLUMN IF NOT EXISTS ethiopic_month VARCHAR(20);
ALTER TABLE finance_transactions ADD COLUMN IF NOT EXISTS ethiopic_year  INT;

CREATE INDEX IF NOT EXISTS idx_finance_transactions_eth ON finance_transactions(ethiopic_month, ethiopic_year);

-- Backfill existing rows that have a Gregorian date but no Ethiopic values yet
UPDATE finance_transactions
SET
  ethiopic_year = CASE
    WHEN EXTRACT(MONTH FROM date) > 9
      OR (EXTRACT(MONTH FROM date) = 9 AND EXTRACT(DAY FROM date) >= 11)
    THEN EXTRACT(YEAR FROM date)::int - 7
    ELSE EXTRACT(YEAR FROM date)::int - 8
  END,
  ethiopic_month = CASE
    WHEN (EXTRACT(MONTH FROM date) = 9  AND EXTRACT(DAY FROM date) >= 11)
      OR (EXTRACT(MONTH FROM date) = 10 AND EXTRACT(DAY FROM date) <= 10) THEN 'Meskerem'
    WHEN (EXTRACT(MONTH FROM date) = 10 AND EXTRACT(DAY FROM date) >= 11)
      OR (EXTRACT(MONTH FROM date) = 11 AND EXTRACT(DAY FROM date) <=  9) THEN 'Tikimt'
    WHEN (EXTRACT(MONTH FROM date) = 11 AND EXTRACT(DAY FROM date) >= 10)
      OR (EXTRACT(MONTH FROM date) = 12 AND EXTRACT(DAY FROM date) <=  9) THEN 'Hidar'
    WHEN (EXTRACT(MONTH FROM date) = 12 AND EXTRACT(DAY FROM date) >= 10)
      OR (EXTRACT(MONTH FROM date) =  1 AND EXTRACT(DAY FROM date) <=  8) THEN 'Tahsas'
    WHEN (EXTRACT(MONTH FROM date) =  1 AND EXTRACT(DAY FROM date) >=  9)
      OR (EXTRACT(MONTH FROM date) =  2 AND EXTRACT(DAY FROM date) <=  7) THEN 'Tir'
    WHEN (EXTRACT(MONTH FROM date) =  2 AND EXTRACT(DAY FROM date) >=  8)
      OR (EXTRACT(MONTH FROM date) =  3 AND EXTRACT(DAY FROM date) <=  9) THEN 'Yekatit'
    WHEN (EXTRACT(MONTH FROM date) =  3 AND EXTRACT(DAY FROM date) >= 10)
      OR (EXTRACT(MONTH FROM date) =  4 AND EXTRACT(DAY FROM date) <=  8) THEN 'Megabit'
    WHEN (EXTRACT(MONTH FROM date) =  4 AND EXTRACT(DAY FROM date) >=  9)
      OR (EXTRACT(MONTH FROM date) =  5 AND EXTRACT(DAY FROM date) <=  8) THEN 'Miazia'
    WHEN (EXTRACT(MONTH FROM date) =  5 AND EXTRACT(DAY FROM date) >=  9)
      OR (EXTRACT(MONTH FROM date) =  6 AND EXTRACT(DAY FROM date) <=  7) THEN 'Ginbot'
    WHEN (EXTRACT(MONTH FROM date) =  6 AND EXTRACT(DAY FROM date) >=  8)
      OR (EXTRACT(MONTH FROM date) =  7 AND EXTRACT(DAY FROM date) <=  7) THEN 'Sene'
    WHEN (EXTRACT(MONTH FROM date) =  7 AND EXTRACT(DAY FROM date) >=  8)
      OR (EXTRACT(MONTH FROM date) =  8 AND EXTRACT(DAY FROM date) <=  6) THEN 'Hamle'
    WHEN (EXTRACT(MONTH FROM date) =  8 AND EXTRACT(DAY FROM date) >=  7)
      OR (EXTRACT(MONTH FROM date) =  9 AND EXTRACT(DAY FROM date) <=  5) THEN 'Nehase'
    ELSE 'Pagume'
  END
WHERE ethiopic_month IS NULL AND date IS NOT NULL;
