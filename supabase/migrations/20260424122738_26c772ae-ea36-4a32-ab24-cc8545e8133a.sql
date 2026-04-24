-- Release notes
CREATE TABLE public.release_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text,
  status text NOT NULL DEFAULT 'shipped' CHECK (status IN ('shipped','upcoming')),
  version text,
  sort_order integer NOT NULL DEFAULT 0,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.release_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read release notes"
  ON public.release_notes FOR SELECT USING (true);
CREATE POLICY "Admins insert release notes"
  ON public.release_notes FOR INSERT WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update release notes"
  ON public.release_notes FOR UPDATE USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete release notes"
  ON public.release_notes FOR DELETE USING (has_role(auth.uid(),'admin'));

CREATE TRIGGER set_release_notes_updated_at
  BEFORE UPDATE ON public.release_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Updates under a release note (progress logs for "what's to come")
CREATE TABLE public.release_note_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_note_id uuid NOT NULL REFERENCES public.release_notes(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.release_note_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read release note updates"
  ON public.release_note_updates FOR SELECT USING (true);
CREATE POLICY "Admins insert release note updates"
  ON public.release_note_updates FOR INSERT WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update release note updates"
  ON public.release_note_updates FOR UPDATE USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete release note updates"
  ON public.release_note_updates FOR DELETE USING (has_role(auth.uid(),'admin'));

CREATE TRIGGER set_release_note_updates_updated_at
  BEFORE UPDATE ON public.release_note_updates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_rn_updates_note ON public.release_note_updates(release_note_id, created_at DESC);

-- Anonymous comments on release notes
CREATE TABLE public.release_note_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_note_id uuid NOT NULL REFERENCES public.release_notes(id) ON DELETE CASCADE,
  author_name text,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.release_note_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read comments"
  ON public.release_note_comments FOR SELECT USING (true);
CREATE POLICY "Anyone can post comments"
  ON public.release_note_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins delete comments"
  ON public.release_note_comments FOR DELETE USING (has_role(auth.uid(),'admin'));

CREATE INDEX idx_rn_comments_note ON public.release_note_comments(release_note_id, created_at DESC);

-- Feedback (paying users only)
CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text,
  subject text,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Paying users insert own feedback"
  ON public.feedback FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.plan <> 'none'
    )
  );
CREATE POLICY "Users view own feedback"
  ON public.feedback FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete feedback"
  ON public.feedback FOR DELETE USING (has_role(auth.uid(),'admin'));

-- Assign admin role to hermansmanasse@gmail.com if present
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'hermansmanasse@gmail.com'
ON CONFLICT DO NOTHING;