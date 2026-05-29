-- ============================================================
-- Finance Transactions Table
-- Auditor financial reporting table for transaction tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS finance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name VARCHAR(150) NOT NULL,
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
