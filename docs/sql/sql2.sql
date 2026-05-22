-- 1. LIMPIEZA DE POLÍTICAS ANTERIORES (Para evitar que falle por duplicados)
drop policy if exists "Lectura pública de favoritos" on public.favorite_mods;
drop policy if exists "Insertar favoritos propios" on public.favorite_mods;
drop policy if exists "Eliminar favoritos propios" on public.favorite_mods;

drop policy if exists "Lectura pública de videos" on public.showcase_videos;
drop policy if exists "Publicar videos propios" on public.showcase_videos;
drop policy if exists "Modificar videos propios" on public.showcase_videos;
drop policy if exists "Eliminar videos propios" on public.showcase_videos;

drop policy if exists "Lectura pública de modpacks" on public.modpack_builds;
drop policy if exists "Publicar modpack propio" on public.modpack_builds;
drop policy if exists "Modificar modpack propio" on public.modpack_builds;
drop policy if exists "Eliminar modpack propio" on public.modpack_builds;


-- 2. TABLA: FAVORITE_MODS
create table if not exists public.favorite_mods (
    id uuid default gen_random_uuid() primary key,
    profile_id uuid references public.profiles(id) on delete cascade not null,
    mod_id text not null,
    platform text not null check (platform in ('modrinth', 'curseforge')),
    name text not null,
    icon_url text,
    summary text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique (profile_id, mod_id, platform)
);

alter table public.favorite_mods enable row level security;

create policy "Lectura pública de favoritos" on public.favorite_mods for select using (true);
create policy "Insertar favoritos propios" on public.favorite_mods for insert with check (auth.uid() = profile_id);
create policy "Eliminar favoritos propios" on public.favorite_mods for delete using (auth.uid() = profile_id);


-- 3. TABLA: SHOWCASE_VIDEOS
create table if not exists public.showcase_videos (
    id uuid default gen_random_uuid() primary key,
    profile_id uuid references public.profiles(id) on delete cascade not null,
    youtube_video_id text not null,
    title text not null,
    description text,
    thumbnail_url text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique (profile_id, youtube_video_id)
);

alter table public.showcase_videos enable row level security;

create policy "Lectura pública de videos" on public.showcase_videos for select using (true);
create policy "Publicar videos propios" on public.showcase_videos for insert with check (auth.uid() = profile_id);
create policy "Modificar videos propios" on public.showcase_videos for update using (auth.uid() = profile_id);
create policy "Eliminar videos propios" on public.showcase_videos for delete using (auth.uid() = profile_id);


-- 4. TABLA: MODPACK_BUILDS (Modelo Híbrido Optimizado)
create table if not exists public.modpack_builds (
    id uuid default gen_random_uuid() primary key,
    profile_id uuid references public.profiles(id) on delete cascade not null,
    name text not null,
    description text,
    game_version text not null,
    modloader text not null,
    version_label text not null,
    config_zip_url text,      
    manifest jsonb not null,   
    downloads_count integer default 0 not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Índice GIN para que tu app busque instantáneamente dentro de los JSONB
create index if not exists idx_modpack_builds_manifest on public.modpack_builds using gin (manifest);

alter table public.modpack_builds enable row level security;

create policy "Lectura pública de modpacks" on public.modpack_builds for select using (true);
create policy "Publicar modpack propio" on public.modpack_builds for insert with check (auth.uid() = profile_id);
create policy "Modificar modpack propio" on public.modpack_builds for update using (auth.uid() = profile_id);
create policy "Eliminar modpack propio" on public.modpack_builds for delete using (auth.uid() = profile_id);


-- 5. FUNCIÓN RPC: CONTADOR DE DESCARGAS ATÓMICO
create or replace function public.increment_downloads(row_id uuid)
returns void as $$
begin
  update public.modpack_builds
  set downloads_count = downloads_count + 1
  where id = row_id;
end;
$$ language plpgsql security definer;


-- 6. EXTRA: CONFIGURACIÓN AUTOMÁTICA DEL BUCKET DE STORAGE (.ZIPs)
insert into storage.buckets (id, name, public) 
values ('modpack-configs', 'modpack-configs', true)
on conflict (id) do nothing;

drop policy if exists "Descarga pública de configuraciones" on storage.objects;
create policy "Descarga pública de configuraciones" 
on storage.objects for select to public using (bucket_id = 'modpack-configs');

drop policy if exists "Usuarios pueden subir sus configuraciones" on storage.objects;
create policy "Usuarios pueden subir sus configuraciones" 
on storage.objects for insert to authenticated 
with check (bucket_id = 'modpack-configs' and (auth.uid()::text = (storage.foldername(name))[1]));

drop policy if exists "Usuarios pueden borrar sus configuraciones" on storage.objects;
create policy "Usuarios pueden borrar sus configuraciones" 
on storage.objects for delete to authenticated 
using (bucket_id = 'modpack-configs' and (auth.uid()::text = (storage.foldername(name))[1]));