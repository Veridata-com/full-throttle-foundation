ALTER TABLE public.posted_slideshows ALTER COLUMN slideshow_id DROP NOT NULL;
ALTER TABLE public.posted_slideshows ADD COLUMN IF NOT EXISTS auto_imported boolean NOT NULL DEFAULT false;
ALTER TABLE public.posted_slideshows ADD COLUMN IF NOT EXISTS thumbnail_url text;
ALTER TABLE public.posted_slideshows ADD COLUMN IF NOT EXISTS caption text;
CREATE UNIQUE INDEX IF NOT EXISTS posted_slideshows_user_url_unique ON public.posted_slideshows(user_id, tiktok_post_url) WHERE tiktok_post_url IS NOT NULL;