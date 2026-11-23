-- =====================================================================
-- Phase 6: XP credited by the server, Vault Caches, streak freezes,
-- Elo mastery per skill and the generated exercise pool.
-- Additive only: no existing table, column or function changes behaviour.
-- Review, then apply with `npx supabase db push` (or the SQL editor).
-- =====================================================================

-- ---------- Streak freezes (at most 2 banked) ----------
alter table public.profiles
  add column if not exists streak_freezes smallint not null default 0
  check (streak_freezes between 0 and 2);

-- ---------- Vault Caches: one claim per cache per player ----------
create table if not exists public.vault_caches (
  user_id    uuid not null references auth.users(id) on delete cascade,
  cache_id   text not null check (cache_id ~ '^cache-[a-z0-9-]{2,40}$'),
  reward     text not null check (reward in ('xp', 'freeze')),
  opened_at  timestamptz not null default now(),
  primary key (user_id, cache_id)
);
alter table public.vault_caches enable row level security;
drop policy if exists vault_caches_own on public.vault_caches;
create policy vault_caches_own on public.vault_caches for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------- Landing demo XP: credited once per account ----------
create table if not exists public.demo_credits (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  amount     integer not null check (amount between 0 and 60),
  created_at timestamptz not null default now()
);
alter table public.demo_credits enable row level security;
drop policy if exists demo_credits_own on public.demo_credits;
create policy demo_credits_own on public.demo_credits for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------- Lesson XP: one credit per finished session ----------
create table if not exists public.lesson_credits (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  node_id     text not null,
  amount      integer not null check (amount between 0 and 400),
  local_date  date not null,
  created_at  timestamptz not null default now()
);
create index if not exists lesson_credits_user_day_idx on public.lesson_credits (user_id, local_date);
alter table public.lesson_credits enable row level security;
drop policy if exists lesson_credits_own on public.lesson_credits;
create policy lesson_credits_own on public.lesson_credits for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------- Mastery per skill (Elo) ----------
create table if not exists public.skill_mastery (
  user_id    uuid not null references auth.users(id) on delete cascade,
  skill      text not null check (skill ~ '^[a-z0-9-]{2,40}$'),
  rating     integer not null default 1000 check (rating between 400 and 2400),
  attempts   integer not null default 0 check (attempts >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, skill)
);
alter table public.skill_mastery enable row level security;
drop policy if exists skill_mastery_own on public.skill_mastery;
create policy skill_mastery_own on public.skill_mastery for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------- Generated exercises (written by the Edge Function only) ----------
create table if not exists public.exercise_pool (
  id           uuid primary key default gen_random_uuid(),
  template     text not null check (template ~ '^[a-z]+\.[a-z-]+$'),
  seed         bigint not null,
  difficulty   smallint not null check (difficulty between 1 and 5),
  skill        text not null,
  payload      jsonb not null,          -- prompt, data, question, options, brief (no answer)
  answer_index smallint not null check (answer_index between 0 and 3),
  source       text not null default 'template' check (source in ('template', 'gemini')),
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  unique (template, seed, difficulty)
);
create index if not exists exercise_pool_skill_idx on public.exercise_pool (skill, difficulty);
create index if not exists exercise_pool_creator_day_idx on public.exercise_pool (created_by, created_at);
alter table public.exercise_pool enable row level security;
-- No policy for players: they receive exercises through the Edge Function, never the answer column.

create table if not exists public.exercise_attempts (
  user_id     uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.exercise_pool(id) on delete cascade,
  choice      smallint not null check (choice between 0 and 3),
  correct     boolean not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, exercise_id)
);
alter table public.exercise_attempts enable row level security;
drop policy if exists exercise_attempts_own on public.exercise_attempts;
create policy exercise_attempts_own on public.exercise_attempts for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------- Helpers ----------
create or replace function public._local_today(p_user uuid)
returns date language sql stable security definer set search_path = '' as $$
  select (now() at time zone coalesce((select timezone from public.profiles where id = p_user), 'UTC'))::date
$$;

-- Adds points and a ledger line (amount > 0 only).
create or replace function public._credit_points(p_user uuid, p_amount integer, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_amount <= 0 then return; end if;
  update public.profiles set points = points + p_amount, updated_at = now() where id = p_user;
  insert into public.points_ledger (user_id, amount, reason, local_date)
  values (p_user, p_amount, p_reason, public._local_today(p_user));
end $$;

-- ---------- Lesson XP ----------
-- The server recomputes the amount from what it can check: a session saved in
-- the last 15 minutes for this node, 10 XP per correct answer (at most 12),
-- +25 for a 5-answer run, at most 400 XP of lessons per local day.
create or replace function public.credit_lesson_xp(p_node text, p_correct integer, p_best_run integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user   uuid := auth.uid();
  v_today  date;
  v_done   integer;
  v_amount integer;
  v_recent boolean;
begin
  if v_user is null then raise exception 'UNAUTHENTICATED'; end if;
  if p_node is null or p_node !~ '^[a-z0-9-]{2,40}$' then raise exception 'INVALID_NODE'; end if;
  v_today := public._local_today(v_user);

  if p_node = 'review' or p_node = 'drill' or p_node = 'mistakes' then
    v_recent := exists (select 1 from public.profiles where id = v_user and last_active_on = v_today);
  else
    v_recent := exists (select 1 from public.path_progress
                        where user_id = v_user and node_id = p_node and updated_at > now() - interval '15 minutes');
  end if;
  if not v_recent then raise exception 'NO_SESSION'; end if;

  -- One credit per node per 10 minutes (a double tap or a replayed request).
  if exists (select 1 from public.lesson_credits
             where user_id = v_user and node_id = p_node and created_at > now() - interval '10 minutes') then
    return jsonb_build_object('credited', 0, 'me', public.get_me());
  end if;

  select coalesce(sum(amount), 0) into v_done from public.lesson_credits where user_id = v_user and local_date = v_today;
  v_amount := least(greatest(coalesce(p_correct, 0), 0), 12) * 10
            + case when coalesce(p_best_run, 0) >= 5 then 25 else 0 end;
  v_amount := greatest(0, least(v_amount, 400 - v_done));

  insert into public.lesson_credits (user_id, node_id, amount, local_date) values (v_user, p_node, v_amount, v_today);
  perform public._credit_points(v_user, v_amount, 'lesson');
  return jsonb_build_object('credited', v_amount, 'me', public.get_me());
end $$;

-- ---------- Landing demo XP (once, within a day of sign-up, at most 60) ----------
create or replace function public.credit_demo_xp(p_xp integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user   uuid := auth.uid();
  v_amount integer := least(greatest(coalesce(p_xp, 0), 0), 60);
begin
  if v_user is null then raise exception 'UNAUTHENTICATED'; end if;
  if not exists (select 1 from auth.users where id = v_user and created_at > now() - interval '1 day') then
    return jsonb_build_object('credited', 0, 'reason', 'TOO_LATE');
  end if;
  insert into public.demo_credits (user_id, amount) values (v_user, v_amount) on conflict (user_id) do nothing;
  if not found then return jsonb_build_object('credited', 0, 'reason', 'ALREADY'); end if;
  perform public._credit_points(v_user, v_amount, 'demo');
  return jsonb_build_object('credited', v_amount, 'me', public.get_me());
end $$;

-- ---------- Vault Caches ----------
-- A cache sits after every third chapter (positions 2, 5, …); rewards
-- alternate +50 XP and a streak freeze. It opens once the chapter before it
-- has a star.
create or replace function public.claim_vault_cache(p_cache text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user   uuid := auth.uid();
  v_node   text;
  v_pos    integer;
  v_last   integer;
  v_reward text;
begin
  if v_user is null then raise exception 'UNAUTHENTICATED'; end if;
  if p_cache is null or p_cache !~ '^cache-[a-z0-9-]{2,40}$' then raise exception 'INVALID_CACHE'; end if;
  v_node := substr(p_cache, 7);

  select pos, last into v_pos, v_last from (
    select id, (row_number() over (order by sort, id) - 1)::integer as pos, (count(*) over () - 1)::integer as last
    from public.modules
  ) m where m.id = v_node;
  if v_pos is null or v_pos % 3 <> 2 or v_pos = v_last then raise exception 'INVALID_CACHE'; end if;
  if not exists (select 1 from public.path_progress where user_id = v_user and node_id = v_node and stars >= 1) then
    raise exception 'CACHE_LOCKED';
  end if;

  v_reward := case when (v_pos / 3) % 2 = 0 then 'xp' else 'freeze' end;
  insert into public.vault_caches (user_id, cache_id, reward) values (v_user, p_cache, v_reward)
  on conflict (user_id, cache_id) do nothing;
  if not found then
    return jsonb_build_object('credited', false, 'reward', v_reward, 'me', public.get_me());
  end if;

  if v_reward = 'xp' then
    perform public._credit_points(v_user, 50, 'cache');
  else
    update public.profiles set streak_freezes = least(streak_freezes + 1, 2), updated_at = now() where id = v_user;
  end if;
  return jsonb_build_object('credited', true, 'reward', v_reward, 'me', public.get_me());
end $$;

-- ---------- The desk: caches, freezes, mastery; spends a freeze if needed ----------
-- A freeze bridges exactly one missed day: active the day before yesterday,
-- not yesterday, a freeze in the bank → yesterday counts as active.
create or replace function public.get_desk()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user  uuid := auth.uid();
  v_today date;
  v_used  boolean := false;
begin
  if v_user is null then raise exception 'UNAUTHENTICATED'; end if;
  v_today := public._local_today(v_user);
  update public.profiles
     set streak_freezes = streak_freezes - 1, last_active_on = v_today - 1, updated_at = now()
   where id = v_user and streak_freezes > 0 and streak_current > 0 and last_active_on = v_today - 2;
  v_used := found;
  return jsonb_build_object(
    'caches', coalesce((select jsonb_agg(cache_id order by opened_at) from public.vault_caches where user_id = v_user), '[]'::jsonb),
    'freezes', (select streak_freezes from public.profiles where id = v_user),
    'freeze_used', v_used,
    'mastery', coalesce((select jsonb_object_agg(skill, jsonb_build_object('rating', rating, 'attempts', attempts))
                         from public.skill_mastery where user_id = v_user), '{}'::jsonb));
end $$;

-- ---------- Generated exercises: quota and attempts (service role only) ----------
-- Per-tier daily quota of new generated exercises; pool reuse is free.
create or replace function public.begin_generation(p_user uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_tier  public.plan_tier := public.user_tier(p_user);
  v_limit integer := case v_tier when 'free' then 0 when 'core' then 20 when 'pro' then 60 else 200 end;
  v_used  integer;
begin
  select count(*) into v_used from public.exercise_pool
   where created_by = p_user and created_at > now() - interval '1 day';
  return jsonb_build_object('allowed', v_used < v_limit, 'remaining', greatest(v_limit - v_used, 0), 'tier', v_tier,
    'rating', coalesce((select jsonb_object_agg(skill, rating) from public.skill_mastery where user_id = p_user), '{}'::jsonb));
end $$;

-- Records an answer checked by the Edge Function, moves the Elo rating and
-- credits 10 XP for a first right answer (at most 150 XP a day from this source).
create or replace function public.record_exercise_attempt(p_user uuid, p_exercise uuid, p_choice integer, p_correct boolean, p_rating integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_skill  text;
  v_today  date := public._local_today(p_user);
  v_done   integer;
  v_amount integer := 0;
begin
  select skill into v_skill from public.exercise_pool where id = p_exercise;
  if v_skill is null then raise exception 'NOT_FOUND'; end if;
  insert into public.exercise_attempts (user_id, exercise_id, choice, correct) values (p_user, p_exercise, p_choice, p_correct)
  on conflict (user_id, exercise_id) do nothing;
  if not found then return jsonb_build_object('repeat', true, 'credited', 0); end if;

  insert into public.skill_mastery (user_id, skill, rating, attempts) values (p_user, v_skill, p_rating, 1)
  on conflict (user_id, skill) do update set rating = excluded.rating, attempts = public.skill_mastery.attempts + 1, updated_at = now();

  if p_correct then
    select coalesce(sum(amount), 0) into v_done from public.points_ledger
     where user_id = p_user and local_date = v_today and reason = 'exercise';
    v_amount := greatest(0, least(10, 150 - v_done));
    perform public._credit_points(p_user, v_amount, 'exercise');
  end if;
  return jsonb_build_object('repeat', false, 'credited', v_amount);
end $$;

-- ---------- Grants ----------
revoke execute on function public._local_today(uuid), public._credit_points(uuid, integer, text),
  public.credit_lesson_xp(text, integer, integer), public.credit_demo_xp(integer), public.claim_vault_cache(text),
  public.get_desk(), public.begin_generation(uuid), public.record_exercise_attempt(uuid, uuid, integer, boolean, integer)
  from public, anon, authenticated;

-- Supabase grants new tables to anon/authenticated by default: take that back first.
revoke all on public.vault_caches, public.demo_credits, public.lesson_credits, public.skill_mastery,
  public.exercise_pool, public.exercise_attempts from anon, authenticated;
revoke all on sequence public.lesson_credits_id_seq from anon, authenticated;

grant select on public.vault_caches, public.demo_credits, public.lesson_credits, public.skill_mastery, public.exercise_attempts to authenticated;
grant execute on function public.credit_lesson_xp(text, integer, integer) to authenticated;
grant execute on function public.credit_demo_xp(integer)                  to authenticated;
grant execute on function public.claim_vault_cache(text)                  to authenticated;
grant execute on function public.get_desk()                               to authenticated;
grant execute on function public.begin_generation(uuid)                   to service_role;
grant execute on function public.record_exercise_attempt(uuid, uuid, integer, boolean, integer) to service_role;
