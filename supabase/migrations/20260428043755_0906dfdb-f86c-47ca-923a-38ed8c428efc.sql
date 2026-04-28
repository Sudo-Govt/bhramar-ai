
REVOKE EXECUTE ON FUNCTION public.generate_case_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_case_number() FROM PUBLIC, anon, authenticated;
ALTER FUNCTION public.generate_case_number() SECURITY INVOKER;
ALTER FUNCTION public.set_case_number() SECURITY INVOKER;
