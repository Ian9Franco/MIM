-- =========================================================================================
-- Tabla followed_authors: autores seguidos por cada usuario (MIM Web Cloud)
-- =========================================================================================

CREATE TABLE IF NOT EXISTS public.followed_authors (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  author_url  text,
  icon_url    text,
  platform    text NOT NULL DEFAULT 'modrinth' CHECK (platform IN ('modrinth', 'curseforge')),
  created_at  timestamptz DEFAULT now() NOT NULL,
  UNIQUE (profile_id, author_name, platform)
);

CREATE INDEX IF NOT EXISTS idx_followed_authors_profile ON public.followed_authors (profile_id);

ALTER TABLE public.followed_authors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura pública followed_authors"
  ON public.followed_authors FOR SELECT USING (true);

CREATE POLICY "Inserción propia followed_authors"
  ON public.followed_authors FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Borrado propio followed_authors"
  ON public.followed_authors FOR DELETE USING (auth.uid() = profile_id);
