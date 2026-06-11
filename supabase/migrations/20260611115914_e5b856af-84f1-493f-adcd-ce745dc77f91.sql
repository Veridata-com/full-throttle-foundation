
-- 1) profiles: block client UPDATEs from changing plan/stripe columns
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- service_role bypasses this trigger via SECURITY DEFINER ownership? No — trigger always fires.
  -- Allow when session is service_role (edge functions) or postgres.
  IF current_setting('request.jwt.claims', true) IS NOT NULL
     AND (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF NEW.plan IS DISTINCT FROM OLD.plan
     OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
     OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
     OR NEW.current_period_end IS DISTINCT FROM OLD.current_period_end THEN
    RAISE EXCEPTION 'Modifying billing fields is not allowed';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS protect_profile_sensitive_columns ON public.profiles;
CREATE TRIGGER protect_profile_sensitive_columns
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_sensitive_columns();

-- Also tighten the UPDATE policy roles to authenticated only
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 2) usage: drop user UPDATE policy (only check_and_increment_ai_cost SECURITY DEFINER updates it)
DROP POLICY IF EXISTS "Users update own usage" ON public.usage;
DROP POLICY IF EXISTS "Users insert own usage" ON public.usage;

-- 3) release_note_comments: require auth to post
DROP POLICY IF EXISTS "Anyone can post comments" ON public.release_note_comments;
CREATE POLICY "Authenticated can post comments" ON public.release_note_comments
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 4) user_roles: scope admin manage policy to authenticated
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users view own roles" ON public.user_roles;
CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- 5) Lock down SECURITY DEFINER functions from PostgREST exposure
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_tiktok_accounts_limit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_and_increment_ai_cost(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_profile_sensitive_columns() FROM PUBLIC, anon, authenticated;
-- has_role is used in RLS policies (caller must have EXECUTE); keep for authenticated, revoke anon
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
-- create_workspace_with_folder is called via RPC from authenticated clients
REVOKE EXECUTE ON FUNCTION public.create_workspace_with_folder(text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_workspace_with_folder(text, text, text, text, text) TO authenticated;
