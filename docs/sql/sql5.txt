-- ============================================================
-- TABLA: followed_mods
-- Registra qué proyectos siguen los usuarios de la comunidad.
-- A diferencia de favorite_mods (compartir en comunidad),
-- esta tabla refleja el estado de "seguimiento" privado del
-- usuario, sincronizado desde IndexedDB al cloud.
-- ============================================================

-- 1. Crear tabla
CREATE TABLE IF NOT EXISTS public.followed_mods (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mod_id      text NOT NULL,         -- projectId del mod (Modrinth slug o CurseForge ID)
  platform    text NOT NULL CHECK (platform IN ('modrinth', 'curseforge')),
  name        text,                  -- Título del mod (cache local)
  icon_url    text,                  -- URL del icono (cache local)
  created_at  timestamptz DEFAULT now() NOT NULL,

  -- Un usuario no puede seguir el mismo mod dos veces en la misma plataforma
  UNIQUE (profile_id, mod_id, platform)
);

-- 2. Índices para consultas de lectura eficientes
CREATE INDEX IF NOT EXISTS idx_followed_mods_mod_id    ON public.followed_mods (mod_id, platform);
CREATE INDEX IF NOT EXISTS idx_followed_mods_profile   ON public.followed_mods (profile_id);

-- 3. RLS: habilitar y crear políticas
ALTER TABLE public.followed_mods ENABLE ROW LEVEL SECURITY;

-- Lectura pública: cualquiera puede ver quién sigue qué mod
CREATE POLICY "Lectura pública followed_mods"
  ON public.followed_mods FOR SELECT
  USING (true);

-- Inserción: solo el propio usuario
CREATE POLICY "Inserción propia followed_mods"
  ON public.followed_mods FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

-- Borrado: solo el propio usuario
CREATE POLICY "Borrado propio followed_mods"
  ON public.followed_mods FOR DELETE
  USING (auth.uid() = profile_id);

-- ============================================================
-- CONSULTA para el badge "Seguido por" en FomoModCard
-- Trae quiénes siguen un mod específico con su perfil
-- ============================================================

-- Ej: mod_id = 'AANobbMI' (Fabric API en Modrinth), platform = 'modrinth'
SELECT
  fm.profile_id,
  p.username,
  p.avatar_url,
  p.color
FROM public.followed_mods fm
JOIN public.profiles p ON p.id = fm.profile_id
WHERE fm.mod_id = 'AANobbMI'
  AND fm.platform = 'modrinth'
ORDER BY fm.created_at DESC;

-- ============================================================
-- CONSULTA para carga masiva en el panel Explorar
-- Trae todos los seguimientos para un lote de mod_ids
-- (se usa para computar followedByUsers por cada FomoModCard)
-- ============================================================

SELECT
  fm.mod_id,
  fm.platform,
  fm.profile_id,
  p.username,
  p.avatar_url,
  p.color
FROM public.followed_mods fm
JOIN public.profiles p ON p.id = fm.profile_id
ORDER BY fm.created_at DESC;

-- ============================================================
-- NOTES para el frontend (FomoSidebar.tsx)
-- ============================================================
-- 1. Reemplazar la fuente de datos en fetchSharedMods():
--    Cambiar el select de "favorite_mods" por "followed_mods"
--    para poblar el array que se pasa como followedByUsers={}
--    a cada FomoModCard.
--
-- 2. En useFomoFollowedManager.ts, al hacer followMod() / unfollowMod()
--    desde IndexedDB, también hacer upsert/delete en esta tabla
--    cuando el usuario esté logueado (sync cloud ↔ local).
--
-- 3. La prop communitySharers en FomoSidebar ahora se renombró
--    a followedByUsers en FomoModCard. Cuando este tabla esté activa,
--    cambiar el select en fetchSharedMods a:
--
--    supabase
--      .from("followed_mods")
--      .select("mod_id, platform, profile_id, profiles ( username, avatar_url, color )")
--
-- ============================================================
