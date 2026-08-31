-- Preserve the most recently maintained active academic year if legacy data
-- contains duplicates, then prevent more than one active row going forward.
WITH ranked_active_years AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      ORDER BY updated_at DESC NULLS LAST,
               start_date DESC,
               created_at DESC,
               id
    ) AS active_rank
  FROM public.academic_years
  WHERE is_active = true
)
UPDATE public.academic_years AS academic_year
SET is_active = false,
    updated_at = NOW()
FROM ranked_active_years
WHERE academic_year.id = ranked_active_years.id
  AND ranked_active_years.active_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_academic_years_single_active
  ON public.academic_years ((is_active))
  WHERE is_active = true;
