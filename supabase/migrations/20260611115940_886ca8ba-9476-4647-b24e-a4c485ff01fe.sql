
-- Tighten release_note_comments INSERT check
DROP POLICY IF EXISTS "Authenticated can post comments" ON public.release_note_comments;
CREATE POLICY "Authenticated can post comments" ON public.release_note_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    char_length(btrim(body)) BETWEEN 1 AND 2000
    AND release_note_id IS NOT NULL
  );

-- Remove broad SELECT on public buckets so they cannot be listed.
-- Files remain accessible via the public CDN URL (which bypasses RLS).
DROP POLICY IF EXISTS "Public read stock-images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view release media" ON storage.objects;
