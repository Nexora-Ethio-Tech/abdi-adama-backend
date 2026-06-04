-- Make non-nullable audit fields nullable so they can be set to NULL on user deletion
ALTER TABLE bulk_communications ALTER COLUMN sent_by DROP NOT NULL;
ALTER TABLE grade_submissions ALTER COLUMN submitted_by DROP NOT NULL;

-- 1. access_audit_trail
ALTER TABLE access_audit_trail DROP CONSTRAINT IF EXISTS access_audit_trail_user_id_fkey;
ALTER TABLE access_audit_trail ADD CONSTRAINT access_audit_trail_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 2. bulk_communications
ALTER TABLE bulk_communications DROP CONSTRAINT IF EXISTS bulk_communications_sent_by_fkey;
ALTER TABLE bulk_communications ADD CONSTRAINT bulk_communications_sent_by_fkey 
  FOREIGN KEY (sent_by) REFERENCES users(id) ON DELETE SET NULL;

-- 3. clinic_visits
ALTER TABLE clinic_visits DROP CONSTRAINT IF EXISTS clinic_visits_logged_by_fkey;
ALTER TABLE clinic_visits ADD CONSTRAINT clinic_visits_logged_by_fkey 
  FOREIGN KEY (logged_by) REFERENCES users(id) ON DELETE SET NULL;

-- 4. credential_logs
ALTER TABLE credential_logs DROP CONSTRAINT IF EXISTS credential_logs_generated_by_fkey;
ALTER TABLE credential_logs ADD CONSTRAINT credential_logs_generated_by_fkey 
  FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL;

-- 5. exams (hidden_by & locked_by)
ALTER TABLE exams DROP CONSTRAINT IF EXISTS exams_hidden_by_fkey;
ALTER TABLE exams ADD CONSTRAINT exams_hidden_by_fkey 
  FOREIGN KEY (hidden_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE exams DROP CONSTRAINT IF EXISTS exams_locked_by_fkey;
ALTER TABLE exams ADD CONSTRAINT exams_locked_by_fkey 
  FOREIGN KEY (locked_by) REFERENCES users(id) ON DELETE SET NULL;

-- 6. grade_locks
ALTER TABLE grade_locks DROP CONSTRAINT IF EXISTS grade_locks_locked_by_fkey;
ALTER TABLE grade_locks ADD CONSTRAINT grade_locks_locked_by_fkey 
  FOREIGN KEY (locked_by) REFERENCES users(id) ON DELETE SET NULL;

-- 7. grade_submissions
ALTER TABLE grade_submissions DROP CONSTRAINT IF EXISTS grade_submissions_submitted_by_fkey;
ALTER TABLE grade_submissions ADD CONSTRAINT grade_submissions_submitted_by_fkey 
  FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL;

-- 8. grades
ALTER TABLE grades DROP CONSTRAINT IF EXISTS grades_submitted_by_fkey;
ALTER TABLE grades ADD CONSTRAINT grades_submitted_by_fkey 
  FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL;

-- 9. notices
ALTER TABLE notices DROP CONSTRAINT IF EXISTS notices_posted_by_fkey;
ALTER TABLE notices ADD CONSTRAINT notices_posted_by_fkey 
  FOREIGN KEY (posted_by) REFERENCES users(id) ON DELETE SET NULL;

-- 10. pending_applications
ALTER TABLE pending_applications DROP CONSTRAINT IF EXISTS pending_applications_payment_confirmed_by_fkey;
ALTER TABLE pending_applications ADD CONSTRAINT pending_applications_payment_confirmed_by_fkey 
  FOREIGN KEY (payment_confirmed_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE pending_applications DROP CONSTRAINT IF EXISTS pending_applications_reviewed_by_fkey;
ALTER TABLE pending_applications ADD CONSTRAINT pending_applications_reviewed_by_fkey 
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;

-- 11. student_aids
ALTER TABLE student_aids DROP CONSTRAINT IF EXISTS student_aids_approved_by_fkey;
ALTER TABLE student_aids ADD CONSTRAINT student_aids_approved_by_fkey 
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;

-- 12. student_attendance
ALTER TABLE student_attendance DROP CONSTRAINT IF EXISTS student_attendance_recorded_by_fkey;
ALTER TABLE student_attendance ADD CONSTRAINT student_attendance_recorded_by_fkey 
  FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL;

-- 13. teacher_department_heads
ALTER TABLE teacher_department_heads DROP CONSTRAINT IF EXISTS teacher_department_heads_assigned_by_fkey;
ALTER TABLE teacher_department_heads ADD CONSTRAINT teacher_department_heads_assigned_by_fkey 
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL;

-- 14. teacher_exam_assignments
ALTER TABLE teacher_exam_assignments DROP CONSTRAINT IF EXISTS teacher_exam_assignments_assigned_by_fkey;
ALTER TABLE teacher_exam_assignments ADD CONSTRAINT teacher_exam_assignments_assigned_by_fkey 
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL;

-- 15. timetable_runs
ALTER TABLE timetable_runs DROP CONSTRAINT IF EXISTS timetable_runs_generated_by_fkey;
ALTER TABLE timetable_runs ADD CONSTRAINT timetable_runs_generated_by_fkey 
  FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL;
