CREATE TABLE IF NOT EXISTS public_posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_text TEXT NOT NULL,
    image_url TEXT NOT NULL,
    media_type TEXT NOT NULL,
    created_at DATE DEFAULT CURRENT_DATE 
);

ALTER TABLE public_posts ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE public_posts ADD COLUMN IF NOT EXISTS post_text TEXT NOT NULL;
ALTER TABLE public_posts ADD COLUMN IF NOT EXISTS image_url TEXT NOT NULL;
ALTER TABLE public_posts ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL;
ALTER TABLE public_posts ADD COLUMN IF NOT EXISTS created_at DATE DEFAULT CURRENT_DATE;