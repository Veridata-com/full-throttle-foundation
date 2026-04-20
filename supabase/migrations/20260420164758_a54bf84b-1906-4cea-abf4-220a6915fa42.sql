-- Add abuse cap enforcement: track AI cost per user per period and enforce hard ceiling
ALTER TABLE public.usage 
  ADD COLUMN IF NOT EXISTS ai_cost_cents integer NOT NULL DEFAULT 0;

-- Hard caps (in cents): Starter=$5 (well above realistic $0.35), Pro=$15 (matches plan ceiling)
CREATE OR REPLACE FUNCTION public.check_and_increment_ai_cost(_user_id uuid, _cost_cents integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ps date := (date_trunc('month', now()))::date;
  cur_cost integer := 0;
  user_plan plan_tier;
  cap_cents integer;
BEGIN
  SELECT plan INTO user_plan FROM public.profiles WHERE id = _user_id;
  IF user_plan IS NULL OR user_plan = 'none' THEN
    RETURN false;
  END IF;
  cap_cents := CASE user_plan WHEN 'starter' THEN 500 WHEN 'pro' THEN 1500 ELSE 0 END;

  INSERT INTO public.usage (user_id, period_start, ai_cost_cents)
  VALUES (_user_id, ps, 0)
  ON CONFLICT DO NOTHING;

  SELECT ai_cost_cents INTO cur_cost FROM public.usage 
    WHERE user_id = _user_id AND period_start = ps;

  IF cur_cost >= cap_cents THEN
    RETURN false;
  END IF;

  UPDATE public.usage 
    SET ai_cost_cents = COALESCE(ai_cost_cents,0) + _cost_cents,
        updated_at = now()
    WHERE user_id = _user_id AND period_start = ps;

  RETURN true;
END $$;

-- Unique constraint to support ON CONFLICT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'usage_user_period_unique'
  ) THEN
    ALTER TABLE public.usage ADD CONSTRAINT usage_user_period_unique UNIQUE (user_id, period_start);
  END IF;
END $$;