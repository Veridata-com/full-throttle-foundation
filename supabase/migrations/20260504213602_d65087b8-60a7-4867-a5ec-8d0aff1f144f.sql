
CREATE TABLE public.tiktok_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  handle text NOT NULL,
  label text,
  sync_enabled boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz,
  last_sync_status text,
  last_sync_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, handle)
);

ALTER TABLE public.tiktok_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own tiktok_accounts" ON public.tiktok_accounts
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users insert own tiktok_accounts" ON public.tiktok_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own tiktok_accounts" ON public.tiktok_accounts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own tiktok_accounts" ON public.tiktok_accounts
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER tiktok_accounts_set_updated_at
  BEFORE UPDATE ON public.tiktok_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.enforce_tiktok_accounts_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE cnt int;
BEGIN
  SELECT COUNT(*) INTO cnt FROM public.tiktok_accounts WHERE workspace_id = NEW.workspace_id;
  IF cnt >= 50 THEN
    RAISE EXCEPTION 'Maximum of 50 TikTok accounts per workspace reached';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER tiktok_accounts_enforce_limit
  BEFORE INSERT ON public.tiktok_accounts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_tiktok_accounts_limit();

CREATE INDEX idx_tiktok_accounts_workspace ON public.tiktok_accounts(workspace_id);
CREATE INDEX idx_tiktok_accounts_user ON public.tiktok_accounts(user_id);

ALTER TABLE public.posted_slideshows
  ADD COLUMN IF NOT EXISTS tiktok_account_id uuid REFERENCES public.tiktok_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_posted_slideshows_tiktok_account ON public.posted_slideshows(tiktok_account_id);
