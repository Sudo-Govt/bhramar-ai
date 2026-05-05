
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Now re-run the Phase 2 schema
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  owner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  status text NOT NULL DEFAULT 'pending',
  invited_at timestamptz NOT NULL DEFAULT now(),
  joined_at timestamptz,
  UNIQUE (team_id, user_id)
);

CREATE TABLE public.team_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  case_id uuid NOT NULL,
  shared_by uuid NOT NULL,
  shared_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, case_id)
);

CREATE TABLE public.team_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.team_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  assignee_id uuid,
  status text NOT NULL DEFAULT 'todo',
  due_date timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  payload jsonb DEFAULT '{}'::jsonb,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.is_team_member(_team_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = _team_id AND user_id = _user_id AND status = 'active'
  ) OR EXISTS (
    SELECT 1 FROM public.teams WHERE id = _team_id AND owner_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_team_owner(_team_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.teams WHERE id = _team_id AND owner_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.enforce_team_creation_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE tier text; team_count int;
BEGIN
  SELECT subscription_tier::text INTO tier FROM public.profiles WHERE id = NEW.owner_id;
  IF tier IS NULL OR tier IN ('Free', 'Pro') THEN
    RAISE EXCEPTION 'Team Up requires Advocate plan or higher';
  END IF;
  IF tier = 'Advocate' THEN
    SELECT count(*) INTO team_count FROM public.teams WHERE owner_id = NEW.owner_id;
    IF team_count >= 3 THEN
      RAISE EXCEPTION 'Advocate plan allows up to 3 teams. Upgrade to Firm for unlimited.';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_enforce_team_creation_limit
BEFORE INSERT ON public.teams FOR EACH ROW EXECUTE FUNCTION public.enforce_team_creation_limit();

CREATE OR REPLACE FUNCTION public.enforce_team_member_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE tier text; member_count int; owner uuid;
BEGIN
  SELECT owner_id INTO owner FROM public.teams WHERE id = NEW.team_id;
  SELECT subscription_tier::text INTO tier FROM public.profiles WHERE id = owner;
  IF tier = 'Advocate' THEN
    SELECT count(*) INTO member_count FROM public.team_members WHERE team_id = NEW.team_id;
    IF member_count >= 3 THEN
      RAISE EXCEPTION 'Advocate plan allows up to 3 members per team. Upgrade to Firm for unlimited.';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_enforce_team_member_limit
BEFORE INSERT ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.enforce_team_member_limit();

CREATE TRIGGER trg_teams_updated_at BEFORE UPDATE ON public.teams
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_team_tasks_updated_at BEFORE UPDATE ON public.team_tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.find_advocate_by_id(_advocate_id text)
RETURNS TABLE (
  id uuid, advocate_id text, full_name text, avatar_url text, state text,
  court_of_practice text, specializations text[], bar_council text,
  vakeel_score numeric, vakeel_reviews_count int, user_type text
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, advocate_id, full_name, avatar_url, state, court_of_practice,
         specializations, bar_council, vakeel_score, vakeel_reviews_count, user_type
  FROM public.profiles
  WHERE advocate_id = _advocate_id AND user_type IN ('advocate','firm_member')
  LIMIT 1;
$$;

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY teams_select_member ON public.teams FOR SELECT
  USING (owner_id = auth.uid() OR public.is_team_member(id, auth.uid()));
CREATE POLICY teams_insert_own ON public.teams FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY teams_update_owner ON public.teams FOR UPDATE
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY teams_delete_owner ON public.teams FOR DELETE USING (owner_id = auth.uid());

CREATE POLICY tm_select ON public.team_members FOR SELECT
  USING (user_id = auth.uid() OR public.is_team_owner(team_id, auth.uid()) OR public.is_team_member(team_id, auth.uid()));
CREATE POLICY tm_insert_owner ON public.team_members FOR INSERT
  WITH CHECK (public.is_team_owner(team_id, auth.uid()));
CREATE POLICY tm_update_self_or_owner ON public.team_members FOR UPDATE
  USING (user_id = auth.uid() OR public.is_team_owner(team_id, auth.uid()));
CREATE POLICY tm_delete_owner_or_self ON public.team_members FOR DELETE
  USING (user_id = auth.uid() OR public.is_team_owner(team_id, auth.uid()));

CREATE POLICY tc_select ON public.team_cases FOR SELECT USING (public.is_team_member(team_id, auth.uid()));
CREATE POLICY tc_insert ON public.team_cases FOR INSERT
  WITH CHECK (public.is_team_member(team_id, auth.uid()) AND shared_by = auth.uid());
CREATE POLICY tc_delete ON public.team_cases FOR DELETE
  USING (shared_by = auth.uid() OR public.is_team_owner(team_id, auth.uid()));

CREATE POLICY tmsg_select ON public.team_messages FOR SELECT USING (public.is_team_member(team_id, auth.uid()));
CREATE POLICY tmsg_insert ON public.team_messages FOR INSERT
  WITH CHECK (public.is_team_member(team_id, auth.uid()) AND user_id = auth.uid());
CREATE POLICY tmsg_delete ON public.team_messages FOR DELETE
  USING (user_id = auth.uid() OR public.is_team_owner(team_id, auth.uid()));

CREATE POLICY tt_select ON public.team_tasks FOR SELECT USING (public.is_team_member(team_id, auth.uid()));
CREATE POLICY tt_insert ON public.team_tasks FOR INSERT
  WITH CHECK (public.is_team_member(team_id, auth.uid()) AND created_by = auth.uid());
CREATE POLICY tt_update ON public.team_tasks FOR UPDATE USING (public.is_team_member(team_id, auth.uid()));
CREATE POLICY tt_delete ON public.team_tasks FOR DELETE
  USING (created_by = auth.uid() OR public.is_team_owner(team_id, auth.uid()));

CREATE POLICY notif_select_own ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY notif_insert_any_authed ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY notif_update_own ON public.notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY notif_delete_own ON public.notifications FOR DELETE USING (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.team_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_tasks;

CREATE OR REPLACE FUNCTION public.add_team_owner_as_member()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.team_members (team_id, user_id, role, status, joined_at)
  VALUES (NEW.id, NEW.owner_id, 'owner', 'active', now())
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_add_team_owner_as_member
AFTER INSERT ON public.teams FOR EACH ROW EXECUTE FUNCTION public.add_team_owner_as_member();
