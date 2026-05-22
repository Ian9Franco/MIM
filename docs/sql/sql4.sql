-- OPCIONAL — no es necesario para que funcione el ranking de comunidad en la app.
-- La ruta /api/fomo/community-rankings ya agrega en Node leyendo public.favorite_mods.
--
-- Usá algo como esto solo si la tabla crece mucho y querés delegar el agregado a Postgres
-- (por ejemplo exponiendo esta vista o una RPC y llamándola con service_role desde el servidor).

create or replace view public.community_favorite_rankings as
select
  fm.mod_id,
  fm.platform,
  max(fm.name) as name,
  max(fm.icon_url) as icon_url,
  count(*)::int as share_count
from public.favorite_mods fm
group by fm.mod_id, fm.platform
order by share_count desc;

comment on view public.community_favorite_rankings is 'Agregado de mods/creadores más compartidos (solo lectura; la app puede seguir usando la API actual).';
