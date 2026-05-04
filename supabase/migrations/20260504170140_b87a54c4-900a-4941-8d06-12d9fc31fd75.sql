
ALTER TABLE public.slideshows
  ADD COLUMN IF NOT EXISTS topic text,
  ADD COLUMN IF NOT EXISTS cta_text text,
  ADD COLUMN IF NOT EXISTS ai_decided boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS content_style text,
  ADD COLUMN IF NOT EXISTS all_slide_texts text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS hook_text text,
  ADD COLUMN IF NOT EXISTS templates_used text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS icons_used text[] DEFAULT '{}'::text[];
