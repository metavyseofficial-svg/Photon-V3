ALTER TABLE public.study_snapshots
  ADD COLUMN IF NOT EXISTS shared_data jsonb NOT NULL DEFAULT '{}'::jsonb;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_snapshots TO authenticated;
GRANT ALL ON public.study_snapshots TO service_role;