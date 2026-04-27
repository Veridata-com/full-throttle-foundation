
-- generated_images: AI-created slide backgrounds with text-placement decisions
CREATE TABLE public.generated_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  slideshow_id UUID,
  slide_index INTEGER,
  image_prompt TEXT NOT NULL,
  style_keywords TEXT[] DEFAULT '{}',
  negative_space_position TEXT NOT NULL DEFAULT 'center',
  image_url TEXT NOT NULL,
  storage_path TEXT,
  generation_model TEXT DEFAULT 'google/gemini-3-pro-image-preview',
  generation_time_ms INTEGER,
  text_placement JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_generated_images_user ON public.generated_images(user_id);
CREATE INDEX idx_generated_images_slideshow ON public.generated_images(slideshow_id);
ALTER TABLE public.generated_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own generated_images" ON public.generated_images
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Users insert own generated_images" ON public.generated_images
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own generated_images" ON public.generated_images
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own generated_images" ON public.generated_images
  FOR DELETE USING (auth.uid() = user_id);

-- generation_style_performance: feeds into self-learning
CREATE TABLE public.generation_style_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  posted_slideshow_id UUID,
  style_keywords TEXT[] DEFAULT '{}',
  negative_space_position TEXT,
  text_fill_color TEXT,
  text_stroke_color TEXT,
  text_font_size INTEGER,
  performance_score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_gen_style_perf_user ON public.generation_style_performance(user_id);
ALTER TABLE public.generation_style_performance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own gen_style_perf" ON public.generation_style_performance
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Users insert own gen_style_perf" ON public.generation_style_performance
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own gen_style_perf" ON public.generation_style_performance
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own gen_style_perf" ON public.generation_style_performance
  FOR DELETE USING (auth.uid() = user_id);

-- slideshows additions
ALTER TABLE public.slideshows
  ADD COLUMN generation_mode TEXT NOT NULL DEFAULT 'photo',
  ADD COLUMN generation_progress JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN design_styles TEXT[] DEFAULT '{}';

-- workspaces: which modes the AI is allowed to choose for this brand
ALTER TABLE public.workspaces
  ADD COLUMN allowed_generation_modes TEXT[] NOT NULL DEFAULT ARRAY['photo','designed'];

-- usage: track designed slideshow generations for plan limits
ALTER TABLE public.usage
  ADD COLUMN designed_slideshows_generated INTEGER NOT NULL DEFAULT 0;

-- Storage bucket for AI-generated slide images (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-images', 'generated-images', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users read own generated images storage"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'generated-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users upload own generated images storage"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'generated-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own generated images storage"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'generated-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own generated images storage"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'generated-images' AND auth.uid()::text = (storage.foldername(name))[1]);
