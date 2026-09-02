-- 1) Replace follows() helper with inline policy logic
DROP POLICY IF EXISTS "read followed profiles" ON public.profiles;
DROP POLICY IF EXISTS "read followed snapshots" ON public.study_snapshots;

CREATE POLICY "read followed profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.user_id = auth.uid() AND f.friend_id = public.profiles.id
  )
);

CREATE POLICY "read followed snapshots"
ON public.study_snapshots
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.user_id = auth.uid() AND f.friend_id = public.study_snapshots.user_id
  )
);

DROP FUNCTION IF EXISTS public.follows(uuid, uuid);

-- 2) ensure_my_profile no longer needs elevated privileges
CREATE OR REPLACE FUNCTION public.ensure_my_profile(_display_name text DEFAULT NULL::text)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
DECLARE
  _row public.profiles;
  _code text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT * INTO _row FROM public.profiles WHERE id = auth.uid();
  IF FOUND THEN
    IF _display_name IS NOT NULL AND length(btrim(_display_name)) > 0
       AND _row.display_name <> btrim(_display_name) THEN
      UPDATE public.profiles
        SET display_name = btrim(_display_name), updated_at = now()
        WHERE id = auth.uid()
        RETURNING * INTO _row;
    END IF;
    RETURN _row;
  END IF;

  LOOP
    _code := lpad((floor(random() * 1000000))::int::text, 6, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE friend_code = _code);
  END LOOP;

  INSERT INTO public.profiles (id, display_name, friend_code)
  VALUES (auth.uid(), COALESCE(NULLIF(btrim(_display_name), ''), 'Student'), _code)
  RETURNING * INTO _row;

  RETURN _row;
END;
$function$;

REVOKE ALL ON FUNCTION public.ensure_my_profile(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_my_profile(text) TO authenticated;

-- 3) Remove the elevated add_friend_by_code helper (replaced by a secure server endpoint)
DROP FUNCTION IF EXISTS public.add_friend_by_code(text);