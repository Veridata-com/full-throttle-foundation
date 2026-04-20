-- 1. workspaces
CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'My workspace',
  tagline text,
  target_audience text,
  brand_voice text,
  default_cta text,
  story_style_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own workspaces" ON public.workspaces FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "Users insert own workspaces" ON public.workspaces FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own workspaces" ON public.workspaces FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own workspaces" ON public.workspaces FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER workspaces_set_updated_at BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. folders
CREATE TABLE public.folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  auto boolean NOT NULL DEFAULT false,
  system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, name)
);
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own folders" ON public.folders FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "Users insert own folders" ON public.folders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own folders" ON public.folders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own folders" ON public.folders FOR DELETE USING (auth.uid() = user_id AND system = false);
CREATE TRIGGER folders_set_updated_at BEFORE UPDATE ON public.folders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. image_folders join
CREATE TABLE public.image_folders (
  image_id uuid NOT NULL REFERENCES public.images(id) ON DELETE CASCADE,
  folder_id uuid NOT NULL REFERENCES public.folders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (image_id, folder_id)
);
ALTER TABLE public.image_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own image_folders" ON public.image_folders FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "Users insert own image_folders" ON public.image_folders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own image_folders" ON public.image_folders FOR DELETE USING (auth.uid() = user_id);

-- 4. alter images
ALTER TABLE public.images ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.images ADD COLUMN is_product_shot boolean NOT NULL DEFAULT false;
ALTER TABLE public.images ADD COLUMN quality text;
CREATE INDEX idx_images_workspace ON public.images(workspace_id);

-- 5. alter slideshows
ALTER TABLE public.slideshows ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.slideshows ADD COLUMN num_slides integer NOT NULL DEFAULT 6;
CREATE INDEX idx_slideshows_workspace ON public.slideshows(workspace_id);

-- 6. Backfill: one workspace per existing user, attach existing images + slideshows
DO $$
DECLARE
  u RECORD;
  ws_id uuid;
  psf_id uuid;
BEGIN
  FOR u IN SELECT DISTINCT id FROM public.profiles LOOP
    INSERT INTO public.workspaces (user_id, name) VALUES (u.id, 'My first workspace') RETURNING id INTO ws_id;
    UPDATE public.images SET workspace_id = ws_id WHERE user_id = u.id AND workspace_id IS NULL;
    UPDATE public.slideshows SET workspace_id = ws_id WHERE user_id = u.id AND workspace_id IS NULL;
    INSERT INTO public.folders (workspace_id, user_id, name, system) VALUES (ws_id, u.id, 'Product slide images', true) RETURNING id INTO psf_id;
  END LOOP;
END $$;

-- 7. Auto-create workspace + product folder on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  ws_id uuid;
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END $function$;

-- 8. Helper: create workspace with system folder
CREATE OR REPLACE FUNCTION public.create_workspace_with_folder(_name text, _tagline text, _audience text, _brand_voice text, _cta text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ws_id uuid;
  uid uuid := auth.uid();
  cur_count int;
  plan_tier plan_tier;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT plan INTO plan_tier FROM public.profiles WHERE id = uid;
  SELECT COUNT(*) INTO cur_count FROM public.workspaces WHERE user_id = uid;
  IF plan_tier = 'starter' AND cur_count >= 1 THEN RAISE EXCEPTION 'Starter plan limited to 1 workspace'; END IF;
  IF plan_tier = 'pro' AND cur_count >= 5 THEN RAISE EXCEPTION 'Pro plan limited to 5 workspaces'; END IF;
  IF plan_tier = 'none' AND cur_count >= 1 THEN RAISE EXCEPTION 'Subscribe to create more workspaces'; END IF;

  INSERT INTO public.workspaces (user_id, name, tagline, target_audience, brand_voice, default_cta)
  VALUES (uid, _name, _tagline, _audience, _brand_voice, _cta)
  RETURNING id INTO ws_id;

  INSERT INTO public.folders (workspace_id, user_id, name, system)
  VALUES (ws_id, uid, 'Product slide images', true);

  RETURN ws_id;
END $$;