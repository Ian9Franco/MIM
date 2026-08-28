-- =========================================================================================
-- FOMO CLOUD & DRAFTS MASTER SCHEMA
-- =========================================================================================
-- ¡PRECAUCIÓN! Ejecutar este bloque de "WIPE ALL" eliminará TODOS los datos de FOMO.
-- Solo usar en desarrollo o si estás 100% seguro de reiniciar la base de datos desde cero.
-- =========================================================================================

/*
-- DESCOMENTAR PARA HACER WIPE TOTAL:
DROP TRIGGER IF EXISTS trg_refresh_rankings_on_insert ON public.favorite_mods;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.refresh_community_rankings() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.community_favorite_rankings_mv CASCADE;
DROP TABLE IF EXISTS public.draft_activity CASCADE;
DROP TABLE IF EXISTS public.draft_snapshots CASCADE;
DROP TABLE IF EXISTS public.draft_items CASCADE;
DROP TABLE IF EXISTS public.draft_members CASCADE;
DROP TABLE IF EXISTS public.drafts CASCADE;
DROP TABLE IF EXISTS public.followed_mods CASCADE;
DROP TABLE IF EXISTS public.showcase_videos CASCADE;
DROP TABLE IF EXISTS public.favorite_mods CASCADE;
DROP TABLE IF EXISTS public.modpack_builds CASCADE; -- (Legado)
DROP TABLE IF EXISTS public.profiles CASCADE;
*/

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================================
-- 1. PROFILES (Sincronizado con auth.users de Supabase)
-- =========================================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    username text UNIQUE NOT NULL,
    avatar_url text,
    color text DEFAULT '#F05A28',
    banner_url text,
    banner_meta jsonb,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura pública de perfiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Modificación de perfil propio" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Trigger para perfiles automáticos seguros (sanitización de username)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'username'), ''),
      'User_' || substr(new.id::text, 1, 8)
    ),
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- =========================================================================================
-- 2. COMMUNITY SHARES (Favorite Mods & Showcase Videos)
-- =========================================================================================
CREATE TABLE IF NOT EXISTS public.favorite_mods (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    mod_id text NOT NULL,
    platform text NOT NULL CHECK (platform IN ('modrinth', 'curseforge', 'youtube')),
    name text NOT NULL,
    icon_url text,
    summary text,
    pinned boolean DEFAULT false NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE (profile_id, mod_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_favorite_mods_profile_id ON public.favorite_mods (profile_id);
CREATE INDEX IF NOT EXISTS idx_favorite_mods_created_at ON public.favorite_mods (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_favorite_mods_pinned_created_at ON public.favorite_mods (pinned DESC, created_at DESC);

ALTER TABLE public.favorite_mods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura pública de favoritos" ON public.favorite_mods FOR SELECT USING (true);
CREATE POLICY "Insertar favoritos propios" ON public.favorite_mods FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Actualizar favoritos propios" ON public.favorite_mods FOR UPDATE USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Eliminar favoritos propios" ON public.favorite_mods FOR DELETE USING (auth.uid() = profile_id);


CREATE TABLE IF NOT EXISTS public.showcase_videos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    youtube_video_id text NOT NULL,
    title text NOT NULL,
    description text,
    thumbnail_url text,
    created_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE (profile_id, youtube_video_id)
);

CREATE INDEX IF NOT EXISTS idx_showcase_videos_profile_id ON public.showcase_videos (profile_id);
CREATE INDEX IF NOT EXISTS idx_showcase_videos_created_at ON public.showcase_videos (created_at DESC);

ALTER TABLE public.showcase_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura pública de videos" ON public.showcase_videos FOR SELECT USING (true);
CREATE POLICY "Publicar videos propios" ON public.showcase_videos FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Modificar videos propios" ON public.showcase_videos FOR UPDATE USING (auth.uid() = profile_id);
CREATE POLICY "Eliminar videos propios" ON public.showcase_videos FOR DELETE USING (auth.uid() = profile_id);

-- =========================================================================================
-- 3. COMMUNITY RANKINGS (Materialized View)
-- =========================================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS public.community_favorite_rankings_mv AS
SELECT
  fm.mod_id,
  fm.platform,
  max(fm.name)     AS name,
  max(fm.icon_url) AS icon_url,
  count(*)::int    AS share_count
FROM public.favorite_mods fm
GROUP BY fm.mod_id, fm.platform
ORDER BY share_count DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cfr_mv_mod_platform
  ON public.community_favorite_rankings_mv (mod_id, platform);

CREATE OR REPLACE FUNCTION public.refresh_community_rankings()
RETURNS trigger AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.community_favorite_rankings_mv;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_refresh_rankings_on_insert ON public.favorite_mods;
CREATE TRIGGER trg_refresh_rankings_on_insert
  AFTER INSERT OR DELETE ON public.favorite_mods
  FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_community_rankings();

-- =========================================================================================
-- 4. FOLLOWED MODS (Private Tracking)
-- =========================================================================================
CREATE TABLE IF NOT EXISTS public.followed_mods (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mod_id      text NOT NULL,
  platform    text NOT NULL CHECK (platform IN ('modrinth', 'curseforge')),
  name        text,
  icon_url    text,
  created_at  timestamptz DEFAULT now() NOT NULL,
  UNIQUE (profile_id, mod_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_followed_mods_mod_id    ON public.followed_mods (mod_id, platform);
CREATE INDEX IF NOT EXISTS idx_followed_mods_profile   ON public.followed_mods (profile_id);

ALTER TABLE public.followed_mods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura pública followed_mods" ON public.followed_mods FOR SELECT USING (true);
CREATE POLICY "Inserción propia followed_mods" ON public.followed_mods FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Borrado propio followed_mods" ON public.followed_mods FOR DELETE USING (auth.uid() = profile_id);

-- =========================================================================================
-- 5. DRAFTS ECOSYSTEM
-- =========================================================================================
CREATE TABLE IF NOT EXISTS public.drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  minecraft_version text NOT NULL,
  loader text NOT NULL,
  visibility text DEFAULT 'private',
  cover_image text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.draft_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid REFERENCES public.drafts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'editor',
  created_at timestamptz DEFAULT now(),
  UNIQUE(draft_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.draft_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid REFERENCES public.drafts(id) ON DELETE CASCADE,
  source text NOT NULL,
  project_id text NOT NULL,
  version_id text,
  mod_name text,
  content_type text,
  category text,
  side text DEFAULT 'both',
  required boolean DEFAULT true,
  added_by uuid REFERENCES public.profiles(id),
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(draft_id, project_id, content_type)
);

CREATE TABLE IF NOT EXISTS public.draft_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid REFERENCES public.drafts(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  manifest jsonb NOT NULL,
  fingerprint text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.draft_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid REFERENCES public.drafts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id),
  action text NOT NULL,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public drafts readable" ON public.drafts FOR SELECT USING (visibility = 'public' OR owner_id = auth.uid());
CREATE POLICY "owners manage drafts" ON public.drafts FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "members readable" ON public.draft_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.drafts WHERE drafts.id = draft_members.draft_id AND (drafts.owner_id = auth.uid() OR draft_members.user_id = auth.uid()))
);

CREATE POLICY "members edit items" ON public.draft_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.draft_members WHERE draft_members.draft_id = draft_items.draft_id AND draft_members.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.draft_members WHERE draft_members.draft_id = draft_items.draft_id AND draft_members.user_id = auth.uid())
);

-- Trigger to automatically add the draft owner to draft_members
CREATE OR REPLACE FUNCTION public.handle_new_draft()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.draft_members (draft_id, user_id, role)
  VALUES (new.id, new.owner_id, 'owner');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_draft_created ON public.drafts;
CREATE TRIGGER on_draft_created
  AFTER INSERT ON public.drafts
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_draft();
