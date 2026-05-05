
REVOKE EXECUTE ON FUNCTION public.find_advocate_by_id(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.find_advocate_by_id(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_team_member(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_team_owner(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_owner(uuid, uuid) TO authenticated;
