CREATE TABLE IF NOT EXISTS public.fee_deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  month VARCHAR(20) NOT NULL,
  requested_amount NUMERIC(10,2) NOT NULL,
  approved_amount NUMERIC(10,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  approved_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, month)
);
