-- Database migration schema for Payroll, Loan Management & Finance Configuration Module
-- Path: c:/Users/Vertx/Desktop/coding/Nexora technology plc/jobs/abdi-adama-fullstack/abdi-adama-backend/database/payroll_schema.sql

-- 1. Global Finance Settings Table
CREATE TABLE IF NOT EXISTS finance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) UNIQUE NOT NULL,
  value NUMERIC NOT NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Seed global settings if they do not exist
INSERT INTO finance_settings (key, value) VALUES
  ('daily_penalty_rate', 150.0),
  ('max_loan_months', 3.0),
  ('loan_deduction_percentage', 30.0)
ON CONFLICT (key) DO NOTHING;

-- 2. Finance Settings Audit Table
CREATE TABLE IF NOT EXISTS finance_settings_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(255) NOT NULL,
  old_value NUMERIC,
  new_value NUMERIC,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  changed_by_name VARCHAR(255),
  changed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Employee Payroll Profiles Table
CREATE TABLE IF NOT EXISTS employee_payroll_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  basic_salary NUMERIC NOT NULL DEFAULT 0,
  transport_allowance NUMERIC NOT NULL DEFAULT 0,
  housing_allowance NUMERIC NOT NULL DEFAULT 0,
  position_allowance NUMERIC NOT NULL DEFAULT 0,
  overtime_rate_per_hour NUMERIC NOT NULL DEFAULT 0,
  bank_account VARCHAR(100),
  tin_number VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Employee Attendance Table
CREATE TABLE IF NOT EXISTS employee_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused', 'leave')),
  recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, date)
);

-- 5. Loans Table
CREATE TABLE IF NOT EXISTS loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  remaining_balance NUMERIC NOT NULL CHECK (remaining_balance >= 0),
  monthly_deduction NUMERIC NOT NULL CHECK (monthly_deduction > 0),
  max_months INT NOT NULL CHECK (max_months > 0),
  months_paid INT DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'active', 'completed', 'rejected', 'cancelled')),
  issued_by UUID REFERENCES users(id) ON DELETE SET NULL,
  audited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  audited_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  issued_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT
);

-- 6. Payroll Runs Table
CREATE TABLE IF NOT EXISTS payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month VARCHAR(20) NOT NULL,
  year INT NOT NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized', 'exported')),
  generated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  finalized_by UUID REFERENCES users(id) ON DELETE SET NULL,
  total_gross NUMERIC NOT NULL DEFAULT 0,
  total_deductions NUMERIC NOT NULL DEFAULT 0,
  total_net NUMERIC NOT NULL DEFAULT 0,
  total_tax NUMERIC NOT NULL DEFAULT 0,
  total_pension_employee NUMERIC NOT NULL DEFAULT 0,
  total_pension_employer NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  finalized_at TIMESTAMPTZ
);

-- 7. Loan Repayments Table
CREATE TABLE IF NOT EXISTS loan_repayments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  payroll_id UUID REFERENCES payroll_runs(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  remaining_after NUMERIC NOT NULL,
  repaid_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. Payroll Items Table
CREATE TABLE IF NOT EXISTS payroll_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  employee_name VARCHAR(255) NOT NULL,
  basic_salary NUMERIC NOT NULL DEFAULT 0,
  transport_allowance NUMERIC NOT NULL DEFAULT 0,
  housing_allowance NUMERIC NOT NULL DEFAULT 0,
  position_allowance NUMERIC NOT NULL DEFAULT 0,
  overtime_hours NUMERIC NOT NULL DEFAULT 0,
  overtime_amount NUMERIC NOT NULL DEFAULT 0,
  gross_salary NUMERIC NOT NULL DEFAULT 0,
  absent_days INT NOT NULL DEFAULT 0,
  penalty_amount NUMERIC NOT NULL DEFAULT 0,
  loan_deduction NUMERIC NOT NULL DEFAULT 0,
  taxable_income NUMERIC NOT NULL DEFAULT 0,
  income_tax NUMERIC NOT NULL DEFAULT 0,
  pension_employee NUMERIC NOT NULL DEFAULT 0,
  pension_employer NUMERIC NOT NULL DEFAULT 0,
  total_deductions NUMERIC NOT NULL DEFAULT 0,
  net_pay NUMERIC NOT NULL DEFAULT 0
);

-- 9. Staff Notifications Table
CREATE TABLE IF NOT EXISTS staff_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'system' CHECK (type IN ('loan', 'payroll', 'system')),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes for optimization
CREATE INDEX IF NOT EXISTS idx_employee_payroll_profiles_user_id ON employee_payroll_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_attendance_user_date ON employee_attendance(user_id, date);
CREATE INDEX IF NOT EXISTS idx_loans_employee_id ON loans(employee_id);
CREATE INDEX IF NOT EXISTS idx_loan_repayments_loan_id ON loan_repayments(loan_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_month_year ON payroll_runs(month, year);
CREATE INDEX IF NOT EXISTS idx_payroll_items_run_id ON payroll_items(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_items_employee_id ON payroll_items(employee_id);
CREATE INDEX IF NOT EXISTS idx_staff_notifications_user_id ON staff_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_notifications_is_read ON staff_notifications(is_read);
