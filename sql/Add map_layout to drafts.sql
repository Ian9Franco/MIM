-- Persist draft item map canvas positions and category display names.
ALTER TABLE public.drafts
  ADD COLUMN IF NOT EXISTS map_layout jsonb DEFAULT '{}'::jsonb;
