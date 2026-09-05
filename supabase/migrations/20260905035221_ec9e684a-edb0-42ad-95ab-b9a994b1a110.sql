ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text;

WITH candidates AS (
  SELECT
    p.id,
    COALESCE(
      NULLIF(
        left(regexp_replace(lower(split_part(COALESCE(u.email, 'student'), '@', 1)), '[^a-z0-9_]', '', 'g'), 23),
        ''
      ),
      'student'
    ) AS base_name
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE p.username IS NULL
), ranked AS (
  SELECT
    id,
    base_name,
    row_number() OVER (PARTITION BY base_name ORDER BY id) AS ordinal
  FROM candidates
)
UPDATE public.profiles p
SET username = CASE
  WHEN ranked.ordinal = 1 THEN ranked.base_name
  ELSE left(ranked.base_name, 22) || '_' || left(replace(ranked.id::text, '-', ''), 8)
END,
updated_at = now()
FROM ranked
WHERE p.id = ranked.id;

UPDATE public.profiles
SET username = 'student_' || left(replace(id::text, '-', ''), 8), updated_at = now()
WHERE username IS NULL OR btrim(username) = '';

ALTER TABLE public.profiles
  ALTER COLUMN username SET NOT NULL;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_key UNIQUE (username);

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_format CHECK (username ~ '^[a-z0-9_]{3,32}$');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

DROP FUNCTION IF EXISTS public.ensure_my_profile(text);

CREATE OR REPLACE FUNCTION public.ensure_my_profile(
  _display_name text DEFAULT NULL,
  _username text DEFAULT NULL
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
DECLARE
  _row public.profiles;
  _code text;
  _normalized_username text;
  _derived_username text;
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

  _normalized_username := lower(btrim(COALESCE(_username, '')));
  IF _normalized_username <> '' AND _normalized_username !~ '^[a-z0-9_]{3,32}$' THEN
    RAISE EXCEPTION 'Username must be 3 to 32 characters using lowercase letters, numbers, or underscores';
  END IF;

  IF _normalized_username = '' THEN
    _derived_username := NULLIF(
      left(
        regexp_replace(
          lower(split_part(COALESCE(auth.jwt() ->> 'email', 'student'), '@', 1)),
          '[^a-z0-9_]',
          '',
          'g'
        ),
        23
      ),
      ''
    );
    _normalized_username := COALESCE(_derived_username, 'student') || '_' || left(replace(auth.uid()::text, '-', ''), 8);
  END IF;

  LOOP
    _code := lpad((floor(random() * 1000000))::int::text, 6, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE friend_code = _code);
  END LOOP;

  INSERT INTO public.profiles (id, username, display_name, friend_code)
  VALUES (
    auth.uid(),
    _normalized_username,
    COALESCE(NULLIF(btrim(_display_name), ''), 'Student'),
    _code
  )
  RETURNING * INTO _row;

  RETURN _row;
END;
$function$;

REVOKE ALL ON FUNCTION public.ensure_my_profile(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_my_profile(text, text) TO authenticated;