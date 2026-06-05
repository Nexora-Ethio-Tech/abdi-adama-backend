ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profile_image text;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS profile_image text;