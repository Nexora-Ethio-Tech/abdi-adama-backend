-- ============================================================================
-- 38th Migration: Performance Indexes
-- Adds missing indexes on hot query paths for financial, attendance, and
-- user lookup operations. All use IF NOT EXISTS to be safely idempotent.
-- ============================================================================

-- === PAYMENTS (queried in every fee calculation, loops through fee types) ===
CREATE INDEX IF NOT EXISTS idx_payments_student_month
  ON payments(student_id, month);

CREATE INDEX IF NOT EXISTS idx_payments_student_month_date
  ON payments(student_id, month, date);

-- === PAYMENT ITEMS (joined in every outstanding balance calculation) ===
CREATE INDEX IF NOT EXISTS idx_payment_items_payment_id
  ON payment_items(payment_id);

CREATE INDEX IF NOT EXISTS idx_payment_items_payment_fee_type
  ON payment_items(payment_id, fee_type);

-- === STUDENT COLLECTIONS (queried per student per month sync) ===
CREATE INDEX IF NOT EXISTS idx_student_collections_student_month
  ON student_collections(student_id, month);

CREATE INDEX IF NOT EXISTS idx_student_collections_status
  ON student_collections(status);

-- === STUDENT AID USAGES (queried in aid calculation loops) ===
CREATE INDEX IF NOT EXISTS idx_student_aid_usages_student_month
  ON student_aid_usages(student_id, month);

-- === STUDENT AIDS (queried for available aid per student) ===
CREATE INDEX IF NOT EXISTS idx_student_aids_student_status
  ON student_aids(student_id, status);

-- === FEE DEDUCTIONS (queried in every monthly outstanding calc) ===
CREATE INDEX IF NOT EXISTS idx_fee_deductions_student_month_status
  ON fee_deductions(student_id, month, status);

-- === FINANCE TRANSACTIONS (audit queries by student and branch) ===
CREATE INDEX IF NOT EXISTS idx_finance_transactions_student
  ON finance_transactions(student_id);

CREATE INDEX IF NOT EXISTS idx_finance_transactions_branch_date
  ON finance_transactions(branch_id, date);

-- === USERS (composite for branch-scoped role queries — 4k students + 300 staff) ===
CREATE INDEX IF NOT EXISTS idx_users_branch_role
  ON users(branch_id, role);

CREATE INDEX IF NOT EXISTS idx_users_branch_status
  ON users(branch_id, status);

-- === STUDENTS (composite for grade-level and branch queries) ===
CREATE INDEX IF NOT EXISTS idx_students_branch_grade
  ON students(branch_id, grade);

CREATE INDEX IF NOT EXISTS idx_students_section_id
  ON students(section_id);

CREATE INDEX IF NOT EXISTS idx_students_user_id_branch
  ON students(user_id, branch_id);

-- === EMPLOYEE ATTENDANCE (date-based lookups for staff overview) ===
CREATE INDEX IF NOT EXISTS idx_employee_attendance_user_date
  ON employee_attendance(user_id, date);

-- === CLASSES (branch-scoped listing) ===
CREATE INDEX IF NOT EXISTS idx_classes_branch
  ON classes(branch_id);

-- === CLASS TEACHERS (join acceleration) ===
CREATE INDEX IF NOT EXISTS idx_class_teachers_class_id
  ON class_teachers(class_id);

CREATE INDEX IF NOT EXISTS idx_class_teachers_teacher_id
  ON class_teachers(teacher_id);

-- === TEACHERS (user_id and branch lookups) ===
CREATE INDEX IF NOT EXISTS idx_teachers_user_id
  ON teachers(user_id);

CREATE INDEX IF NOT EXISTS idx_teachers_branch
  ON teachers(branch_id);

-- === BRANCH GRADE FEES (fee lookup by branch) ===
CREATE INDEX IF NOT EXISTS idx_branch_grade_fees_branch_grade
  ON branch_grade_fees(branch_id, grade_level);

-- === FINANCE SETTINGS (key lookup — small table but queried very frequently) ===
CREATE INDEX IF NOT EXISTS idx_finance_settings_key
  ON finance_settings(key);
