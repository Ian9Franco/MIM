-- ============================================================
-- MIM COMMUNITY — MISSING INDEXES & TRIGGER HARDENING
-- Run this once in Supabase SQL Editor (Dashboard → SQL Editor)
-- All statements use IF NOT EXISTS / OR REPLACE — safe to re-run.
-- ============================================================


-- ── 1. INDEXES: favorite_mods ────────────────────────────────
-- CommunityPanel fetches: SELECT ... FROM favorite_mods ORDER BY created_at DESC
-- CommunityUserProfile fetches: SELECT ... FROM favorite_mods WHERE profile_id = $1

CREATE INDEX IF NOT EXISTS idx_favorite_mods_profile_id
  ON public.favorite_mods (profile_id);

CREATE INDEX IF NOT EXISTS idx_favorite_mods_created_at
  ON public.favorite_mods (created_at DESC);


-- ── 2. INDEXES: showcase_videos ──────────────────────────────
-- CommunityPanel: SELECT ... FROM showcase_videos ORDER BY created_at DESC
-- CommunityUserProfile: SELECT ... FROM showcase_videos WHERE profile_id = $1

CREATE INDEX IF NOT EXISTS idx_showcase_videos_profile_id
  ON public.showcase_videos (profile_id);

CREATE INDEX IF NOT EXISTS idx_showcase_videos_created_at
  ON public.showcase_videos (created_at DESC);


-- ── 3. INDEXES: modpack_builds ───────────────────────────────
-- You already have: idx_modpack_builds_manifest (GIN on jsonb) ✓
-- Missing: profile_id lookup and created_at sort

CREATE INDEX IF NOT EXISTS idx_modpack_builds_profile_id
  ON public.modpack_builds (profile_id);

CREATE INDEX IF NOT EXISTS idx_modpack_builds_created_at
  ON public.modpack_builds (created_at DESC);


-- ── 4. TRIGGER HARDENING: profiles username sanitization ─────
-- The current trigger writes raw_user_meta_data directly (security definer).
-- Adding trim() + nullif() prevents empty-string usernames from leaking through.

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


-- ── 5. OPTIONAL: Materialized view for community rankings ────
-- sql4.txt has a plain VIEW — re-aggregates on every query.
-- Replace it with a materialized view so rankings are pre-computed.
-- After creation, call: REFRESH MATERIALIZED VIEW CONCURRENTLY public.community_favorite_rankings_mv;
-- You can automate this via a Supabase scheduled function or trigger.

DROP VIEW IF EXISTS public.community_favorite_rankings;

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

-- Unique index required for CONCURRENTLY refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_cfr_mv_mod_platform
  ON public.community_favorite_rankings_mv (mod_id, platform);

-- Initial population
REFRESH MATERIALIZED VIEW public.community_favorite_rankings_mv;


-- ── 6. AUTO-REFRESH rankings after favorite_mods changes ─────
-- Trigger that keeps the materialized view fresh on insert/delete.

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
