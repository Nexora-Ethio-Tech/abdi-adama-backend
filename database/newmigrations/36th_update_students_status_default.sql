-- Clean up null status values and reinforce Active status default
UPDATE students SET status = 'Active' WHERE status IS NULL OR status = '';
ALTER TABLE students ALTER COLUMN status SET DEFAULT 'Active';
