create extension if not exists "uuid-ossp";

-- 1. TABLA: PROFILES
create table public.profiles (
    id uuid references auth.users on delete cascade primary key,
    username text unique not null,
    avatar_url text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

-- Trigger para perfiles automáticos
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'User_' || substr(new.id::text, 1, 8)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Políticas RLS Profiles
create policy "Lectura pública de perfiles" on public.profiles for select using (true);
create policy "Modificación de perfil propio" on public.profiles for update using (auth.uid() = id);

-- 2. TABLA: FAVORITE_MODS
create table public.favorite_mods (
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

-- Políticas RLS Favoritos
create policy "Lectura pública de favoritos" on public.favorite_mods for select using (true);
create policy "Insertar favoritos propios" on public.favorite_mods for insert with check (auth.uid() = profile_id);
create policy "Eliminar favoritos propios" on public.favorite_mods for delete using (auth.uid() = profile_id);

-- 3. TABLA: SHOWCASE_VIDEOS
create table public.showcase_videos (
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

-- Políticas RLS Videos
create policy "Lectura pública de videos" on public.showcase_videos for select using (true);
create policy "Publicar videos propios" on public.showcase_videos for insert with check (auth.uid() = profile_id);
create policy "Eliminar videos propios" on public.showcase_videos for delete using (auth.uid() = profile_id);

-- 4. TABLA: MODPACK_BUILDS (Modelo Híbrido Liviano)
create table public.modpack_builds (
    id uuid default gen_random_uuid() primary key,
    profile_id uuid references public.profiles(id) on delete cascade not null,
    name text not null,
    description text,
    game_version text not null,
    modloader text not null,
    version_label text not null,
    config_zip_url text,      -- URL al zip con overrides/config (opcional en Storage)
    manifest jsonb not null,   -- Contiene listado de mods (ID, plataforma, versión, etc.)
    downloads_count integer default 0 not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.modpack_builds enable row level security;

-- Políticas RLS Modpacks
create policy "Lectura pública de modpacks" on public.modpack_builds for select using (true);
create policy "Publicar modpack propio" on public.modpack_builds for insert with check (auth.uid() = profile_id);
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
