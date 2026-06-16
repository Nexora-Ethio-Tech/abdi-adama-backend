ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS graduation_year character varying(20);
