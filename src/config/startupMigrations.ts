export const STARTUP_MIGRATION_FILES = [
  '1stcomplete_schemafulldb_dumped.sql',
  '3rd_online_exams_and_ratings.sql',
  '4thfix_schedule_varchar_limits.sql',
  '5th_fix_varchar10_limits.sql',
  '6th_fix_user_deletion_constraints.sql',
  '7th_rename_last_grade_to_last_grade_completed.sql',
  '8th_fix_student_deletion_constraints.sql',
  '9th_add_profile_image.sql',
  '10th_add_actual_paid_to_payroll_items.sql',
  '11th_add_period_number_to_schedules.sql',
  '12th_online_exams_schema.sql',
  '13th_online_exams_anti_cheat.sql',
  '14th_online_exams_unique_constraint.sql',
  '15th_fix_unique_constraints.sql',
  '16th_online_exams_auto_grading.sql',
  '17th_submit_workflow.sql',
  '18th_grade_submissions_unique.sql',
  '19th_add_rating_excellent_to_communication_logs.sql',
  '20th_add_audience_to_notices.sql',
  '21st_add_category_to_notices.sql',
  '22nd_add_overall_rating_score_to_teachers.sql',
  '23rd_library_loans_enhancement.sql',
  '24th_fix_weekly_plans_deletion.sql',
  '25th_create_zk_device_id_seq.sql',
  '26th_create_fee_deductions_table.sql',
  '27th_teacher_ratings_constraints.sql',
  '28th_add_online_exams_password.sql',
  '29th_add_bus_start_date_to_students.sql',
  '30th_remove_courses_code_unique_constraint.sql',
  '31st_employee_attendance_zkteco_columns.sql',
  '32nd_create_school_calendar_table.sql',
  '33rd_add_event_id_to_school_calendar.sql',
  '34th_add_end_date_to_events.sql',
  '35th_create_public_posts_table.sql',
  '36th_update_students_status_default.sql',
  '37th_add_document_columns_to_users.sql',
  '38th_performance_indexes.sql',
  '39th_create_teacher_proxy_assignments.sql',
  '40th_add_graduation_year_to_students.sql',
  '41st_add_description_to_finance_transactions.sql',
  '42nd_create_sms_logs_table.sql',
  '43rd_assessment_scoped_grade_locks.sql',
  '44th_create_annual_plans_table.sql',
  '45th_enforce_grade_academic_periods.sql',
  '46th_enforce_single_active_academic_year.sql',
] as const;

export const getMigrationSequence = (fileName: string): number | null => {
  const match = /^(\d+)(?:st|nd|rd|th)/.exec(fileName);
  return match ? Number(match[1]) : null;
};

export function validateStartupMigrationManifest(
  files: readonly string[] = STARTUP_MIGRATION_FILES
): void {
  const seenSequences = new Map<number, string>();
  let previousSequence = 0;

  for (const fileName of files) {
    const sequence = getMigrationSequence(fileName);
    if (sequence === null) {
      throw new Error(`Migration file is missing a numeric sequence: ${fileName}`);
    }

    const duplicate = seenSequences.get(sequence);
    if (duplicate) {
      throw new Error(`Duplicate migration sequence ${sequence}: ${duplicate}, ${fileName}`);
    }

    if (sequence <= previousSequence) {
      throw new Error(`Migration manifest is out of order at ${fileName}`);
    }

    seenSequences.set(sequence, fileName);
    previousSequence = sequence;
  }
}
