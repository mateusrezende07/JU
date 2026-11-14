-- SQL adicional para presentes e rolês do casal. Execute uma vez no Supabase.
create table if not exists public.presentes (
 id uuid primary key default gen_random_uuid(),
 nome text not null check(char_length(trim(nome)) between 1 and 90),
 cadastrado_por text not null check(cadastrado_por in ('Mateus','Júlia')),
 comprado boolean not null default false,
 created_at timestamptz not null default now()
);
create table if not exists public.roles (
 id uuid primary key default gen_random_uuid(),
 nome text not null check(char_length(trim(nome)) between 1 and 100),
 cadastrado_por text not null check(cadastrado_por in ('Mateus','Júlia')),
 visitado boolean not null default false,
 created_at timestamptz not null default now()
);
create table if not exists public.avaliacoes_roles (
 id uuid primary key default gen_random_uuid(),
 role_id uuid not null references public.roles(id) on delete cascade,
 pessoa text not null check(pessoa in ('Mateus','Júlia')),
 nota numeric(3,1) not null check(nota between 0 and 10),
 comentario text not null default '',
 iria_novamente boolean not null default true,
 created_at timestamptz not null default now(),
 unique(role_id,pessoa)
);
alter table public.presentes enable row level security;
alter table public.roles enable row level security;
alter table public.avaliacoes_roles enable row level security;
drop policy if exists "casal autenticado gerencia presentes" on public.presentes;
create policy "casal autenticado gerencia presentes" on public.presentes for all to authenticated using(true) with check(true);
drop policy if exists "casal autenticado gerencia roles" on public.roles;
create policy "casal autenticado gerencia roles" on public.roles for all to authenticated using(true) with check(true);
drop policy if exists "casal autenticado gerencia avaliacoes" on public.avaliacoes_roles;
create policy "casal autenticado gerencia avaliacoes" on public.avaliacoes_roles for all to authenticated using(true) with check(true);
grant select,insert,update,delete on public.presentes,public.roles,public.avaliacoes_roles to authenticated;
