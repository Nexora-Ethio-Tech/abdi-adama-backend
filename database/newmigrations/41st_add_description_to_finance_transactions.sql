-- Add description/details column to finance_transactions
ALTER TABLE finance_transactions ADD COLUMN IF NOT EXISTS description TEXT;
