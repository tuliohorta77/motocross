-- =====================================================================
-- Parla Italiano · banco de dados no Supabase
-- Cole este arquivo inteiro no Supabase → SQL Editor → New query → Run.
-- Pode rodar de novo sem problema (é idempotente).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- tabelas ----------
create table if not exists public.classes (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,                -- código que o aluno digita (ex.: ITA-7KQ2)
  name       text not null,                       -- nome da turma
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  class_id     uuid references public.classes on delete set null,
  display_name text not null,
  is_admin     boolean not null default false,
  ouv_tot      int not null default 0,            -- rodadas de escuta
  ouv_ok       int not null default 0,            -- rodadas de escuta certas
  created_at   timestamptz not null default now(),
  last_seen    timestamptz
);

create table if not exists public.progress (      -- nota de cada lição (média das 3 últimas)
  user_id    uuid not null references public.profiles on delete cascade,
  lesson     int  not null,
  hist       jsonb not null default '[]',         -- últimas 3 porcentagens
  best       int  not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson)
);

create table if not exists public.games (         -- cada partida jogada
  id         bigserial primary key,
  user_id    uuid not null default auth.uid() references public.profiles on delete cascade,
  lesson     int not null,
  score      int, pct int, hits int, total int, helped int, retries int, duration_s int,
  missed     jsonb,
  played_at  timestamptz not null default now()
);

create table if not exists public.tests (         -- Teste A1 (e futuros)
  id        bigserial primary key,
  user_id   uuid not null default auth.uid() references public.profiles on delete cascade,
  kind      text not null default 'A1',
  tot       int, sc jsonb, pass boolean,
  taken_at  timestamptz not null default now()
);

create table if not exists public.events (        -- telemetria
  id         bigserial primary key,
  user_id    uuid not null default auth.uid() references public.profiles on delete cascade,
  session_id uuid,
  ts         timestamptz not null,
  type       text not null,                       -- start | screen | hb | ans | end
  screen     text,
  lesson     int,
  data       jsonb
);
create index if not exists events_user_ts on public.events (user_id, ts);
create index if not exists games_user_at  on public.games  (user_id, played_at);
create index if not exists tests_user_at  on public.tests  (user_id, taken_at);

-- ---------- quem é admin ----------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

-- ---------- segurança: aluno só vê o que é dele; o professor vê tudo ----------
alter table public.classes  enable row level security;
alter table public.profiles enable row level security;
alter table public.progress enable row level security;
alter table public.games    enable row level security;
alter table public.tests    enable row level security;
alter table public.events   enable row level security;

drop policy if exists classes_admin on public.classes;
create policy classes_admin on public.classes for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
drop policy if exists profiles_admin_upd on public.profiles;
create policy profiles_admin_upd on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists profiles_admin_del on public.profiles;
create policy profiles_admin_del on public.profiles for delete to authenticated using (public.is_admin());

drop policy if exists progress_own on public.progress;
create policy progress_own on public.progress for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists progress_admin on public.progress;
create policy progress_admin on public.progress for select to authenticated using (public.is_admin());

do $$ declare t text; begin
  foreach t in array array['games','tests','events'] loop
    execute format('drop policy if exists %1$s_ins on public.%1$s', t);
    execute format('create policy %1$s_ins on public.%1$s for insert to authenticated with check (user_id = auth.uid())', t);
    execute format('drop policy if exists %1$s_read on public.%1$s', t);
    execute format('create policy %1$s_read on public.%1$s for select to authenticated using (user_id = auth.uid() or public.is_admin())', t);
  end loop;
end $$;

-- ---------- funções chamadas pelo jogo ----------
-- nome da turma a partir do código (o aluno ainda não está logado)
create or replace function public.class_name(p_code text) returns text
language sql stable security definer set search_path = public as $$
  select name from public.classes where upper(code) = upper(trim(p_code))
$$;

-- cria o perfil do aluno logo depois do cadastro
create or replace function public.register_student(p_code text, p_name text) returns void
language plpgsql security definer set search_path = public as $$
declare c uuid;
begin
  select id into c from public.classes where upper(code) = upper(trim(p_code));
  if c is null then raise exception 'turma_invalida'; end if;
  insert into public.profiles (id, class_id, display_name) values (auth.uid(), c, trim(p_name))
  on conflict (id) do update set class_id = excluded.class_id, display_name = excluded.display_name;
end $$;

-- cria o perfil do professor; a primeira conta que chamar vira admin
create or replace function public.register_teacher(p_name text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (auth.uid(), trim(p_name)) on conflict (id) do nothing;
  if not exists (select 1 from public.profiles where is_admin) then
    update public.profiles set is_admin = true where id = auth.uid();
  end if;
  return public.is_admin();
end $$;

-- contadores de escuta + último acesso
create or replace function public.sync_stats(p_tot int, p_ok int) returns void
language sql security definer set search_path = public as $$
  update public.profiles set ouv_tot = greatest(ouv_tot, p_tot), ouv_ok = greatest(ouv_ok, p_ok), last_seen = now() where id = auth.uid()
$$;

revoke all on function public.class_name(text), public.register_student(text,text), public.register_teacher(text), public.sync_stats(int,int) from public;
grant execute on function public.class_name(text) to anon, authenticated;
grant execute on function public.register_student(text,text), public.register_teacher(text), public.sync_stats(int,int), public.is_admin() to authenticated;

-- ---------- visões para o painel ----------
-- minutos por dia e por tela (1 batida de coração = 30 s com o app aberto)
create or replace view public.usage_daily with (security_invoker = on) as
  select user_id, (ts at time zone 'America/Sao_Paulo')::date as day, coalesce(screen, '?') as screen, count(*) * 0.5 as minutes
  from public.events where type = 'hb' group by 1, 2, 3;

-- itens que mais erram
create or replace view public.missed_items with (security_invoker = on) as
  select user_id, lesson, data->>'it' as item,
         count(*) filter (where (data->>'ok')::boolean is not true) as errors, count(*) as tries
  from public.events where type = 'ans' group by 1, 2, 3;

grant select on public.usage_daily, public.missed_items to authenticated;
grant select, insert, update, delete on public.classes, public.profiles, public.progress, public.games, public.tests, public.events to authenticated;
grant usage, select on all sequences in schema public to authenticated;
