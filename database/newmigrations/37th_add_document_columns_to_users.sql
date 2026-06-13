ALTER TABLE public.users ADD COLUMN IF NOT EXISTS document_data bytea;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS document_file_name character varying(255);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS document_file_size bigint;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS document_mime_type character varying(100);
