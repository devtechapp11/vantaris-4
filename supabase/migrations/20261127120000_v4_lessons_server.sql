-- =====================================================================
-- V4 « Midas »: lessons graded answer by answer on the server.
-- generate-exercise (mode 'lesson') stores each item's KEY here and returns
-- only the public payload; submit-answer grades from the key, idempotently
-- by attemptId, computes the combo over the session and credits XP.
-- Also: streaks on the player's local date with earned freezes, and the
-- limits for anonymous players (onboarding).
-- Additive only. Review, then apply with `npx supabase db push`.
-- Depends on 20261123120000_phase6_server_xp.sql (_local_today, _credit_points).
-- =====================================================================

create table if not exists public.lesson_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  skill       text not null check (skill ~ '^[a-z0-9-]{2,40}$'),
  seed        bigint not null,
  local_date  date not null,
  -- First lesson of the player's local day, on a streak milestone: Midas State from the start.
  midas_day   boolean not null default false,
  started_at  timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists lesson_sessions_user_day_idx on public.lesson_sessions (user_id, local_date);
alter table public.lesson_sessions enable row level security;
drop policy if exists lesson_sessions_own on public.lesson_sessions;
create policy lesson_sessions_own on public.lesson_sessions for select to authenticated
  using (user_id = (select auth.uid()));

-- Keys live here and nowhere else: no player policy, the Edge Functions use the service role.
create table if not exists public.lesson_items (
  session_id  uuid not null references public.lesson_sessions(id) on delete cascade,
  exercise_id text not null check (exercise_id ~ '^[a-z0-9-]{1,64}$'),
  position    smallint not null check (position between 0 and 9),
  pub         jsonb not null,
  key         jsonb not null,
  brief       jsonb not null,
  base_xp     smallint not null check (base_xp between 0 and 20),
  primary key (session_id, exercise_id)
);
alter table public.lesson_items enable row level security;

create table if not exists public.lesson_answers (
  attempt_id  uuid primary key,
  session_id  uuid not null references public.lesson_sessions(id) on delete cascade,
  exercise_id text not null,
  user_id     uuid not null references auth.users(id) on delete cascade,
  correct     boolean not null,
  combo       integer not null check (combo >= 0),
  multiplier  smallint not null check (multiplier in (1, 2, 3, 5)),
  xp          integer not null check (xp between 0 and 200),
  stars       smallint check (stars between 0 and 3),
  created_at  timestamptz not null default now(),
  unique (session_id, exercise_id)
);
alter table public.lesson_answers enable row level security;
drop policy if exists lesson_answers_own on public.lesson_answers;
create policy lesson_answers_own on public.lesson_answers for select to authenticated
  using (user_id = (select auth.uid()));

-- Streak milestones (7, 14, 30, 50, 100…): the day's first lesson starts in Midas State.
create or replace function public._is_milestone(p_streak integer)
returns boolean language sql immutable set search_path = '' as $$
  select p_streak in (7, 14, 30, 50, 100, 150, 200, 365) or (p_streak > 365 and p_streak % 100 = 0);
$$;

-- Opens a session. Anonymous players (onboarding) get at most 3 lessons a day.
create or replace function public.begin_lesson(p_user uuid, p_skill text, p_seed bigint, p_anonymous boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_today  date := public._local_today(p_user);
  v_count  integer;
  v_streak integer;
  v_last   date;
  v_id     uuid;
begin
  select count(*) into v_count from public.lesson_sessions where user_id = p_user and local_date = v_today;
  if p_anonymous and v_count >= 3 then
    return jsonb_build_object('allowed', false, 'reason', 'ANON_LIMIT');
  end if;
  select streak_current, last_active_on into v_streak, v_last from public.profiles where id = p_user;
  insert into public.lesson_sessions (user_id, skill, seed, local_date, midas_day)
  values (p_user, p_skill, p_seed, v_today,
          v_count = 0 and v_last = v_today - 1 and public._is_milestone(coalesce(v_streak, 0) + 1))
  returning id into v_id;
  return jsonb_build_object('allowed', true, 'session_id', v_id,
    'midas_day', (select midas_day from public.lesson_sessions where id = v_id));
end $$;

-- Records one graded answer. Idempotent: the same attemptId (or a second answer
-- to the same exercise) returns the stored result and credits nothing.
create or replace function public.record_lesson_answer(
  p_user uuid, p_session uuid, p_exercise text, p_attempt uuid, p_correct boolean, p_base integer, p_stars integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_sess   public.lesson_sessions;
  v_prev   public.lesson_answers;
  v_run    integer := 0;
  v_combo  integer;
  v_mult   integer;
  v_xp     integer;
  v_done   integer;
  r        record;
begin
  select * into v_sess from public.lesson_sessions where id = p_session and user_id = p_user for update;
  if not found then raise exception 'NO_SESSION'; end if;

  select * into v_prev from public.lesson_answers
   where attempt_id = p_attempt or (session_id = p_session and exercise_id = p_exercise) limit 1;
  if found then
    return jsonb_build_object('repeat', true, 'correct', v_prev.correct, 'combo', v_prev.combo,
      'multiplier', v_prev.multiplier, 'xp', 0, 'stars', v_prev.stars, 'midas_day', v_sess.midas_day);
  end if;

  -- The run: right answers in a row, most recent first, within this session.
  for r in select correct from public.lesson_answers where session_id = p_session order by created_at desc loop
    exit when not r.correct;
    v_run := v_run + 1;
  end loop;
  v_combo := case when p_correct then v_run + 1 else 0 end;
  v_mult  := case when v_combo >= 8 then 5 when v_combo >= 5 then 3 when v_combo >= 3 then 2 else 1 end;
  v_xp    := case when p_correct then greatest(0, least(p_base, 20)) * v_mult else 0 end;

  -- Same daily cap as lesson credits (400 XP a day from lessons).
  select coalesce(sum(amount), 0) into v_done from public.lesson_credits where user_id = p_user and local_date = v_sess.local_date;
  v_xp := greatest(0, least(v_xp, 400 - v_done));

  insert into public.lesson_answers (attempt_id, session_id, exercise_id, user_id, correct, combo, multiplier, xp, stars)
  values (p_attempt, p_session, p_exercise, p_user, p_correct, v_combo, v_mult, v_xp, p_stars);
  if v_xp > 0 then
    insert into public.lesson_credits (user_id, node_id, amount, local_date) values (p_user, 'lesson-' || v_sess.skill, v_xp, v_sess.local_date);
    perform public._credit_points(p_user, v_xp, 'lesson');
  end if;
  return jsonb_build_object('repeat', false, 'correct', p_correct, 'combo', v_combo, 'multiplier', v_mult,
    'xp', v_xp, 'stars', p_stars, 'midas_day', v_sess.midas_day);
end $$;

-- A finished lesson counts as the day for the streak (player's local date).
-- Freezes are earned (+1 at every 7-day milestone, 2 banked at most) and
-- applied automatically when exactly one day was missed. Never sold.
create or replace function public.finish_lesson(p_user uuid, p_session uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_sess    public.lesson_sessions;
  v_prof    public.profiles;
  v_today   date;
  v_streak  integer;
  v_freezes integer;
  v_used    boolean := false;
begin
  select * into v_sess from public.lesson_sessions where id = p_session and user_id = p_user for update;
  if not found then raise exception 'NO_SESSION'; end if;
  if v_sess.finished_at is not null then
    return jsonb_build_object('repeat', true);
  end if;
  update public.lesson_sessions set finished_at = now() where id = p_session;

  select * into v_prof from public.profiles where id = p_user for update;
  v_today := v_sess.local_date;
  v_freezes := v_prof.streak_freezes;
  v_streak := case
    when v_prof.last_active_on = v_today then greatest(v_prof.streak_current, 1)
    when v_prof.last_active_on = v_today - 1 then v_prof.streak_current + 1
    when v_prof.last_active_on = v_today - 2 and v_freezes > 0 then v_prof.streak_current + 1
    else 1 end;
  if v_prof.last_active_on = v_today - 2 and v_freezes > 0 then
    v_freezes := v_freezes - 1;
    v_used := true;
  end if;
  if v_streak > coalesce(v_prof.streak_current, 0) and v_streak % 7 = 0 then
    v_freezes := least(2, v_freezes + 1);
  end if;
  update public.profiles
     set streak_current = v_streak, streak_best = greatest(streak_best, v_streak),
         last_active_on = v_today, streak_freezes = v_freezes
   where id = p_user;
  return jsonb_build_object('repeat', false, 'streak', v_streak, 'freezes', v_freezes, 'freeze_used', v_used);
end $$;

revoke all on function public.begin_lesson(uuid, text, bigint, boolean), public.record_lesson_answer(uuid, uuid, text, uuid, boolean, integer, integer),
  public.finish_lesson(uuid, uuid), public._is_milestone(integer) from public, anon, authenticated;
revoke all on public.lesson_sessions, public.lesson_items, public.lesson_answers from anon, authenticated;
grant select on public.lesson_sessions, public.lesson_answers to authenticated;
grant execute on function public.begin_lesson(uuid, text, bigint, boolean) to service_role;
grant execute on function public.record_lesson_answer(uuid, uuid, text, uuid, boolean, integer, integer) to service_role;
grant execute on function public.finish_lesson(uuid, uuid) to service_role;

-- ---------- Anonymous players (onboarding) ----------
-- Anonymous users have the `authenticated` role; the JWT's is_anonymous claim
-- keeps them off the leaderboard and out of checkout until they link an account.
create or replace function public._is_anonymous()
returns boolean language sql stable set search_path = '' as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
$$;
-- Apply these guards inside get_leaderboard() and the billing Edge Function
-- (see docs/redesign/PROGRESS.md « Manual actions »): `if public._is_anonymous() then … end if;`
