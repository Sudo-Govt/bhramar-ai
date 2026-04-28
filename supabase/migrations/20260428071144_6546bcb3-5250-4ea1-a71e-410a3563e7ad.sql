REVOKE EXECUTE ON FUNCTION public.archive_case(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.unarchive_case(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.delete_case_with_log(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.archive_case(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unarchive_case(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_case_with_log(UUID) TO authenticated;