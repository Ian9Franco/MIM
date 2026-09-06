-- Social layer for public MIM community profiles and shared recommendations.
CREATE TABLE IF NOT EXISTS public.followed_profiles (
  follower_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  followed_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followed_id),
  CONSTRAINT followed_profiles_no_self_follow CHECK (follower_id <> followed_id)
);

CREATE INDEX IF NOT EXISTS idx_followed_profiles_followed
  ON public.followed_profiles (followed_id, created_at DESC);

ALTER TABLE public.followed_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura pública de perfiles seguidos" ON public.followed_profiles
  FOR SELECT USING (true);
CREATE POLICY "Seguir desde perfil propio" ON public.followed_profiles
  FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Dejar de seguir desde perfil propio" ON public.followed_profiles
  FOR DELETE USING (auth.uid() = follower_id);

CREATE TABLE IF NOT EXISTS public.community_reactions (
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  share_id uuid NOT NULL REFERENCES public.favorite_mods(id) ON DELETE CASCADE,
  reaction text NOT NULL DEFAULT 'like' CHECK (reaction IN ('like')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, share_id, reaction)
);

CREATE INDEX IF NOT EXISTS idx_community_reactions_share
  ON public.community_reactions (share_id, created_at DESC);

ALTER TABLE public.community_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura pública de reacciones" ON public.community_reactions
  FOR SELECT USING (true);
CREATE POLICY "Reaccionar desde perfil propio" ON public.community_reactions
  FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Quitar reacción propia" ON public.community_reactions
  FOR DELETE USING (auth.uid() = profile_id);
