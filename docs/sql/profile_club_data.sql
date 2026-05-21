-- Club público por usuario (mods seguidos, autores, canales YouTube guardados)
alter table public.profiles
  add column if not exists club_data jsonb default null;

comment on column public.profiles.club_data is
  'Snapshot JSON: { mods, authors, youtubeChannels, updatedAt }';
