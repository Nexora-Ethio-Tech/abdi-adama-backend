-- Migration 10: Add actual_paid column to payroll_items
-- This stores the real salary amount actually disbursed (from finance_transactions)
-- vs the theoretical computed net_pay. If no payment recorded => actual_paid = 0.

ALTER TABLE public.payroll_items
  ADD COLUMN IF NOT EXISTS actual_paid NUMERIC DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'unpaid' NOT NULL;
