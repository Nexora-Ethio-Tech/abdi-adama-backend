-- Per-branch monthly profit targets
ALTER TABLE monthly_profit_targets
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE CASCADE;

ALTER TABLE monthly_profit_targets DROP CONSTRAINT IF EXISTS monthly_profit_targets_ethiopian_month_target_year_key;

DELETE FROM monthly_profit_targets WHERE branch_id IS NULL;

DO $$
BEGIN
  ALTER TABLE monthly_profit_targets
  ADD CONSTRAINT monthly_profit_targets_branch_period_unique UNIQUE (branch_id, ethiopian_month, target_year);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_monthly_profit_targets_branch ON monthly_profit_targets(branch_id);
