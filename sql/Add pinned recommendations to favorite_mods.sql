ALTER TABLE public.favorite_mods
  ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;

UPDATE public.favorite_mods
SET pinned = true
WHERE pinned IS FALSE
  AND summary ~ '"priority"\s*:\s*true';

CREATE INDEX IF NOT EXISTS idx_favorite_mods_pinned_created_at
  ON public.favorite_mods (pinned DESC, created_at DESC);

ALTER TABLE public.favorite_mods
  DROP CONSTRAINT IF EXISTS favorite_mods_platform_check;

ALTER TABLE public.favorite_mods
  ADD CONSTRAINT favorite_mods_platform_check
  CHECK (platform IN ('modrinth', 'curseforge', 'youtube'));

DROP POLICY IF EXISTS "Actualizar favoritos propios" ON public.favorite_mods;

CREATE POLICY "Actualizar favoritos propios"
  ON public.favorite_mods
  FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);
