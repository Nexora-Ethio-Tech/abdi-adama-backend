-- Require explicit, well-formed periods for all new grade workflow rows.
-- NOT VALID preserves legacy rows for later reconciliation while still enforcing
-- these checks for every insert or update after this migration is installed.

ALTER TABLE IF EXISTS public.grades
  ALTER COLUMN academic_year DROP DEFAULT,
  ALTER COLUMN semester DROP DEFAULT;

ALTER TABLE IF EXISTS public.grade_submissions
  ALTER COLUMN academic_year DROP DEFAULT,
  ALTER COLUMN semester DROP DEFAULT;

DO $migration$
DECLARE
  target_table TEXT;
  academic_year_constraint TEXT;
  semester_constraint TEXT;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'grades',
    'grade_submissions',
    'grade_submission_locks',
    'grade_submission_finalizations'
  ]
  LOOP
    IF to_regclass('public.' || target_table) IS NULL THEN
      CONTINUE;
    END IF;

    academic_year_constraint := target_table || '_academic_year_valid';
    semester_constraint := target_table || '_semester_valid';

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = academic_year_constraint
        AND conrelid = to_regclass('public.' || target_table)
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (
           academic_year IS NOT NULL
           AND academic_year ~ ''^[0-9]{4}/[0-9]{4}$''
           AND substring(academic_year FROM ''^([0-9]{4})/'')::integer + 1
               = substring(academic_year FROM ''/([0-9]{4})$'')::integer
         ) NOT VALID',
        target_table,
        academic_year_constraint
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = semester_constraint
        AND conrelid = to_regclass('public.' || target_table)
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I
         CHECK (semester IS NOT NULL AND semester IN (1, 2)) NOT VALID',
        target_table,
        semester_constraint
      );
    END IF;
  END LOOP;
END
$migration$;
