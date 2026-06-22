-- Create sms_logs table for logging sent messages and queueing pending messages
CREATE TABLE IF NOT EXISTS sms_logs (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id   UUID        REFERENCES students(id) ON DELETE CASCADE,
    parent_phone VARCHAR(30) NOT NULL,
    message      TEXT        NOT NULL,
    status       VARCHAR(20) NOT NULL DEFAULT 'pending',
    sent_at      TIMESTAMPTZ,
    branch_id    UUID        REFERENCES branches(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on status for faster polling by the sync client
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON sms_logs(status);
