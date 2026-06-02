-- Migration: Fix payment_type column size to accommodate multiple payment types
-- Issue: When recording payments for multiple types (e.g., "Monthly Tuition, Bus Fee, Penalty Fee, Registration Fee"),
-- the string exceeds the VARCHAR(50) limit, causing "value too long for type character varying(50)" error

ALTER TABLE finance_transactions
ALTER COLUMN type TYPE VARCHAR(150);
