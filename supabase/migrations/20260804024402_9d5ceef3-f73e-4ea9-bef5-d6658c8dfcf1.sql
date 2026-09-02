-- Lock down SECURITY DEFINER helpers: no public/anon execute
REVOKE ALL ON FUNCTION public.follows(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.add_friend_by_code(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ensure_my_profile(text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.follows(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_friend_by_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_my_profile(text) TO authenticated;

-- follows() may only be used to inspect the caller's own connections
CREATE OR REPLACE FUNCTION public.follows(_viewer uuid, _target uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT _viewer IS NOT NULL
     AND _viewer = auth.uid()
     AND EXISTS (
       SELECT 1 FROM public.friendships f
       WHERE f.user_id = _viewer AND f.friend_id = _target
     );
$function$;
