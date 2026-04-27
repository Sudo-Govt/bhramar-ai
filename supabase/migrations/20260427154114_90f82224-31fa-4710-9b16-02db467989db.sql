REVOKE EXECUTE ON FUNCTION public.match_chunks(vector, UUID, INT, FLOAT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_chunks(vector, UUID, INT, FLOAT) TO service_role;