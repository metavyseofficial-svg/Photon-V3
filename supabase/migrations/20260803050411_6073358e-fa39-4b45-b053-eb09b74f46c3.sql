REVOKE EXECUTE ON FUNCTION public.ensure_my_profile(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.add_friend_by_code(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.follows(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.ensure_my_profile(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.add_friend_by_code(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.follows(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_my_profile(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_friend_by_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.follows(uuid, uuid) TO authenticated;