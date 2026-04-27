
-- Brand identity per user
CREATE TABLE public.brand_identity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  brand_name TEXT NOT NULL,
  brand_tagline TEXT,
  brand_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#FF3B5C',
  secondary_color TEXT,
  background_dark TEXT NOT NULL DEFAULT '#0A0A0A',
  background_light TEXT NOT NULL DEFAULT '#FAFAFA',
  text_on_dark TEXT NOT NULL DEFAULT '#FFFFFF',
  text_on_light TEXT NOT NULL DEFAULT '#111111',
  accent_muted TEXT,
  heading_font TEXT NOT NULL DEFAULT 'Inter',
  heading_weight TEXT NOT NULL DEFAULT '800',
  body_font TEXT NOT NULL DEFAULT 'Inter',
  body_weight TEXT NOT NULL DEFAULT '400',
  slide_mood TEXT NOT NULL DEFAULT 'dark',
  corner_radius TEXT NOT NULL DEFAULT 'subtle',
  use_icons BOOLEAN NOT NULL DEFAULT TRUE,
  use_dividers BOOLEAN NOT NULL DEFAULT TRUE,
  use_numbers BOOLEAN NOT NULL DEFAULT TRUE,
  use_brand_watermark BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE public.brand_identity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own brand_identity" ON public.brand_identity
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users insert own brand_identity" ON public.brand_identity
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own brand_identity" ON public.brand_identity
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own brand_identity" ON public.brand_identity
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER brand_identity_set_updated_at
  BEFORE UPDATE ON public.brand_identity
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Slide templates (system-managed, public read)
CREATE TABLE public.slide_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  layout_type TEXT NOT NULL,
  html_template TEXT NOT NULL,
  preview_svg TEXT,
  suitable_for TEXT[] NOT NULL DEFAULT '{}',
  is_system BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.slide_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read templates" ON public.slide_templates
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Admins manage templates" ON public.slide_templates
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add new generation_mode value support (column already exists as TEXT)
-- No schema change needed, just documenting: new value 'clean_designed'
