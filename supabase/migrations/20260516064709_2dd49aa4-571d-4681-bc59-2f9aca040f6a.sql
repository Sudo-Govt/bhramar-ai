-- ============================================================
-- 1. Harden handle_new_user: force Free + citizen, seed tokens
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Force every new signup to Free + citizen (no admin escalation)
  INSERT INTO public.profiles (id, email, full_name, subscription_tier, user_type, onboarding_completed)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'Free'::subscription_tier,
    'citizen',
    false
  );

  -- Seed token balance (Free tier defaults: 5/day, 75/month)
  INSERT INTO public.token_balances (user_id, daily_quota, monthly_quota, daily_remaining, monthly_remaining)
  VALUES (NEW.id, 5, 75, 5, 75)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 2. token_balances
-- ============================================================
CREATE TABLE IF NOT EXISTS public.token_balances (
  user_id UUID PRIMARY KEY,
  daily_quota INT NOT NULL DEFAULT 5,
  monthly_quota INT NOT NULL DEFAULT 75,
  daily_remaining INT NOT NULL DEFAULT 5,
  monthly_remaining INT NOT NULL DEFAULT 75,
  addon_tokens INT NOT NULL DEFAULT 0,
  last_daily_reset DATE NOT NULL DEFAULT CURRENT_DATE,
  last_monthly_reset DATE NOT NULL DEFAULT date_trunc('month', CURRENT_DATE)::date,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.token_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tb_select_own ON public.token_balances;
CREATE POLICY tb_select_own ON public.token_balances FOR SELECT
  USING (auth.uid() = user_id OR public.is_super_admin());

DROP POLICY IF EXISTS tb_update_own ON public.token_balances;
CREATE POLICY tb_update_own ON public.token_balances FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================
-- 3. token_ledger
-- ============================================================
CREATE TABLE IF NOT EXISTS public.token_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('consume','daily_grant','monthly_grant','addon_grant','admin_adjust')),
  amount INT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ledger_user_created ON public.token_ledger(user_id, created_at DESC);
ALTER TABLE public.token_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tl_select_own ON public.token_ledger;
CREATE POLICY tl_select_own ON public.token_ledger FOR SELECT
  USING (auth.uid() = user_id OR public.is_super_admin());

-- ============================================================
-- 4. token_addon_purchases
-- ============================================================
CREATE TABLE IF NOT EXISTS public.token_addon_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  pack_size INT NOT NULL,
  amount_paise INT NOT NULL,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'created',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.token_addon_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tap_select_own ON public.token_addon_purchases;
CREATE POLICY tap_select_own ON public.token_addon_purchases FOR SELECT
  USING (auth.uid() = user_id OR public.is_super_admin());

DROP POLICY IF EXISTS tap_insert_own ON public.token_addon_purchases;
CREATE POLICY tap_insert_own ON public.token_addon_purchases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 5. Quota helpers (tier → daily/monthly)
-- ============================================================
CREATE OR REPLACE FUNCTION public.tier_quotas(_tier TEXT)
RETURNS TABLE(daily INT, monthly INT)
LANGUAGE sql IMMUTABLE
AS $$
  SELECT
    CASE _tier
      WHEN 'Free' THEN 5
      WHEN 'Pro'  THEN 10
      WHEN 'Firm' THEN 20
      ELSE 5
    END,
    CASE _tier
      WHEN 'Free' THEN 75
      WHEN 'Pro'  THEN 200
      WHEN 'Firm' THEN 500
      ELSE 75
    END;
$$;

-- Reset balances to match current tier (called on tier change / monthly)
CREATE OR REPLACE FUNCTION public.refresh_token_balance(p_user UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_tier TEXT;
  v_d INT;
  v_m INT;
BEGIN
  SELECT subscription_tier::text INTO v_tier FROM public.profiles WHERE id = p_user;
  SELECT daily, monthly INTO v_d, v_m FROM public.tier_quotas(COALESCE(v_tier,'Free'));

  INSERT INTO public.token_balances(user_id, daily_quota, monthly_quota, daily_remaining, monthly_remaining)
  VALUES (p_user, v_d, v_m, v_d, v_m)
  ON CONFLICT (user_id) DO UPDATE
    SET daily_quota = EXCLUDED.daily_quota,
        monthly_quota = EXCLUDED.monthly_quota;
END;
$$;

-- ============================================================
-- 6. consume_token — atomic spend with rolling windows
-- ============================================================
CREATE OR REPLACE FUNCTION public.consume_token(p_amount INT DEFAULT 1, p_reason TEXT DEFAULT 'chat')
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.token_balances%ROWTYPE;
  v_tier TEXT;
  v_d INT;
  v_m INT;
  v_today DATE := CURRENT_DATE;
  v_month_start DATE := date_trunc('month', CURRENT_DATE)::date;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  -- Ensure row exists
  PERFORM public.refresh_token_balance(v_uid);

  SELECT subscription_tier::text INTO v_tier FROM public.profiles WHERE id = v_uid;
  SELECT daily, monthly INTO v_d, v_m FROM public.tier_quotas(COALESCE(v_tier,'Free'));

  SELECT * INTO v_row FROM public.token_balances WHERE user_id = v_uid FOR UPDATE;

  -- Roll daily window
  IF v_row.last_daily_reset < v_today THEN
    v_row.daily_remaining := v_d;
    v_row.last_daily_reset := v_today;
    INSERT INTO public.token_ledger(user_id, kind, amount, reason) VALUES (v_uid, 'daily_grant', v_d, 'daily window roll');
  END IF;

  -- Roll monthly window
  IF v_row.last_monthly_reset < v_month_start THEN
    v_row.monthly_remaining := v_m;
    v_row.last_monthly_reset := v_month_start;
    INSERT INTO public.token_ledger(user_id, kind, amount, reason) VALUES (v_uid, 'monthly_grant', v_m, 'monthly window roll');
  END IF;

  -- Try to spend: daily first, then monthly, then addon
  IF v_row.daily_remaining + v_row.monthly_remaining + v_row.addon_tokens < p_amount THEN
    UPDATE public.token_balances SET
      daily_remaining = v_row.daily_remaining,
      monthly_remaining = v_row.monthly_remaining,
      last_daily_reset = v_row.last_daily_reset,
      last_monthly_reset = v_row.last_monthly_reset,
      updated_at = now()
    WHERE user_id = v_uid;
    RAISE EXCEPTION 'quota exhausted' USING ERRCODE = 'P0001';
  END IF;

  DECLARE remaining INT := p_amount;
  BEGIN
    IF v_row.daily_remaining >= remaining THEN
      v_row.daily_remaining := v_row.daily_remaining - remaining;
      remaining := 0;
    ELSE
      remaining := remaining - v_row.daily_remaining;
      v_row.daily_remaining := 0;
    END IF;

    IF remaining > 0 THEN
      IF v_row.monthly_remaining >= remaining THEN
        v_row.monthly_remaining := v_row.monthly_remaining - remaining;
        remaining := 0;
      ELSE
        remaining := remaining - v_row.monthly_remaining;
        v_row.monthly_remaining := 0;
      END IF;
    END IF;

    IF remaining > 0 THEN
      v_row.addon_tokens := v_row.addon_tokens - remaining;
      remaining := 0;
    END IF;
  END;

  UPDATE public.token_balances SET
    daily_remaining = v_row.daily_remaining,
    monthly_remaining = v_row.monthly_remaining,
    addon_tokens = v_row.addon_tokens,
    last_daily_reset = v_row.last_daily_reset,
    last_monthly_reset = v_row.last_monthly_reset,
    updated_at = now()
  WHERE user_id = v_uid;

  INSERT INTO public.token_ledger(user_id, kind, amount, reason) VALUES (v_uid, 'consume', -p_amount, p_reason);

  RETURN jsonb_build_object(
    'daily_remaining', v_row.daily_remaining,
    'monthly_remaining', v_row.monthly_remaining,
    'addon_tokens', v_row.addon_tokens
  );
END;
$$;

-- ============================================================
-- 7. grant_addon_tokens — called after Razorpay verification
-- ============================================================
CREATE OR REPLACE FUNCTION public.grant_addon_tokens(p_user UUID, p_amount INT, p_order TEXT)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM public.refresh_token_balance(p_user);
  UPDATE public.token_balances
    SET addon_tokens = addon_tokens + p_amount, updated_at = now()
    WHERE user_id = p_user;
  INSERT INTO public.token_ledger(user_id, kind, amount, reason)
    VALUES (p_user, 'addon_grant', p_amount, COALESCE('addon order ' || p_order, 'addon grant'));
END;
$$;

-- ============================================================
-- 8. is_enterprise_admin: firm-scoped
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_enterprise_admin(p_firm UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.firms WHERE id = p_firm AND owner_id = auth.uid())
$$;

-- ============================================================
-- 9. Seed token_balances for all existing users
-- ============================================================
INSERT INTO public.token_balances(user_id, daily_quota, monthly_quota, daily_remaining, monthly_remaining)
SELECT p.id,
       (SELECT daily FROM public.tier_quotas(p.subscription_tier::text)),
       (SELECT monthly FROM public.tier_quotas(p.subscription_tier::text)),
       (SELECT daily FROM public.tier_quotas(p.subscription_tier::text)),
       (SELECT monthly FROM public.tier_quotas(p.subscription_tier::text))
FROM public.profiles p
ON CONFLICT (user_id) DO NOTHING;