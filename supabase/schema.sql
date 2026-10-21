-- GeoCam: esquema para Supabase (Postgres).
-- Ejecutar una sola vez en el SQL Editor del proyecto de Supabase.
--
-- Acceso anonimo: la app usa solo la publishable/anon key, sin login.
-- Las politicas RLS de abajo dejan leer y escribir a cualquiera que tenga
-- la key: valido para el taller, NO para produccion.

create table if not exists public.albums (
  id bigint generated always as identity primary key,
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.photos (
  id bigint generated always as identity primary key,
  -- URL publica de la imagen en Storage (lo que muestra <Image>)
  uri text not null,
  -- Ruta dentro del bucket, necesaria para borrar el archivo
  storage_path text not null,
  latitude double precision,
  longitude double precision,
  accuracy double precision,
  source text not null check (source in ('camera', 'gallery')),
  -- Al borrar un album sus fotos NO se borran: quedan sin album
  album_id bigint references public.albums (id) on delete set null,
  note text,
  favorite boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists photos_created_at_idx on public.photos (created_at desc);
create index if not exists photos_album_id_idx on public.photos (album_id);

alter table public.albums enable row level security;
alter table public.photos enable row level security;

drop policy if exists "anon all albums" on public.albums;
create policy "anon all albums" on public.albums
  for all to anon using (true) with check (true);

drop policy if exists "anon all photos" on public.photos;
create policy "anon all photos" on public.photos
  for all to anon using (true) with check (true);

-- Bucket publico para las imagenes
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

drop policy if exists "anon read photos bucket" on storage.objects;
create policy "anon read photos bucket" on storage.objects
  for select to anon using (bucket_id = 'photos');

drop policy if exists "anon upload photos bucket" on storage.objects;
create policy "anon upload photos bucket" on storage.objects
  for insert to anon with check (bucket_id = 'photos');

drop policy if exists "anon delete photos bucket" on storage.objects;
create policy "anon delete photos bucket" on storage.objects
  for delete to anon using (bucket_id = 'photos');
