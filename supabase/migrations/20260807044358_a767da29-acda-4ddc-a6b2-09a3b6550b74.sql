ALTER TABLE public.study_snapshots
  ADD COLUMN IF NOT EXISTS chapters_done integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chapters_total integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS questions_solved integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS questions_total integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS study_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS goals_done integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS goals_total integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS goals jsonb NOT NULL DEFAULT '[]'::jsonb;