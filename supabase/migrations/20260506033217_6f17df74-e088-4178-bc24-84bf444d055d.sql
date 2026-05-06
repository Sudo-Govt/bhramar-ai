CREATE OR REPLACE FUNCTION public.enforce_team_creation_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE tier text; team_count int;
BEGIN
  SELECT subscription_tier::text INTO tier FROM public.profiles WHERE id = NEW.owner_id;
  IF tier IS NULL OR tier = 'Free' THEN
    RAISE EXCEPTION 'Team Up requires Advocate plan or higher';
  END IF;
  IF tier = 'Pro' THEN
    SELECT count(*) INTO team_count FROM public.teams WHERE owner_id = NEW.owner_id;
    IF team_count >= 3 THEN
      RAISE EXCEPTION 'Advocate plan allows up to 3 teams. Upgrade to Firm for unlimited.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_team_member_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE tier text; member_count int; owner uuid;
BEGIN
  SELECT owner_id INTO owner FROM public.teams WHERE id = NEW.team_id;
  SELECT subscription_tier::text INTO tier FROM public.profiles WHERE id = owner;
  IF tier = 'Pro' THEN
    SELECT count(*) INTO member_count FROM public.team_members WHERE team_id = NEW.team_id;
    IF member_count >= 3 THEN
      RAISE EXCEPTION 'Advocate plan allows up to 3 members per team. Upgrade to Firm for unlimited.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;