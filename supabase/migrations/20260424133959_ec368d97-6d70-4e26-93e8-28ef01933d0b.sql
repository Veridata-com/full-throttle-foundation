
ALTER TABLE public.release_notes
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS media_type text;

ALTER TABLE public.release_note_updates
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS media_type text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('release-media', 'release-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view release media"
ON storage.objects FOR SELECT
USING (bucket_id = 'release-media');

CREATE POLICY "Admins upload release media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'release-media' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update release media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'release-media' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete release media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'release-media' AND public.has_role(auth.uid(), 'admin'));
