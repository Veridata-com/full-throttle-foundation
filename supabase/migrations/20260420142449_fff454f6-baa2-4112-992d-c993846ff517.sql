
-- ========== ENUMS ==========
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.plan_tier AS ENUM ('none', 'starter', 'pro');
CREATE TYPE public.slideshow_status AS ENUM ('draft', 'generating', 'ready', 'failed');

-- ========== PROFILES ==========
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  plan public.plan_tier NOT NULL DEFAULT 'none',
  brand_voice TEXT,
  target_audience TEXT,
  default_cta TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ========== USER ROLES ==========
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- ========== USAGE ==========
CREATE TABLE public.usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL DEFAULT date_trunc('month', now())::date,
  slideshows_generated INT NOT NULL DEFAULT 0,
  images_uploaded INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, period_start)
);
ALTER TABLE public.usage ENABLE ROW LEVEL SECURITY;

-- ========== IMAGES ==========
CREATE TABLE public.images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  width INT,
  height INT,
  ai_description TEXT,
  ai_tags TEXT[] DEFAULT '{}',
  ai_palette JSONB,
  ai_status TEXT NOT NULL DEFAULT 'pending', -- pending|processing|done|failed
  ai_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_images_user ON public.images(user_id, created_at DESC);

-- ========== SLIDESHOWS ==========
CREATE TABLE public.slideshows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled slideshow',
  status public.slideshow_status NOT NULL DEFAULT 'draft',
  hook_style TEXT,
  target_audience TEXT,
  cta TEXT,
  image_ids UUID[] NOT NULL DEFAULT '{}',
  slides JSONB NOT NULL DEFAULT '[]'::jsonb,
  generation_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.slideshows ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_slideshows_user ON public.slideshows(user_id, created_at DESC);

-- ========== UPDATED_AT TRIGGER ==========
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_usage_updated BEFORE UPDATE ON public.usage
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_images_updated BEFORE UPDATE ON public.images
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_slideshows_updated BEFORE UPDATE ON public.slideshows
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ========== AUTO-CREATE PROFILE ON SIGNUP ==========
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========== RLS POLICIES ==========
-- profiles
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- user_roles
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- usage
CREATE POLICY "Users view own usage" ON public.usage FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users insert own usage" ON public.usage FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own usage" ON public.usage FOR UPDATE USING (auth.uid() = user_id);

-- images
CREATE POLICY "Users view own images" ON public.images FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users insert own images" ON public.images FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own images" ON public.images FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own images" ON public.images FOR DELETE USING (auth.uid() = user_id);

-- slideshows
CREATE POLICY "Users view own slideshows" ON public.slideshows FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users insert own slideshows" ON public.slideshows FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own slideshows" ON public.slideshows FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own slideshows" ON public.slideshows FOR DELETE USING (auth.uid() = user_id);

-- ========== STORAGE BUCKETS ==========
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images','product-images', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('slideshow-exports','slideshow-exports', false) ON CONFLICT DO NOTHING;

-- Storage policies: users only see/manage files in their own folder (user_id/...)
CREATE POLICY "Users read own product images" ON storage.objects FOR SELECT
  USING (bucket_id='product-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users upload own product images" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id='product-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own product images" ON storage.objects FOR DELETE
  USING (bucket_id='product-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users read own exports" ON storage.objects FOR SELECT
  USING (bucket_id='slideshow-exports' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users upload own exports" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id='slideshow-exports' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own exports" ON storage.objects FOR DELETE
  USING (bucket_id='slideshow-exports' AND auth.uid()::text = (storage.foldername(name))[1]);
