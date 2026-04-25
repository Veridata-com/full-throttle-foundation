-- Self-learning system: posted_slideshows, post_metrics, user_insights + profile fields

-- 1. Add columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tiktok_handle TEXT,
  ADD COLUMN IF NOT EXISTS apify_sync_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS insights_last_seen_at TIMESTAMPTZ;

-- 2. posted_slideshows
CREATE TABLE IF NOT EXISTS public.posted_slideshows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  slideshow_id UUID NOT NULL REFERENCES public.slideshows(id) ON DELETE CASCADE,
  tiktok_handle TEXT NOT NULL,
  tiktok_post_url TEXT,
  hook_text TEXT NOT NULL,
  slide_count INTEGER NOT NULL,
  style TEXT NOT NULL DEFAULT 'storytelling',
  topic TEXT NOT NULL DEFAULT '',
  all_slide_texts TEXT[] NOT NULL DEFAULT '{}',
  image_ids TEXT[] NOT NULL DEFAULT '{}',
  posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_posted_slideshows_user ON public.posted_slideshows(user_id);
CREATE INDEX IF NOT EXISTS idx_posted_slideshows_sync ON public.posted_slideshows(sync_status, last_synced_at);

ALTER TABLE public.posted_slideshows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own posted_slideshows" ON public.posted_slideshows
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users insert own posted_slideshows" ON public.posted_slideshows
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own posted_slideshows" ON public.posted_slideshows
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own posted_slideshows" ON public.posted_slideshows
  FOR DELETE USING (auth.uid() = user_id);

-- 3. post_metrics
CREATE TABLE IF NOT EXISTS public.post_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  posted_slideshow_id UUID NOT NULL REFERENCES public.posted_slideshows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  follows_gained INTEGER NOT NULL DEFAULT 0,
  engagement_rate NUMERIC NOT NULL DEFAULT 0,
  performance_score NUMERIC NOT NULL DEFAULT 0,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_apify_data JSONB
);
CREATE INDEX IF NOT EXISTS idx_post_metrics_posted ON public.post_metrics(posted_slideshow_id);
CREATE INDEX IF NOT EXISTS idx_post_metrics_user ON public.post_metrics(user_id);

ALTER TABLE public.post_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own post_metrics" ON public.post_metrics
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users insert own post_metrics" ON public.post_metrics
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own post_metrics" ON public.post_metrics
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own post_metrics" ON public.post_metrics
  FOR DELETE USING (auth.uid() = user_id);

-- 4. user_insights
CREATE TABLE IF NOT EXISTS public.user_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  posts_analyzed INTEGER NOT NULL,
  top_hook_patterns TEXT[] NOT NULL DEFAULT '{}',
  best_slide_count INTEGER,
  best_style TEXT,
  best_posting_topics TEXT[] NOT NULL DEFAULT '{}',
  best_image_types TEXT[] NOT NULL DEFAULT '{}',
  worst_hook_patterns TEXT[] NOT NULL DEFAULT '{}',
  next_hook_suggestion TEXT,
  insight_summary TEXT NOT NULL,
  raw_analysis JSONB,
  is_current BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_user_insights_user ON public.user_insights(user_id, is_current);

ALTER TABLE public.user_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own user_insights" ON public.user_insights
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users insert own user_insights" ON public.user_insights
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own user_insights" ON public.user_insights
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own user_insights" ON public.user_insights
  FOR DELETE USING (auth.uid() = user_id);
