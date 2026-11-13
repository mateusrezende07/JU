-- Execute este SQL no SQL Editor do Supabase.
create extension if not exists pgcrypto;

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  memory_date date,
  photo_path text not null,
  photo_url text not null,
  music_path text,
  music_url text,
  music_name text,
  music_start integer not null default 0,
  music_end integer,
  created_at timestamptz not null default now()
);

alter table public.memories enable row level security;

drop policy if exists "Qualquer pessoa pode ver as lembrancas" on public.memories;
create policy "Qualquer pessoa pode ver as lembrancas"
on public.memories for select
to anon, authenticated
using (true);

drop policy if exists "Usuarios autenticados podem inserir" on public.memories;
create policy "Usuarios autenticados podem inserir"
on public.memories for insert
to authenticated
with check (true);

drop policy if exists "Usuarios autenticados podem excluir" on public.memories;
create policy "Usuarios autenticados podem excluir"
on public.memories for delete
to authenticated
using (true);

-- Bucket público para permitir que o link do site mostre fotos e músicas.
insert into storage.buckets (id, name, public, file_size_limit)
values ('memory-photos', 'memory-photos', true, 52428800)
on conflict (id) do update set public = true, file_size_limit = 52428800;

drop policy if exists "Leitura publica das midias" on storage.objects;
create policy "Leitura publica das midias"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'memory-photos');

drop policy if exists "Usuarios autenticados enviam midias" on storage.objects;
create policy "Usuarios autenticados enviam midias"
on storage.objects for insert
to authenticated
with check (bucket_id = 'memory-photos');

drop policy if exists "Usuarios autenticados removem midias" on storage.objects;
create policy "Usuarios autenticados removem midias"
on storage.objects for delete
to authenticated
using (bucket_id = 'memory-photos');
