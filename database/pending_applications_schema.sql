-- Create table for pending student applications/registrations
CREATE TABLE IF NOT EXISTS pending_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  -- Applicant Information
  applicant_name VARCHAR(255) NOT NULL,
  applicant_email VARCHAR(255),
  applicant_phone VARCHAR(30),
  digital_id VARCHAR(50),
  dob DATE,
  gender VARCHAR(20),
  -- Parent/Guardian Information
  parent_name VARCHAR(255),
  parent_phone VARCHAR(30),
  address TEXT,
  -- Academic Information
  grade_applying VARCHAR(10),
  previous_school VARCHAR(255),
  last_grade_completed VARCHAR(10),
  -- Medical Information (optional)
  blood_group VARCHAR(10),
  allergies TEXT,
  chronic_conditions TEXT,
  current_medications TEXT,
  -- Registration & Financial Status
  registration_fee_status VARCHAR(20) DEFAULT 'Pending',
  -- 'Paid' or 'Pending'
  -- Document Storage
  transcript_file_path VARCHAR(512),
  transcript_file_name VARCHAR(255),
  transcript_file_size BIGINT,
  transcript_uploaded_at TIMESTAMPTZ,
  -- Application Pipeline Status
  status VARCHAR(30) DEFAULT 'pending',
  -- Statuses: pending, exam-pending, exam-passed, exam-failed, awaiting-payment, payment-confirmed, declined
  -- Exam Details (if applicable)
  exam_date DATE,
  exam_time TIME,
  exam_location VARCHAR(255),
  exam_subjects TEXT,
  exam_notes TEXT,
  -- Additional Notes
  notes TEXT,
  -- System Fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_branch_id ON pending_applications(branch_id);
CREATE INDEX IF NOT EXISTS idx_status ON pending_applications(status);
CREATE INDEX IF NOT EXISTS idx_applicant_email ON pending_applications(applicant_email);
CREATE INDEX IF NOT EXISTS idx_created_at ON pending_applications(created_at);
CREATE INDEX IF NOT EXISTS idx_application_pipeline ON pending_applications(status, created_at DESC);
-- Create table for transcript file storage metadata
CREATE TABLE IF NOT EXISTS application_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES pending_applications(id) ON DELETE CASCADE,
  -- File Information
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(512) NOT NULL,
  file_size BIGINT NOT NULL,
  file_mime_type VARCHAR(100),
  -- Upload Information
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by UUID REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_application_id ON application_transcripts(application_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_at ON application_transcripts(uploaded_at);
-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pending_applications_timestamp() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Create trigger for automatic timestamp update
CREATE TRIGGER pending_applications_updated_at BEFORE
UPDATE ON pending_applications FOR EACH ROW EXECUTE FUNCTION update_pending_applications_timestamp();