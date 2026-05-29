-- System settings, branch fee structure, and monthly profit targets
-- Safe to run multiple times (idempotent).

CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO system_settings (key, value) VALUES
  ('school_name_oromic', 'Mana Barumsaa Abdii Adaamaa'),
  ('school_name_amharic', 'አብዲ አዳማ ትምህርት ቤት'),
  ('school_name_english', 'Abdi Adama School'),
  ('school_motto_oromic', 'ijooleen kessaan ijolee kenyaa'),
  ('school_motto_amharic', 'ልጆች በልጆች'),
  ('school_motto_english', 'Children by Children'),
  ('system_email', 'admin@abdiadama.edu'),
  ('phone', '+251 911 22 33 44'),
  ('address', 'Bole Sub-city, Woreda 03, House No 1234, Addis Ababa, Ethiopia'),
  ('grades_locked', 'false'),
  ('registration_open', 'true')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS branch_grade_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  grade_level VARCHAR(20) NOT NULL,
  monthly_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
  registration_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
  bus_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (branch_id, grade_level)
);

CREATE INDEX IF NOT EXISTS idx_branch_grade_fees_branch ON branch_grade_fees(branch_id);

CREATE TABLE IF NOT EXISTS monthly_profit_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ethiopian_month INT NOT NULL CHECK (ethiopian_month BETWEEN 1 AND 13),
  target_year INT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INT,
  target_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (ethiopian_month, target_year)
);

-- Extra finance settings used by Settings UI
INSERT INTO finance_settings (key, value) VALUES
  ('student_registration_fee', 2500),
  ('student_late_penalty_rate', 150),
  ('student_payment_deadline', 10),
  ('staff_salary_deadline', 28)
ON CONFLICT (key) DO NOTHING;
