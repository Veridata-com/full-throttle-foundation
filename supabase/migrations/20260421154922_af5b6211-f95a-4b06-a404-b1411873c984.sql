
-- Stock images table (read-only library managed by founder)
CREATE TABLE public.stock_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  ai_description TEXT NOT NULL DEFAULT '',
  ai_tags TEXT[] NOT NULL DEFAULT '{}',
  category TEXT NOT NULL DEFAULT 'lifestyle',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_images ENABLE ROW LEVEL SECURITY;

-- Anyone signed in can read the curated library
CREATE POLICY "Authenticated users can read stock images"
  ON public.stock_images FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can mutate (founder uses dashboard / service role anyway)
CREATE POLICY "Admins can insert stock images"
  ON public.stock_images FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update stock images"
  ON public.stock_images FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete stock images"
  ON public.stock_images FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX stock_images_category_idx ON public.stock_images (category);

-- Profile preference for default image source
ALTER TABLE public.profiles
  ADD COLUMN default_image_source TEXT NOT NULL DEFAULT 'both'
    CHECK (default_image_source IN ('both', 'own_only'));

-- Public storage bucket for stock images
INSERT INTO storage.buckets (id, name, public)
VALUES ('stock-images', 'stock-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read on stock-images bucket
CREATE POLICY "Public read stock-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'stock-images');

-- Admin write on stock-images bucket
CREATE POLICY "Admins write stock-images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'stock-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update stock-images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'stock-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete stock-images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'stock-images' AND public.has_role(auth.uid(), 'admin'));
