
CREATE TABLE IF NOT EXISTS public.ai_decisions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  slideshow_id uuid,
  decision_type text NOT NULL DEFAULT 'exploit',
  hook_style_chosen text,
  slide_count_chosen integer,
  content_style_chosen text,
  generation_mode_chosen text,
  design_styles_chosen text[] DEFAULT '{}'::text[],
  hypothesis_id uuid,
  reasoning text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own ai_decisions" ON public.ai_decisions
  FOR SELECT USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users insert own ai_decisions" ON public.ai_decisions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own ai_decisions" ON public.ai_decisions
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ai_decisions_user ON public.ai_decisions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_decisions_slideshow ON public.ai_decisions(slideshow_id);

ALTER TABLE public.slideshows REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'slideshows'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.slideshows';
  END IF;
END $$;
