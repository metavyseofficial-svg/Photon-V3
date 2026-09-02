CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'Student',
  friend_code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, friend_id)
);

CREATE TABLE public.study_snapshots (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  percent int NOT NULL DEFAULT 0,
  completed int NOT NULL DEFAULT 0,
  total int NOT NULL DEFAULT 0,
  streak int NOT NULL DEFAULT 0,
  done_today int NOT NULL DEFAULT 0,
  daily_goal int NOT NULL DEFAULT 1,
  subjects jsonb NOT NULL DEFAULT '[]'::jsonb,
  current_chapters jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_snapshots TO authenticated;
GRANT ALL ON public.study_snapshots TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_snapshots ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.follows(_viewer uuid, _target uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.user_id = _viewer AND f.friend_id = _target
  );
$$;

CREATE POLICY "own profile access" ON public.profiles
  FOR ALL TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "read followed profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.follows(auth.uid(), id));

CREATE POLICY "own friendships" ON public.friendships
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "own snapshot" ON public.study_snapshots
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "read followed snapshots" ON public.study_snapshots
  FOR SELECT TO authenticated
  USING (public.follows(auth.uid(), user_id));

CREATE OR REPLACE FUNCTION public.ensure_my_profile(_display_name text DEFAULT NULL)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.add_friend_by_code(_code text)
RETURNS TABLE (id uuid, display_name text, friend_code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _target public.profiles;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT * INTO _target FROM public.profiles p WHERE p.friend_code = btrim(_code);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No student found with that code';
  END IF;
  IF _target.id = auth.uid() THEN
    RAISE EXCEPTION 'That is your own code';
  END IF;

  INSERT INTO public.friendships (user_id, friend_id)
  VALUES (auth.uid(), _target.id)
  ON CONFLICT (user_id, friend_id) DO NOTHING;

  RETURN QUERY SELECT _target.id, _target.display_name, _target.friend_code;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_my_profile(text) FROM public;
REVOKE ALL ON FUNCTION public.add_friend_by_code(text) FROM public;
GRANT EXECUTE ON FUNCTION public.ensure_my_profile(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_friend_by_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.follows(uuid, uuid) TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.study_snapshots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;