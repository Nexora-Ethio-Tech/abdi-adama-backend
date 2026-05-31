-- Migration: Add student aid allocation and usage tables
-- Tracks approved aid allocations and per-payment usage records
CREATE TABLE IF NOT EXISTS student_aids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id),
  approved_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  used_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_aid_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_aid_id UUID NOT NULL REFERENCES student_aids(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  month VARCHAR(7) NOT NULL, -- YYYY-MM
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optional index to quickly sum available aid per student
CREATE INDEX IF NOT EXISTS idx_student_aids_student_id ON student_aids(student_id);
CREATE INDEX IF NOT EXISTS idx_student_aid_usages_student_month ON student_aid_usages(student_id, month);
