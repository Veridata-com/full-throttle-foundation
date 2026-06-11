ALTER TABLE public.slideshows
  ADD COLUMN IF NOT EXISTS embed_code text,
  ADD COLUMN IF NOT EXISTS tiktok_caption text;

CREATE UNIQUE INDEX IF NOT EXISTS slideshows_embed_code_idx
  ON public.slideshows (embed_code)
  WHERE embed_code IS NOT NULL;