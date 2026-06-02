-- Migration to remove UNIQUE constraint on users.email (Postgres)
-- Run this against the production DB if you want to allow non-unique emails.

-- Drop the UNIQUE constraint if it exists (common default name)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;

-- Drop any unique index on email (if present under a different name)
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS users_email_idx;

-- Recreate a non-unique index for search/performance (optional)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
