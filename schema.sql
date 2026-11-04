-- =====================================================================
--  VANTARIS · Supabase database
--  Paste this whole file into Supabase → SQL Editor → New query → Run.
--
--  Safe to run again later: it updates functions, security rules and
--  practice content without touching user data. The only thing it ever
--  deletes is the first-prototype "profiles" and "deal_history" tables.
--
--  Security model, in one paragraph:
--  The browser can READ only its own rows and the public catalog, and it
--  can WRITE nothing directly. Every change goes through a function below
--  that validates input and runs the game rules on the server (scoring,
--  weekly quota, streaks, plan limits). Payments and subscriptions can only
--  be written by the Edge Functions using the service role, after Razorpay
--  signatures are verified. Answers and solutions never leave the database
--  until the player has submitted.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 0. Remove first-prototype tables (only if the old shape is present)
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'profiles' and column_name = 'rank') then
    drop table public.profiles cascade;
  end if;
end $$;
drop table if exists public.deal_history cascade;
drop function if exists public.update_updated_at() cascade;

-- ---------------------------------------------------------------------
-- 1. Types
-- ---------------------------------------------------------------------
do $$ begin
  create type public.plan_tier as enum ('free', 'core', 'pro', 'elite');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.career_level as enum ('Analyst', 'Associate', 'VP', 'MD');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.billing_interval as enum ('monthly', 'yearly');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.subscription_status as enum
    ('created', 'authenticated', 'active', 'pending', 'halted', 'cancelled', 'completed', 'expired', 'paused');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------

-- What each plan tier unlocks. Edit limits here, then re-run the file.
create table if not exists public.tiers (
  id                    public.plan_tier primary key,
  name                  text not null,
  rank                  smallint not null unique,
  weekly_problem_limit  integer check (weekly_problem_limit is null or weekly_problem_limit >= 0), -- null = unlimited
  max_level             public.career_level not null,
  full_walkthroughs     boolean not null default false,
  tutor_daily_limit     integer not null default 0 check (tutor_daily_limit >= 0),
  tagline               text not null,
  features              text[] not null default '{}'
);

-- What people can buy. Amounts are in the smallest currency unit (paise for INR).
-- razorpay_plan_id_* are filled automatically by the billing Edge Function the
-- first time someone checks out (test and live keys get separate plans).
create table if not exists public.plans (
  id                     text primary key check (id ~ '^[a-z_]{3,40}$'),
  tier                   public.plan_tier not null references public.tiers(id),
  interval               public.billing_interval not null,
  amount                 integer not null check (amount >= 100),
  currency               text not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  razorpay_plan_id_test  text check (razorpay_plan_id_test is null or razorpay_plan_id_test ~ '^plan_[A-Za-z0-9]+$'),
  razorpay_plan_id_live  text check (razorpay_plan_id_live is null or razorpay_plan_id_live ~ '^plan_[A-Za-z0-9]+$'),
  active                 boolean not null default true,
  sort                   smallint not null default 0,
  updated_at             timestamptz not null default now(),
  unique (tier, interval),
  check (tier <> 'free')
);

create table if not exists public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  display_name     text not null default 'Analyst'
                   check (char_length(display_name) between 1 and 40
                          and display_name = btrim(display_name)
                          and display_name !~ '[[:cntrl:]]'),
  school           text check (school is null or (char_length(school) between 1 and 80
                                                  and school = btrim(school)
                                                  and school !~ '[[:cntrl:]]')),
  goal             text check (goal is null or goal in ('ib', 'pe', 'consulting', 'self')),
  timezone         text not null default 'UTC',
  onboarded        boolean not null default false,
  points           integer not null default 0 check (points >= 0),
  solved_count     integer not null default 0 check (solved_count >= 0),
  attempted_count  integer not null default 0 check (attempted_count >= 0),
  streak_current   integer not null default 0 check (streak_current >= 0),
  streak_best      integer not null default 0 check (streak_best >= 0),
  last_active_on   date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Razorpay creates the customer when the first payment is authorised;
-- we record its id here as soon as Razorpay tells us.
create table if not exists public.billing_customers (
  user_id               uuid primary key references auth.users(id) on delete cascade,
  razorpay_customer_id  text not null unique check (razorpay_customer_id ~ '^cust_[A-Za-z0-9]+$'),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- One row per Razorpay subscription. Kept after account deletion (user_id
-- becomes null) because payment history is an accounting record.
create table if not exists public.subscriptions (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid references auth.users(id) on delete set null,
  plan_id                   text not null references public.plans(id),
  tier                      public.plan_tier not null,
  razorpay_subscription_id  text not null unique check (razorpay_subscription_id ~ '^sub_[A-Za-z0-9]+$'),
  razorpay_plan_id          text not null,
  razorpay_customer_id      text,
  status                    public.subscription_status not null default 'created',
  current_start             timestamptz,
  current_end               timestamptz,
  ended_at                  timestamptz,
  cancel_at_cycle_end       boolean not null default false,
  paid_count                integer not null default 0,
  short_url                 text,
  livemode                  boolean not null,
  last_event_at             timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
create index if not exists subscriptions_user_status_idx on public.subscriptions (user_id, status);

create table if not exists public.payments (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid references auth.users(id) on delete set null,
  subscription_id           uuid references public.subscriptions(id) on delete set null,
  razorpay_payment_id       text not null unique check (razorpay_payment_id ~ '^pay_[A-Za-z0-9]+$'),
  razorpay_subscription_id  text,
  razorpay_invoice_id       text,
  razorpay_order_id         text,
  amount                    integer not null check (amount >= 0),
  amount_refunded           integer not null default 0 check (amount_refunded >= 0),
  currency                  text not null,
  status                    text not null check (status in ('created', 'authorized', 'captured', 'refunded', 'failed')),
  method                    text,
  card_network              text,
  card_last4                text check (card_last4 is null or card_last4 ~ '^[0-9]{4}$'),
  bank                      text,
  wallet                    text,
  error_code                text,
  error_description         text,
  livemode                  boolean not null,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
create index if not exists payments_user_idx on public.payments (user_id, created_at desc);

-- Every webhook Razorpay sends, keyed by its event id, so a retried
-- delivery is never applied twice. Not readable by any user.
create table if not exists public.webhook_events (
  id            text primary key,
  event         text not null,
  payload       jsonb not null,
  received_at   timestamptz not null default now(),
  processed_at  timestamptz,
  attempts      integer not null default 1,
  error         text
);

-- Practice content
create table if not exists public.modules (
  id       text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  name     text not null,
  short    text not null,
  level    public.career_level not null,
  blurb    text not null,
  sort     smallint not null default 0
);

create table if not exists public.problems (
  id          text primary key check (id ~ '^[a-z0-9-]{2,60}$'),
  module_id   text not null references public.modules(id),
  difficulty  smallint not null check (difficulty between 1 and 5),
  minutes     smallint not null check (minutes between 1 and 60),
  title       text not null,
  kind        text not null,
  scenario    text not null,
  data        jsonb not null check (jsonb_typeof(data) = 'array'),
  question    text not null,
  options     jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 6),
  answer      text not null,                      -- hidden from the browser
  steps       jsonb not null check (jsonb_typeof(steps) = 'array'),  -- hidden until submitted
  concept     text not null,                      -- hidden until submitted
  formula     text not null,                      -- hidden until submitted
  hints       jsonb not null default '[]',        -- only used by the AI tutor
  published   boolean not null default true,
  sort        smallint not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists problems_module_idx on public.problems (module_id, sort);

-- One scored attempt per player per problem. Opening a problem starts the
-- clock and (on the free plan) uses one of the week's problems.
create table if not exists public.problem_attempts (
  user_id       uuid not null references auth.users(id) on delete cascade,
  problem_id    text not null references public.problems(id) on delete cascade,
  opened_at     timestamptz not null default now(),
  week_start    date not null,
  submitted_at  timestamptz,
  choice        text,
  correct       boolean,
  points        integer not null default 0 check (points >= 0),
  time_ratio    numeric(4, 3),
  primary key (user_id, problem_id)
);
create index if not exists problem_attempts_week_idx on public.problem_attempts (user_id, week_start);
create index if not exists problem_attempts_submitted_idx on public.problem_attempts (user_id, submitted_at desc);

-- Every point ever earned. Powers weekly/monthly rankings and the 7-day chart.
create table if not exists public.points_ledger (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  amount      integer not null check (amount > 0),
  reason      text not null,
  problem_id  text references public.problems(id) on delete set null,
  local_date  date not null,
  created_at  timestamptz not null default now()
);
create index if not exists points_ledger_user_idx on public.points_ledger (user_id, local_date);
create index if not exists points_ledger_time_idx on public.points_ledger (created_at, user_id);

-- AI tutor messages, for the daily limits.
create table if not exists public.ai_usage (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  feature     text not null default 'tutor',
  problem_id  text references public.problems(id) on delete set null,
  local_date  date not null,
  created_at  timestamptz not null default now()
);
create index if not exists ai_usage_user_day_idx on public.ai_usage (user_id, local_date);

-- ---------------------------------------------------------------------
-- 3. Small helpers
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['plans', 'profiles', 'billing_customers', 'subscriptions', 'payments', 'problems'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I
                    for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

create or replace function public._clean_text(p text, p_max integer)
returns text language sql immutable set search_path = '' as $$
  select nullif(btrim(left(btrim(regexp_replace(coalesce(p, ''), '[[:cntrl:]]', '', 'g')), p_max)), '')
$$;

create or replace function public.level_for_points(p_points integer)
returns public.career_level language sql immutable set search_path = '' as $$
  select (case when p_points >= 751 then 'MD'
               when p_points >= 501 then 'VP'
               when p_points >= 251 then 'Associate'
               else 'Analyst' end)::public.career_level
$$;

create or replace function public._level_floor(p_level public.career_level)
returns integer language sql immutable set search_path = '' as $$
  select case p_level when 'Analyst' then 0 when 'Associate' then 251 when 'VP' then 501 else 751 end
$$;

create or replace function public._local_date(p_user uuid)
returns date language sql stable security definer set search_path = '' as $$
  select (now() at time zone coalesce((select timezone from public.profiles where id = p_user), 'UTC'))::date
$$;

-- The plan tier a player currently has access to. Pending (a renewal is
-- being retried) keeps access; halted, cancelled and paused do not.
create or replace function public.user_tier(p_user uuid)
returns public.plan_tier language sql stable security definer set search_path = '' as $$
  select coalesce((
    select s.tier
    from public.subscriptions s
    where s.user_id = p_user
      and s.status in ('active', 'authenticated', 'pending')
      and (s.current_end is null or s.current_end > now() - interval '3 days')
      and (s.status <> 'authenticated' or s.updated_at > now() - interval '2 days')
    order by s.tier desc
    limit 1
  ), 'free'::public.plan_tier)
$$;

create or replace function public._ensure_profile(p_user uuid)
returns void language sql security definer set search_path = '' as $$
  insert into public.profiles (id) values (p_user) on conflict (id) do nothing
$$;

-- New sign-ups get a profile automatically.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(public._clean_text(new.raw_user_meta_data ->> 'display_name', 40), 'Analyst'))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Profiles for anyone who signed up before this file was run.
insert into public.profiles (id, display_name)
select u.id, coalesce(public._clean_text(u.raw_user_meta_data ->> 'display_name', 40), 'Analyst')
from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 4. Functions the app calls (signed-in players only)
-- ---------------------------------------------------------------------

-- Update name, school, goal, time zone. Pass null to leave a field as is;
-- pass '' as school to remove it.
create or replace function public.save_profile(
  p_display_name text default null,
  p_school text default null,
  p_goal text default null,
  p_timezone text default null,
  p_complete_onboarding boolean default false
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_name text;
begin
  if v_user is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;
  perform public._ensure_profile(v_user);

  if p_display_name is not null then
    v_name := public._clean_text(p_display_name, 40);
    if v_name is null then raise exception 'INVALID_NAME' using errcode = '22023'; end if;
    update public.profiles set display_name = v_name where id = v_user;
  end if;

  if p_school is not null then
    update public.profiles set school = public._clean_text(p_school, 80) where id = v_user;
  end if;

  if p_goal is not null then
    if p_goal not in ('ib', 'pe', 'consulting', 'self') then
      raise exception 'INVALID_GOAL' using errcode = '22023';
    end if;
    update public.profiles set goal = p_goal where id = v_user;
  end if;

  if p_timezone is not null then
    if not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then
      raise exception 'INVALID_TIMEZONE' using errcode = '22023';
    end if;
    update public.profiles set timezone = p_timezone where id = v_user;
  end if;

  if p_complete_onboarding then
    update public.profiles set onboarded = true where id = v_user;
  end if;

  return public.get_me();
end $$;

-- Result payload for a submitted attempt. Free players see the first two steps.
create or replace function public._result_payload(
  p_attempt public.problem_attempts, p_problem public.problems, p_full boolean
) returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'choice',        p_attempt.choice,
    'correct',       p_attempt.correct,
    'points',        p_attempt.points,
    'time_ratio',    p_attempt.time_ratio,
    'submitted_at',  p_attempt.submitted_at,
    'answer',        p_problem.answer,
    'answer_label',  (select o ->> 'label' from jsonb_array_elements(p_problem.options) o
                      where o ->> 'id' = p_problem.answer limit 1),
    'choice_label',  (select o ->> 'label' from jsonb_array_elements(p_problem.options) o
                      where o ->> 'id' = p_attempt.choice limit 1),
    'steps',         case when p_full then p_problem.steps
                          else coalesce((select jsonb_agg(s order by i)
                                         from jsonb_array_elements(p_problem.steps) with ordinality as x(s, i)
                                         where i <= 2), '[]'::jsonb) end,
    'steps_total',   jsonb_array_length(p_problem.steps),
    'steps_locked',  not p_full and jsonb_array_length(p_problem.steps) > 2,
    'concept',       p_problem.concept,
    'formula',       p_problem.formula
  )
$$;

-- Open a problem: checks plan level and weekly quota, starts the clock,
-- and returns the question. Options come back in a per-player order.
create or replace function public.open_problem(p_problem_id text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user     uuid := auth.uid();
  v_problem  public.problems;
  v_module   public.modules;
  v_tier     public.tiers;
  v_attempt  public.problem_attempts;
  v_week     date;
  v_used     integer;
begin
  if v_user is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;
  perform public._ensure_profile(v_user);

  select * into v_problem from public.problems where id = p_problem_id and published;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  select * into v_module from public.modules where id = v_problem.module_id;
  select * into v_tier from public.tiers where id = public.user_tier(v_user);

  select * into v_attempt from public.problem_attempts
  where user_id = v_user and problem_id = p_problem_id;

  if not found then
    if v_module.level > v_tier.max_level then
      raise exception 'LEVEL_LOCKED' using errcode = 'P0001', detail = v_module.level::text;
    end if;

    v_week := date_trunc('week', public._local_date(v_user))::date;

    if v_tier.weekly_problem_limit is not null then
      -- Serialise this player's opens so two tabs can't both take the last slot.
      perform pg_advisory_xact_lock(hashtextextended('open:' || v_user::text, 0));
      select count(*) into v_used from public.problem_attempts
      where user_id = v_user and week_start = v_week;
      if v_used >= v_tier.weekly_problem_limit then
        raise exception 'QUOTA_REACHED' using errcode = 'P0001';
      end if;
    end if;

    insert into public.problem_attempts (user_id, problem_id, week_start)
    values (v_user, p_problem_id, v_week)
    on conflict (user_id, problem_id) do nothing;

    select * into v_attempt from public.problem_attempts
    where user_id = v_user and problem_id = p_problem_id;
  elsif v_attempt.submitted_at is null and v_module.level > v_tier.max_level then
    -- Opened while subscribed, plan has since ended.
    raise exception 'LEVEL_LOCKED' using errcode = 'P0001', detail = v_module.level::text;
  end if;

  return jsonb_build_object(
    'problem', jsonb_build_object(
      'id', v_problem.id,
      'module_id', v_module.id,
      'module_name', v_module.name,
      'level', v_module.level,
      'difficulty', v_problem.difficulty,
      'minutes', v_problem.minutes,
      'title', v_problem.title,
      'kind', v_problem.kind,
      'scenario', v_problem.scenario,
      'data', v_problem.data,
      'question', v_problem.question,
      'options', (select jsonb_agg(o order by md5(v_user::text || v_problem.id || (o ->> 'id')))
                  from jsonb_array_elements(v_problem.options) o)
    ),
    'opened_at', v_attempt.opened_at,
    'server_now', now(),
    'result', case when v_attempt.submitted_at is null then null
                   else public._result_payload(v_attempt, v_problem, v_tier.full_walkthroughs) end
  );
end $$;

-- Submit an answer. Scored once: 10 × difficulty, up to +50% for speed.
create or replace function public.submit_answer(p_problem_id text, p_choice text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user     uuid := auth.uid();
  v_problem  public.problems;
  v_module   public.modules;
  v_tier     public.tiers;
  v_attempt  public.problem_attempts;
  v_profile  public.profiles;
  v_ratio    numeric;
  v_correct  boolean;
  v_points   integer;
  v_today    date;
  v_streak   integer;
  v_before   public.career_level;
  v_after    public.career_level;
begin
  if v_user is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;

  select * into v_attempt from public.problem_attempts
  where user_id = v_user and problem_id = p_problem_id
  for update;
  if not found then raise exception 'NOT_OPENED' using errcode = 'P0001'; end if;

  select * into v_problem from public.problems where id = p_problem_id;
  select * into v_module from public.modules where id = v_problem.module_id;
  select * into v_tier from public.tiers where id = public.user_tier(v_user);

  if v_attempt.submitted_at is not null then
    return jsonb_build_object(
      'already_submitted', true,
      'result', public._result_payload(v_attempt, v_problem, v_tier.full_walkthroughs),
      'me', public.get_me());
  end if;

  if v_module.level > v_tier.max_level then
    raise exception 'LEVEL_LOCKED' using errcode = 'P0001', detail = v_module.level::text;
  end if;

  if not exists (select 1 from jsonb_array_elements(v_problem.options) o where o ->> 'id' = p_choice) then
    raise exception 'INVALID_CHOICE' using errcode = '22023';
  end if;

  v_ratio   := greatest(0, least(1, 1 - extract(epoch from (now() - v_attempt.opened_at)) / (v_problem.minutes * 60.0)));
  v_correct := (p_choice = v_problem.answer);
  v_points  := case when v_correct then round(10 * v_problem.difficulty * (1 + 0.5 * v_ratio))::integer else 0 end;

  update public.problem_attempts
  set submitted_at = now(), choice = p_choice, correct = v_correct,
      points = v_points, time_ratio = round(v_ratio, 3)
  where user_id = v_user and problem_id = p_problem_id
  returning * into v_attempt;

  select * into v_profile from public.profiles where id = v_user for update;
  v_today  := (now() at time zone v_profile.timezone)::date;
  v_streak := case
                when v_profile.last_active_on = v_today then greatest(v_profile.streak_current, 1)
                when v_profile.last_active_on = v_today - 1 then v_profile.streak_current + 1
                else 1
              end;
  v_before := public.level_for_points(v_profile.points);

  update public.profiles
  set points          = points + v_points,
      attempted_count = attempted_count + 1,
      solved_count    = solved_count + (case when v_correct then 1 else 0 end),
      streak_current  = v_streak,
      streak_best     = greatest(streak_best, v_streak),
      last_active_on  = v_today
  where id = v_user
  returning * into v_profile;

  if v_points > 0 then
    insert into public.points_ledger (user_id, amount, reason, problem_id, local_date)
    values (v_user, v_points, 'problem', p_problem_id, v_today);
  end if;

  v_after := public.level_for_points(v_profile.points);

  return jsonb_build_object(
    'already_submitted', false,
    'result', public._result_payload(v_attempt, v_problem, v_tier.full_walkthroughs),
    'level_up', case when v_after > v_before then v_after else null end,
    'me', public.get_me());
end $$;

-- Everything the app needs about the signed-in player, in one call.
create or replace function public.get_me()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_user      uuid := auth.uid();
  v_profile   public.profiles;
  v_tier      public.tiers;
  v_today     date;
  v_week      date;
  v_used      integer;
  v_tutor     integer;
  v_level     public.career_level;
  v_next      public.career_level;
  v_daily     text;
  v_sub       public.subscriptions;
  v_plan      public.plans;
  v_pay       public.payments;
  v_streak    integer;
begin
  if v_user is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;

  select * into v_profile from public.profiles where id = v_user;
  if not found then
    -- Read-only function: fall back to a blank profile shape.
    v_profile.id := v_user; v_profile.display_name := 'Analyst'; v_profile.timezone := 'UTC';
    v_profile.points := 0; v_profile.solved_count := 0; v_profile.attempted_count := 0;
    v_profile.streak_current := 0; v_profile.streak_best := 0; v_profile.onboarded := false;
  end if;

  select * into v_tier from public.tiers where id = public.user_tier(v_user);
  v_today := (now() at time zone v_profile.timezone)::date;
  v_week  := date_trunc('week', v_today)::date;

  select count(*) into v_used from public.problem_attempts where user_id = v_user and week_start = v_week;
  select count(*) into v_tutor from public.ai_usage where user_id = v_user and local_date = v_today and feature = 'tutor';

  v_level := public.level_for_points(v_profile.points);
  v_next  := case v_level when 'Analyst' then 'Associate' when 'Associate' then 'VP' when 'VP' then 'MD' else null end;
  v_streak := case when v_profile.last_active_on >= v_today - 1 then v_profile.streak_current else 0 end;

  -- Daily deal: stable for the day, picked from problems this player can open
  -- and hasn't finished before today.
  select p.id into v_daily
  from public.problems p
  join public.modules m on m.id = p.module_id
  left join public.problem_attempts a on a.user_id = v_user and a.problem_id = p.id
  where p.published and m.level <= v_tier.max_level
  order by (a.submitted_at is not null and (a.submitted_at at time zone v_profile.timezone)::date < v_today),
           md5(p.id || v_today::text)
  limit 1;

  -- Subscription to show on the profile: the live one, else the latest.
  select * into v_sub from public.subscriptions s
  where s.user_id = v_user and s.status <> 'created'
  order by (s.status in ('active', 'authenticated', 'pending')) desc, s.created_at desc
  limit 1;
  if found then
    select * into v_plan from public.plans where id = v_sub.plan_id;
    select * into v_pay from public.payments
    where user_id = v_user and status in ('captured', 'authorized', 'refunded')
    order by created_at desc limit 1;
  end if;

  return jsonb_build_object(
    'profile', jsonb_build_object(
      'id', v_user,
      'display_name', v_profile.display_name,
      'school', v_profile.school,
      'goal', v_profile.goal,
      'timezone', v_profile.timezone,
      'onboarded', v_profile.onboarded,
      'points', v_profile.points,
      'level', v_level,
      'level_floor', public._level_floor(v_level),
      'next_level', v_next,
      'next_level_at', case when v_next is null then null else public._level_floor(v_next) end,
      'solved', v_profile.solved_count,
      'attempted', v_profile.attempted_count,
      'accuracy', case when v_profile.attempted_count = 0 then null
                       else round(v_profile.solved_count::numeric / v_profile.attempted_count, 3) end,
      'streak', v_streak,
      'streak_best', v_profile.streak_best,
      'active_today', v_profile.last_active_on = v_today,
      'created_at', v_profile.created_at
    ),
    'tier', jsonb_build_object(
      'id', v_tier.id, 'name', v_tier.name, 'rank', v_tier.rank,
      'max_level', v_tier.max_level,
      'full_walkthroughs', v_tier.full_walkthroughs,
      'weekly_problem_limit', v_tier.weekly_problem_limit,
      'tutor_daily_limit', v_tier.tutor_daily_limit
    ),
    'quota', jsonb_build_object(
      'limit', v_tier.weekly_problem_limit,
      'used', v_used,
      'remaining', case when v_tier.weekly_problem_limit is null then null
                        else greatest(v_tier.weekly_problem_limit - v_used, 0) end,
      'resets_at', ((v_week + 7)::timestamp at time zone v_profile.timezone)
    ),
    'tutor', jsonb_build_object(
      'limit', v_tier.tutor_daily_limit,
      'used', v_tutor,
      'remaining', greatest(v_tier.tutor_daily_limit - v_tutor, 0)
    ),
    'daily', (
      select jsonb_build_object(
        'id', p.id, 'title', p.title, 'kind', p.kind, 'difficulty', p.difficulty,
        'minutes', p.minutes, 'module_id', m.id, 'module_name', m.name, 'level', m.level,
        'status', case when a.submitted_at is not null then (case when a.correct then 'correct' else 'wrong' end)
                       when a.opened_at is not null then 'opened' else 'new' end,
        'points', coalesce(a.points, 0))
      from public.problems p
      join public.modules m on m.id = p.module_id
      left join public.problem_attempts a on a.user_id = v_user and a.problem_id = p.id
      where p.id = v_daily
    ),
    'week', (
      select jsonb_agg(jsonb_build_object('date', d::date, 'points', coalesce(x.pts, 0)) order by d)
      from generate_series((v_today - 6)::timestamp, v_today::timestamp, interval '1 day') d
      left join (
        select local_date, sum(amount)::integer as pts
        from public.points_ledger
        where user_id = v_user and local_date between v_today - 6 and v_today
        group by local_date
      ) x on x.local_date = d::date
    ),
    'continue', coalesce((
      select jsonb_agg(row_to_json(c)::jsonb)
      from (
        select p.id, p.title, p.kind, p.difficulty, p.minutes, m.name as module_name, m.level,
               (a.opened_at is not null) as opened
        from public.problems p
        join public.modules m on m.id = p.module_id
        left join public.problem_attempts a on a.user_id = v_user and a.problem_id = p.id
        where p.published and m.level <= v_tier.max_level
          and a.submitted_at is null
          and p.id is distinct from v_daily
        order by (a.opened_at is not null) desc, m.sort, p.sort
        limit 3
      ) c
    ), '[]'::jsonb),
    'recent', coalesce((
      select jsonb_agg(row_to_json(r)::jsonb)
      from (
        select p.id, p.title, p.kind, m.name as module_name, a.correct, a.points, a.submitted_at
        from public.problem_attempts a
        join public.problems p on p.id = a.problem_id
        join public.modules m on m.id = p.module_id
        where a.user_id = v_user and a.submitted_at is not null
        order by a.submitted_at desc
        limit 5
      ) r
    ), '[]'::jsonb),
    'skills', (
      select jsonb_agg(jsonb_build_object(
               'module_id', m.id, 'name', m.name, 'short', m.short, 'level', m.level,
               'total', (select count(*) from public.problems p where p.module_id = m.id and p.published),
               'solved', (select count(*) from public.problem_attempts a
                          join public.problems p on p.id = a.problem_id
                          where a.user_id = v_user and p.module_id = m.id and a.correct))
             order by m.sort)
      from public.modules m
    ),
    'achievements', jsonb_build_array(
      jsonb_build_object('id', 'first-deal',  'name', 'First deal',     'detail', 'Solve your first problem',         'earned', v_profile.solved_count >= 1),
      jsonb_build_object('id', 'hat-trick',   'name', 'Hat trick',      'detail', 'Solve three problems',             'earned', v_profile.solved_count >= 3),
      jsonb_build_object('id', 'on-fire',     'name', 'On fire',        'detail', 'Practice three days in a row',     'earned', v_profile.streak_best >= 3),
      jsonb_build_object('id', 'fast-hands',  'name', 'Fast hands',     'detail', 'Solve one in under half the time', 'earned',
        exists (select 1 from public.problem_attempts a where a.user_id = v_user and a.correct and a.time_ratio > 0.5)),
      jsonb_build_object('id', 'module-clear','name', 'Module cleared', 'detail', 'Solve every problem in a module',  'earned',
        exists (select 1 from public.modules m
                where (select count(*) from public.problems p where p.module_id = m.id and p.published) > 0
                  and not exists (select 1 from public.problems p
                                  where p.module_id = m.id and p.published
                                    and not exists (select 1 from public.problem_attempts a
                                                    where a.user_id = v_user and a.problem_id = p.id and a.correct)))),
      jsonb_build_object('id', 'associate',   'name', 'Associate',      'detail', 'Reach 251 points',                 'earned', v_profile.points >= 251)
    ),
    'subscription', case when v_sub.id is null then null else jsonb_build_object(
      'status', v_sub.status,
      'tier', v_sub.tier,
      'plan_id', v_sub.plan_id,
      'interval', v_plan.interval,
      'amount', v_plan.amount,
      'currency', v_plan.currency,
      'current_end', v_sub.current_end,
      'cancel_at_cycle_end', v_sub.cancel_at_cycle_end,
      'livemode', v_sub.livemode,
      'payment_method', case when v_pay.id is null then null else jsonb_build_object(
        'method', v_pay.method, 'card_network', v_pay.card_network, 'card_last4', v_pay.card_last4,
        'bank', v_pay.bank, 'wallet', v_pay.wallet) end
    ) end
  );
end $$;

-- All modules and problems with this player's progress and locks.
create or replace function public.get_catalog()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_tier public.tiers;
begin
  if v_user is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;
  select * into v_tier from public.tiers where id = public.user_tier(v_user);

  return jsonb_build_object(
    'tier', v_tier.id,
    'modules', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'name', m.name, 'short', m.short, 'level', m.level, 'blurb', m.blurb,
        'locked', m.level > v_tier.max_level,
        'unlock_tier', (select t.id from public.tiers t where t.max_level >= m.level order by t.rank limit 1),
        'problems', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', p.id, 'title', p.title, 'kind', p.kind, 'difficulty', p.difficulty, 'minutes', p.minutes,
            'status', case when a.submitted_at is not null then (case when a.correct then 'correct' else 'wrong' end)
                           when a.opened_at is not null then 'opened' else 'new' end,
            'points', coalesce(a.points, 0)) order by p.sort, p.id)
          from public.problems p
          left join public.problem_attempts a on a.user_id = v_user and a.problem_id = p.id
          where p.module_id = m.id and p.published
        ), '[]'::jsonb)
      ) order by m.sort)
      from public.modules m
    ), '[]'::jsonb)
  );
end $$;

-- Rankings. Only names, schools and points are ever shown to other players.
create or replace function public.get_leaderboard(p_scope text default 'week', p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_user   uuid := auth.uid();
  v_since  timestamptz;
  v_limit  integer := least(greatest(coalesce(p_limit, 50), 1), 100);
begin
  if v_user is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;

  if p_scope = 'week' then
    v_since := date_trunc('week', now() at time zone 'UTC') at time zone 'UTC';
  elsif p_scope = 'month' then
    v_since := date_trunc('month', now() at time zone 'UTC') at time zone 'UTC';
  elsif p_scope = 'all' then
    v_since := null;
  else
    raise exception 'INVALID_SCOPE' using errcode = '22023';
  end if;

  return (
    with scored as (
      select pr.id, pr.display_name, pr.school, pr.points as total,
             case when v_since is null then pr.points else coalesce(l.pts, 0) end as pts
      from public.profiles pr
      left join (
        select user_id, sum(amount)::integer as pts
        from public.points_ledger
        where v_since is not null and created_at >= v_since
        group by user_id
      ) l on l.user_id = pr.id
    ),
    ranked as (
      select s.*, rank() over (order by s.pts desc) as pos
      from scored s
      where s.pts > 0
    )
    select jsonb_build_object(
      'scope', p_scope,
      'since', v_since,
      'rows', coalesce((
        select jsonb_agg(jsonb_build_object(
          'rank', r.pos, 'name', r.display_name, 'school', r.school, 'points', r.pts,
          'level', public.level_for_points(r.total), 'is_me', r.id = v_user) order by r.pos, r.display_name)
        from (select * from ranked order by pos, display_name limit v_limit) r
      ), '[]'::jsonb),
      'me', (
        select jsonb_build_object(
          'rank', r.pos, 'name', s.display_name, 'school', s.school, 'points', s.pts,
          'level', public.level_for_points(s.total), 'is_me', true)
        from scored s left join ranked r on r.id = s.id
        where s.id = v_user
      ),
      'players', (select count(*) from ranked)
    )
  );
end $$;

-- Aggregate counts for the landing page and sign-up screen (no personal data).
create or replace function public.get_public_stats()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'deals_solved', (select count(*) from public.problem_attempts where correct),
    'players',      (select count(*) from public.profiles where onboarded),
    'problems',     (select count(*) from public.problems where published),
    'modules',      (select count(*) from public.modules)
  )
$$;

-- ---------------------------------------------------------------------
-- 5. Functions only the Edge Functions may call (service role)
-- ---------------------------------------------------------------------

-- Apply a Razorpay subscription entity (from the API or a webhook).
-- p_event_at: webhook created_at, used to ignore out-of-order deliveries.
-- Pass null for a fresh API read, which always applies.
create or replace function public.apply_razorpay_subscription(
  p_entity jsonb,
  p_livemode boolean,
  p_event_at timestamptz default null,
  p_user uuid default null,
  p_plan_id text default null,
  p_cancel_at_cycle_end boolean default null
) returns public.subscriptions language plpgsql security definer set search_path = '' as $$
declare
  v_id      text := p_entity ->> 'id';
  v_row     public.subscriptions;
  v_plan    public.plans;
  v_status  public.subscription_status;
  v_cust    text := nullif(p_entity ->> 'customer_id', '');
begin
  if v_id is null or v_id !~ '^sub_[A-Za-z0-9]+$' then
    raise exception 'INVALID_SUBSCRIPTION_ID' using errcode = '22023';
  end if;
  -- Unknown statuses (if Razorpay adds one) keep the current status instead
  -- of failing, so webhooks never get stuck retrying.
  if (p_entity ->> 'status') = any (enum_range(null::public.subscription_status)::text[]) then
    v_status := (p_entity ->> 'status')::public.subscription_status;
  end if;

  select * into v_row from public.subscriptions where razorpay_subscription_id = v_id for update;

  if not found then
    if p_user is null or p_plan_id is null then
      raise exception 'UNKNOWN_SUBSCRIPTION' using errcode = 'P0002';
    end if;
    select * into v_plan from public.plans where id = p_plan_id;
    if not found then raise exception 'UNKNOWN_PLAN' using errcode = 'P0002'; end if;

    insert into public.subscriptions (
      user_id, plan_id, tier, razorpay_subscription_id, razorpay_plan_id, razorpay_customer_id,
      status, current_start, current_end, ended_at, paid_count, short_url, livemode, last_event_at,
      cancel_at_cycle_end)
    values (
      p_user, v_plan.id, v_plan.tier, v_id, p_entity ->> 'plan_id', v_cust,
      coalesce(v_status, 'created'),
      to_timestamp(nullif(p_entity ->> 'current_start', '')::bigint),
      to_timestamp(nullif(p_entity ->> 'current_end', '')::bigint),
      to_timestamp(nullif(p_entity ->> 'ended_at', '')::bigint),
      coalesce(nullif(p_entity ->> 'paid_count', '')::integer, 0),
      p_entity ->> 'short_url', p_livemode, p_event_at,
      coalesce(p_cancel_at_cycle_end, false))
    returning * into v_row;
  else
    if p_event_at is not null and v_row.last_event_at is not null and p_event_at < v_row.last_event_at then
      return v_row; -- older than what we already applied
    end if;

    update public.subscriptions set
      status               = coalesce(v_status, status),
      razorpay_customer_id = coalesce(v_cust, razorpay_customer_id),
      current_start        = coalesce(to_timestamp(nullif(p_entity ->> 'current_start', '')::bigint), current_start),
      current_end          = coalesce(to_timestamp(nullif(p_entity ->> 'current_end', '')::bigint), current_end),
      ended_at             = coalesce(to_timestamp(nullif(p_entity ->> 'ended_at', '')::bigint), ended_at),
      paid_count           = greatest(paid_count, coalesce(nullif(p_entity ->> 'paid_count', '')::integer, 0)),
      short_url            = coalesce(p_entity ->> 'short_url', short_url),
      cancel_at_cycle_end  = case when v_status in ('cancelled', 'completed', 'expired') then false
                                  else coalesce(p_cancel_at_cycle_end, cancel_at_cycle_end) end,
      last_event_at        = case when p_event_at is null then last_event_at
                                  else greatest(coalesce(last_event_at, p_event_at), p_event_at) end
    where id = v_row.id
    returning * into v_row;
  end if;

  if v_cust is not null and v_row.user_id is not null then
    insert into public.billing_customers (user_id, razorpay_customer_id)
    values (v_row.user_id, v_cust)
    on conflict (user_id) do update set razorpay_customer_id = excluded.razorpay_customer_id
    where public.billing_customers.razorpay_customer_id is distinct from excluded.razorpay_customer_id;
  end if;

  return v_row;
end $$;

-- Record or update a Razorpay payment. Status never moves backwards.
create or replace function public.apply_razorpay_payment(
  p_entity jsonb,
  p_livemode boolean,
  p_razorpay_subscription_id text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_id     text := p_entity ->> 'id';
  v_sub    public.subscriptions;
  v_status text := p_entity ->> 'status';
begin
  if v_id is null or v_id !~ '^pay_[A-Za-z0-9]+$' then
    raise exception 'INVALID_PAYMENT_ID' using errcode = '22023';
  end if;
  if v_status not in ('created', 'authorized', 'captured', 'refunded', 'failed') then
    raise exception 'INVALID_PAYMENT_STATUS' using errcode = '22023';
  end if;

  if p_razorpay_subscription_id is not null then
    select * into v_sub from public.subscriptions where razorpay_subscription_id = p_razorpay_subscription_id;
  end if;

  insert into public.payments as pm (
    user_id, subscription_id, razorpay_payment_id, razorpay_subscription_id, razorpay_invoice_id,
    razorpay_order_id, amount, amount_refunded, currency, status, method, card_network, card_last4,
    bank, wallet, error_code, error_description, livemode)
  values (
    v_sub.user_id, v_sub.id, v_id, p_razorpay_subscription_id, p_entity ->> 'invoice_id',
    p_entity ->> 'order_id',
    coalesce(nullif(p_entity ->> 'amount', '')::integer, 0),
    coalesce(nullif(p_entity ->> 'amount_refunded', '')::integer, 0),
    coalesce(p_entity ->> 'currency', 'INR'), v_status, p_entity ->> 'method',
    p_entity -> 'card' ->> 'network',
    case when (p_entity -> 'card' ->> 'last4') ~ '^[0-9]{4}$' then p_entity -> 'card' ->> 'last4' end,
    p_entity ->> 'bank', p_entity ->> 'wallet',
    p_entity ->> 'error_code', left(p_entity ->> 'error_description', 500), p_livemode)
  on conflict (razorpay_payment_id) do update set
    user_id                  = coalesce(pm.user_id, excluded.user_id),
    subscription_id          = coalesce(pm.subscription_id, excluded.subscription_id),
    razorpay_subscription_id = coalesce(pm.razorpay_subscription_id, excluded.razorpay_subscription_id),
    razorpay_invoice_id      = coalesce(excluded.razorpay_invoice_id, pm.razorpay_invoice_id),
    amount_refunded          = greatest(pm.amount_refunded, excluded.amount_refunded),
    status = case
      when (case excluded.status when 'created' then 0 when 'failed' then 1 when 'authorized' then 1
                                  when 'captured' then 2 when 'refunded' then 3 end)
        >= (case pm.status when 'created' then 0 when 'failed' then 1 when 'authorized' then 1
                           when 'captured' then 2 when 'refunded' then 3 end)
      then excluded.status else pm.status end,
    method            = coalesce(excluded.method, pm.method),
    card_network      = coalesce(excluded.card_network, pm.card_network),
    card_last4        = coalesce(excluded.card_last4, pm.card_last4),
    error_code        = coalesce(excluded.error_code, pm.error_code),
    error_description = coalesce(excluded.error_description, pm.error_description);
end $$;

-- One AI tutor message: checks plan + daily limit atomically, records the
-- use, and returns the context the tutor may see. The answer and worked
-- steps are only included after the player has submitted.
create or replace function public.begin_tutor_turn(p_user uuid, p_problem_id text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_tier     public.tiers;
  v_problem  public.problems;
  v_module   public.modules;
  v_attempt  public.problem_attempts;
  v_today    date;
  v_used     integer;
  v_usage_id bigint;
begin
  select * into v_tier from public.tiers where id = public.user_tier(p_user);
  if v_tier.tutor_daily_limit = 0 then
    return jsonb_build_object('allowed', false, 'reason', 'PLAN');
  end if;

  select * into v_problem from public.problems where id = p_problem_id and published;
  if not found then return jsonb_build_object('allowed', false, 'reason', 'NOT_FOUND'); end if;
  select * into v_module from public.modules where id = v_problem.module_id;
  if v_module.level > v_tier.max_level then
    return jsonb_build_object('allowed', false, 'reason', 'LEVEL_LOCKED');
  end if;

  select * into v_attempt from public.problem_attempts where user_id = p_user and problem_id = p_problem_id;
  if not found then return jsonb_build_object('allowed', false, 'reason', 'NOT_OPENED'); end if;

  perform pg_advisory_xact_lock(hashtextextended('tutor:' || p_user::text, 0));
  v_today := public._local_date(p_user);
  select count(*) into v_used from public.ai_usage
  where user_id = p_user and local_date = v_today and feature = 'tutor';
  if v_used >= v_tier.tutor_daily_limit then
    return jsonb_build_object('allowed', false, 'reason', 'LIMIT', 'remaining', 0);
  end if;

  insert into public.ai_usage (user_id, feature, problem_id, local_date)
  values (p_user, 'tutor', p_problem_id, v_today)
  returning id into v_usage_id;

  return jsonb_build_object(
    'allowed', true,
    'usage_id', v_usage_id,
    'remaining', v_tier.tutor_daily_limit - v_used - 1,
    'submitted', v_attempt.submitted_at is not null,
    'problem', jsonb_build_object(
      'title', v_problem.title, 'kind', v_problem.kind, 'module', v_module.name,
      'scenario', v_problem.scenario, 'data', v_problem.data, 'question', v_problem.question,
      'options', (select jsonb_agg(o ->> 'label') from jsonb_array_elements(v_problem.options) o),
      'hints', v_problem.hints, 'formula', v_problem.formula, 'concept', v_problem.concept),
    'solution', case when v_attempt.submitted_at is null then null else jsonb_build_object(
      'answer', (select o ->> 'label' from jsonb_array_elements(v_problem.options) o
                 where o ->> 'id' = v_problem.answer limit 1),
      'player_choice', (select o ->> 'label' from jsonb_array_elements(v_problem.options) o
                        where o ->> 'id' = v_attempt.choice limit 1),
      'correct', v_attempt.correct,
      'steps', v_problem.steps) end
  );
end $$;

-- Give a tutor message back if the AI call failed.
create or replace function public.refund_tutor_turn(p_usage_id bigint)
returns void language sql security definer set search_path = '' as $$
  delete from public.ai_usage where id = p_usage_id
$$;

-- Live (paying or retrying) subscriptions for a player, for cancel/delete.
create or replace function public.live_subscriptions(p_user uuid)
returns setof public.subscriptions language sql stable security definer set search_path = '' as $$
  select * from public.subscriptions
  where user_id = p_user and status in ('authenticated', 'active', 'pending', 'halted', 'paused')
  order by created_at desc
$$;

-- ---------------------------------------------------------------------
-- 6. Row level security: players read only their own rows
-- ---------------------------------------------------------------------
alter table public.tiers             enable row level security;
alter table public.plans             enable row level security;
alter table public.profiles          enable row level security;
alter table public.billing_customers enable row level security;
alter table public.subscriptions     enable row level security;
alter table public.payments          enable row level security;
alter table public.webhook_events    enable row level security;
alter table public.modules           enable row level security;
alter table public.problems          enable row level security;
alter table public.problem_attempts  enable row level security;
alter table public.points_ledger     enable row level security;
alter table public.ai_usage          enable row level security;

drop policy if exists "Catalog is public" on public.tiers;
create policy "Catalog is public" on public.tiers for select to anon, authenticated using (true);

drop policy if exists "Active plans are public" on public.plans;
create policy "Active plans are public" on public.plans for select to anon, authenticated using (active);

drop policy if exists "Modules are public" on public.modules;
create policy "Modules are public" on public.modules for select to anon, authenticated using (true);

drop policy if exists "Published problems are listed" on public.problems;
create policy "Published problems are listed" on public.problems for select to anon, authenticated using (published);

drop policy if exists "Read own profile" on public.profiles;
create policy "Read own profile" on public.profiles for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists "Read own billing customer" on public.billing_customers;
create policy "Read own billing customer" on public.billing_customers for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Read own subscriptions" on public.subscriptions;
create policy "Read own subscriptions" on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Read own payments" on public.payments;
create policy "Read own payments" on public.payments for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Read own attempts" on public.problem_attempts;
create policy "Read own attempts" on public.problem_attempts for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Read own points" on public.points_ledger;
create policy "Read own points" on public.points_ledger for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Read own AI usage" on public.ai_usage;
create policy "Read own AI usage" on public.ai_usage for select to authenticated
  using (user_id = (select auth.uid()));

-- webhook_events: no policies on purpose (nobody but the server can touch it)

-- ---------------------------------------------------------------------
-- 7. Privileges: no direct writes from the browser, answers stay hidden
-- ---------------------------------------------------------------------
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant select on public.tiers, public.plans, public.modules to anon, authenticated;
grant select (id, module_id, difficulty, minutes, title, kind, published, sort) on public.problems to anon, authenticated;
grant select on public.profiles, public.billing_customers, public.subscriptions, public.payments,
                public.problem_attempts, public.points_ledger, public.ai_usage to authenticated;

revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.get_me()                                         to authenticated;
grant execute on function public.get_catalog()                                    to authenticated;
grant execute on function public.get_leaderboard(text, integer)                   to authenticated;
grant execute on function public.open_problem(text)                               to authenticated;
grant execute on function public.submit_answer(text, text)                        to authenticated;
grant execute on function public.save_profile(text, text, text, text, boolean)   to authenticated;
grant execute on function public.level_for_points(integer)                        to anon, authenticated;
grant execute on function public.get_public_stats()                                to anon, authenticated;

grant execute on function public.apply_razorpay_subscription(jsonb, boolean, timestamptz, uuid, text, boolean) to service_role;
grant execute on function public.apply_razorpay_payment(jsonb, boolean, text)     to service_role;
grant execute on function public.begin_tutor_turn(uuid, text)                     to service_role;
grant execute on function public.refund_tutor_turn(bigint)                        to service_role;
grant execute on function public.live_subscriptions(uuid)                         to service_role;
grant execute on function public.user_tier(uuid)                                  to service_role;

-- ---------------------------------------------------------------------
-- 8. Plans and prices
--    Prices are in paise (₹499 = 49900). Change them here and re-run;
--    the billing function creates a new Razorpay plan when a price changes.
-- ---------------------------------------------------------------------
insert into public.tiers (id, name, rank, weekly_problem_limit, max_level, full_walkthroughs, tutor_daily_limit, tagline, features)
values
  ('free',  'Free',  0, 3,    'Analyst',   false, 0,   'Try the format',
     array['3 problems a week', 'Analyst modules', 'First two solution steps']),
  ('core',  'Core',  1, null, 'Associate', true,  0,   'Practice every day',
     array['Unlimited problems', 'Analyst and Associate modules', 'Full step-by-step solutions']),
  ('pro',   'Pro',   2, null, 'VP',        true,  40,  'Learn with a tutor',
     array['Everything in Core', 'AI tutor, 40 messages a day', 'VP modules: M&A and restructuring']),
  ('elite', 'Elite', 3, null, 'MD',        true,  300, 'Interview-ready',
     array['Everything in Pro', 'Unlimited AI tutor', 'MD module: deal structuring', 'Elite member card'])
on conflict (id) do update set
  name = excluded.name, rank = excluded.rank, weekly_problem_limit = excluded.weekly_problem_limit,
  max_level = excluded.max_level, full_walkthroughs = excluded.full_walkthroughs,
  tutor_daily_limit = excluded.tutor_daily_limit, tagline = excluded.tagline, features = excluded.features;

insert into public.plans (id, tier, interval, amount, currency, sort)
values
  ('core_monthly',  'core',  'monthly',   49900, 'INR', 1),
  ('core_yearly',   'core',  'yearly',   499000, 'INR', 2),
  ('pro_monthly',   'pro',   'monthly',   99900, 'INR', 3),
  ('pro_yearly',    'pro',   'yearly',   999000, 'INR', 4),
  ('elite_monthly', 'elite', 'monthly',  199900, 'INR', 5),
  ('elite_yearly',  'elite', 'yearly',  1999000, 'INR', 6)
on conflict (id) do update set
  tier = excluded.tier, interval = excluded.interval, amount = excluded.amount,
  currency = excluded.currency, sort = excluded.sort;

-- ---------------------------------------------------------------------
-- 9. Practice content (8 modules, 20 problems)
-- ---------------------------------------------------------------------
insert into public.modules (id, name, short, level, blurb, sort)
values
  ($v$statements$v$, $v$Financial statements$v$, $v$Statements$v$, $v$Analyst$v$, $v$Income statement, margins, cash flow$v$, 1),
  ($v$dcf$v$, $v$DCF valuation$v$, $v$DCF$v$, $v$Analyst$v$, $v$WACC, terminal value, discounting$v$, 2),
  ($v$comps$v$, $v$Trading comparables$v$, $v$Comps$v$, $v$Analyst$v$, $v$Multiples and the equity bridge$v$, 3),
  ($v$precedents$v$, $v$Precedent transactions$v$, $v$Precedents$v$, $v$Associate$v$, $v$Control premiums, deal multiples$v$, 4),
  ($v$lbo$v$, $v$LBO modeling$v$, $v$LBO$v$, $v$Associate$v$, $v$Leverage, MOIC, IRR, paydown$v$, 5),
  ($v$ma$v$, $v$M&A accretion / dilution$v$, $v$M&A$v$, $v$VP$v$, $v$EPS impact, synergies, exchange$v$, 6),
  ($v$restructuring$v$, $v$Restructuring$v$, $v$Restructuring$v$, $v$VP$v$, $v$Recovery waterfalls, priority$v$, 7),
  ($v$structuring$v$, $v$Deal structuring$v$, $v$Structuring$v$, $v$MD$v$, $v$Pricing a deal backwards from returns$v$, 8)
on conflict (id) do update set
  name = excluded.name, short = excluded.short, level = excluded.level,
  blurb = excluded.blurb, sort = excluded.sort;

insert into public.problems
  (id, module_id, difficulty, minutes, title, kind, scenario, data, question, options, answer, steps, concept, formula, hints, sort)
values
  ($v$forge$v$, $v$statements$v$, 1, 5, $v$Forge Industrial$v$, $v$Net income build$v$,
   $v$Forge Industrial makes precision valves. Build its net income for the fiscal year from the line items below.$v$,
   $v$[["Revenue","$200M"],["COGS","$120M"],["SG&A","$30M"],["D&A","$15M"],["Interest expense","$5M"],["Tax rate","25%"]]$v$::jsonb,
   $v$What is Forge Industrial's net income?$v$,
   $v$[{"id":"a","label":"$18.75M"},{"id":"b","label":"$22.50M"},{"id":"c","label":"$26.25M"},{"id":"d","label":"$30.00M"}]$v$::jsonb, $v$b$v$,
   $v$[["Gross profit","$200M − $120M = $80M"],["EBIT","$80M − $30M SG&A − $15M D&A = $35M"],["Pre-tax income","$35M − $5M interest = $30M"],["Taxes","$30M × 25% = $7.5M"],["Net income","$30M − $7.5M = $22.5M"]]$v$::jsonb,
   $v$Walk the income statement top to bottom: revenue, gross profit, EBIT, pre-tax income, net income. Interest comes after EBIT and before tax, which is why debt lowers a company's tax bill.$v$,
   $v$Net income = (Revenue − COGS − SG&A − D&A − Interest) × (1 − tax rate)$v$,
   $v$["Start at the top. What do you get when you subtract COGS from revenue?","Operating expenses (SG&A and D&A) come out next. That gives you EBIT, operating profit before interest and tax.","Interest is deducted before tax. Apply the 25% rate to pre-tax income, not to EBIT."]$v$::jsonb, 1),
  ($v$halcyon$v$, $v$statements$v$, 1, 4, $v$Halcyon Foods$v$, $v$Margin analysis$v$,
   $v$Halcyon Foods sells packaged snacks to supermarkets. An investor wants to compare its profitability with peers.$v$,
   $v$[["Revenue","$500M"],["Cost of goods sold","$325M"],["Operating expenses","$110M"]]$v$::jsonb,
   $v$What is Halcyon's gross margin?$v$,
   $v$[{"id":"a","label":"13%"},{"id":"b","label":"25%"},{"id":"c","label":"35%"},{"id":"d","label":"65%"}]$v$::jsonb, $v$c$v$,
   $v$[["Gross profit","$500M − $325M = $175M"],["Gross margin","$175M ÷ $500M = 35%"],["Check the traps","13% is the operating margin ($65M ÷ $500M); 65% is COGS as a share of revenue"]]$v$::jsonb,
   $v$Gross margin only looks at the direct cost of making the product. Operating expenses belong to operating margin, one line further down.$v$,
   $v$Gross margin = (Revenue − COGS) ÷ Revenue$v$,
   $v$["Gross margin uses only one cost line. Which one is it?","Gross profit is revenue minus COGS. Divide that by revenue.","Operating expenses are a distraction here. They matter for operating margin, not gross margin."]$v$::jsonb, 2),
  ($v$corbel$v$, $v$statements$v$, 2, 6, $v$Corbel Tools$v$, $v$Unlevered free cash flow$v$,
   $v$You are building the first year of a DCF for Corbel Tools, a hardware manufacturer. Calculate its unlevered free cash flow.$v$,
   $v$[["EBIT","$80M"],["Tax rate","25%"],["D&A","$20M"],["Capital expenditure","$30M"],["Increase in net working capital","$10M"]]$v$::jsonb,
   $v$What is Corbel's unlevered free cash flow?$v$,
   $v$[{"id":"a","label":"$30M"},{"id":"b","label":"$40M"},{"id":"c","label":"$50M"},{"id":"d","label":"$60M"}]$v$::jsonb, $v$b$v$,
   $v$[["NOPAT","$80M × (1 − 25%) = $60M"],["Add back D&A","$60M + $20M = $80M (non-cash charge)"],["Subtract capex","$80M − $30M = $50M"],["Subtract NWC increase","$50M − $10M = $40M"]]$v$::jsonb,
   $v$Unlevered FCF is the cash the business generates before any payment to lenders or shareholders. That is why it is discounted at WACC, the blended cost of both.$v$,
   $v$UFCF = EBIT × (1 − t) + D&A − Capex − ΔNWC$v$,
   $v$["Unlevered means before interest. Start by taxing EBIT directly.","D&A reduced EBIT but no cash left the company. What should you do with it?","Capex and a growing working capital balance both consume cash."]$v$::jsonb, 3),
  ($v$veridian$v$, $v$dcf$v$, 2, 6, $v$Veridian Utilities$v$, $v$WACC$v$,
   $v$Veridian Utilities is financed with both equity and debt. Compute the discount rate you would use in its DCF.$v$,
   $v$[["Market value of equity","$600M"],["Market value of debt","$400M"],["Cost of equity","12%"],["Pre-tax cost of debt","6%"],["Tax rate","25%"]]$v$::jsonb,
   $v$What is Veridian's WACC?$v$,
   $v$[{"id":"a","label":"7.8%"},{"id":"b","label":"9.0%"},{"id":"c","label":"9.6%"},{"id":"d","label":"10.2%"}]$v$::jsonb, $v$b$v$,
   $v$[["Weights","Equity 600 ÷ 1,000 = 60%; debt 400 ÷ 1,000 = 40%"],["After-tax cost of debt","6% × (1 − 25%) = 4.5%"],["Equity contribution","60% × 12% = 7.2%"],["Debt contribution","40% × 4.5% = 1.8%"],["WACC","7.2% + 1.8% = 9.0%"]]$v$::jsonb,
   $v$Interest is tax-deductible, so debt costs less than its stated rate. Forgetting the tax shield is the most common WACC mistake: here it would give 9.6%.$v$,
   $v$WACC = E/V × Re + D/V × Rd × (1 − t)$v$,
   $v$["First find what share of total capital is equity and what share is debt.","Debt gets a tax shield. Adjust the 6% before you weight it.","Multiply each cost by its weight and add the two pieces together."]$v$::jsonb, 1),
  ($v$lumen$v$, $v$dcf$v$, 2, 5, $v$Lumen Health$v$, $v$Terminal value$v$,
   $v$Your DCF of Lumen Health, a clinic operator, projects five years of cash flow. You need the terminal value at the end of year 5.$v$,
   $v$[["Year 5 free cash flow","$50M"],["Perpetual growth rate","3%"],["WACC","10%"]]$v$::jsonb,
   $v$What is the terminal value using the perpetuity growth method?$v$,
   $v$[{"id":"a","label":"$500M"},{"id":"b","label":"$714M"},{"id":"c","label":"$736M"},{"id":"d","label":"$1,000M"}]$v$::jsonb, $v$c$v$,
   $v$[["Next year's cash flow","$50M × 1.03 = $51.5M"],["Spread","WACC − g = 10% − 3% = 7%"],["Terminal value","$51.5M ÷ 7% = $735.7M ≈ $736M"],["The trap","$714M forgets to grow the cash flow one year forward"]]$v$::jsonb,
   $v$The Gordon growth formula values a cash flow stream that starts one year from now. That is why the numerator is year 6 cash flow, not year 5.$v$,
   $v$TV = FCF₅ × (1 + g) ÷ (WACC − g)$v$,
   $v$["The perpetuity formula needs the cash flow of the first year inside the perpetuity. Is that year 5 or year 6?","Grow the year 5 cash flow by 3% once.","Divide by the difference between WACC and the growth rate."]$v$::jsonb, 2),
  ($v$byteshift$v$, $v$dcf$v$, 3, 9, $v$ByteShift$v$, $v$Full DCF$v$,
   $v$ByteShift is a mid-stage cloud infrastructure company. Value it with a five-year DCF and a perpetuity-growth terminal value.$v$,
   $v$[["Year 1 free cash flow","$20M"],["FCF growth, years 2–5","15% / year"],["WACC","10%"],["Terminal growth","3%"],["Projection period","5 years"]]$v$::jsonb,
   $v$What is ByteShift's approximate enterprise value?$v$,
   $v$[{"id":"a","label":"$320M"},{"id":"b","label":"$420M"},{"id":"c","label":"$515M"},{"id":"d","label":"$615M"}]$v$::jsonb, $v$b$v$,
   $v$[["Project cash flows","$20.0M, $23.0M, $26.5M, $30.4M, $35.0M"],["Discount them","PV at 10% ≈ $18.2M + $19.0M + $19.9M + $20.8M + $21.7M = $99.6M"],["Terminal value","$35.0M × 1.03 ÷ 7% = $514.7M"],["Discount the TV","$514.7M ÷ 1.10⁵ = $319.6M"],["Enterprise value","$99.6M + $319.6M ≈ $419M"]]$v$::jsonb,
   $v$In most DCFs the terminal value is more than half of the total. Here it is 76%, which is why analysts always run a sensitivity table on WACC and terminal growth.$v$,
   $v$EV = Σ FCFₜ ÷ (1 + WACC)ᵗ + TV ÷ (1 + WACC)⁵$v$,
   $v$["Lay out five years of cash flow first, growing 15% each year after year 1.","Discount each year by 1.10 raised to its year number, then add them up.","Do not forget the terminal value. It sits at year 5, so it gets discounted five years too."]$v$::jsonb, 3),
  ($v$atlas$v$, $v$comps$v$, 2, 6, $v$Atlas Retail Group$v$, $v$Implied share price$v$,
   $v$You are valuing Atlas Retail Group using the median trading multiple of four peer retailers.$v$,
   $v$[["Peer median EV / EBITDA","7.5x"],["Atlas EBITDA","$60M"],["Atlas net debt","$120M"],["Shares outstanding","50M"]]$v$::jsonb,
   $v$What share price does this imply?$v$,
   $v$[{"id":"a","label":"$4.20"},{"id":"b","label":"$6.60"},{"id":"c","label":"$9.00"},{"id":"d","label":"$11.40"}]$v$::jsonb, $v$b$v$,
   $v$[["Implied EV","$60M × 7.5x = $450M"],["Equity value","$450M − $120M net debt = $330M"],["Per share","$330M ÷ 50M = $6.60"],["The trap","$9.00 skips the net debt step and divides EV by shares"]]$v$::jsonb,
   $v$EV multiples give enterprise value, which belongs to all capital providers. Lenders get paid first, so subtract net debt before dividing by shares.$v$,
   $v$Share price = (EBITDA × multiple − net debt) ÷ shares$v$,
   $v$["Apply the peer multiple to Atlas's EBITDA. What does that give you, EV or equity value?","Enterprise value includes the claims of lenders. What do you remove to get to shareholders?","Only once you have equity value should you divide by shares outstanding."]$v$::jsonb, 1),
  ($v$northwind$v$, $v$comps$v$, 1, 4, $v$Northwind Apparel$v$, $v$P/E valuation$v$,
   $v$Northwind Apparel is about to list. Bankers benchmark it against listed apparel brands.$v$,
   $v$[["Peer median P/E","18x"],["Northwind EPS","$2.50"],["Northwind net debt","$40M"]]$v$::jsonb,
   $v$What share price does the peer P/E imply?$v$,
   $v$[{"id":"a","label":"$36.00"},{"id":"b","label":"$45.00"},{"id":"c","label":"$50.00"},{"id":"d","label":"$54.00"}]$v$::jsonb, $v$b$v$,
   $v$[["Apply the multiple","$2.50 × 18 = $45.00"],["Why no debt adjustment","EPS is already after interest, so P/E maps straight to equity value per share"]]$v$::jsonb,
   $v$Match the multiple to the metric. Equity multiples (P/E) pair with equity metrics like EPS; enterprise multiples pair with EBITDA or EBIT. The net debt figure is a deliberate distraction.$v$,
   $v$Price = EPS × P/E$v$,
   $v$["P/E is price divided by earnings per share. Rearrange it.","Does net income already account for interest paid to lenders?","Since EPS is after interest, you do not touch net debt here."]$v$::jsonb, 2),
  ($v$kestrel$v$, $v$comps$v$, 2, 5, $v$Kestrel Systems$v$, $v$Equity bridge$v$,
   $v$Your model values Kestrel Systems, a defense electronics maker, at an enterprise value of $1.2B. Convert that into a share price.$v$,
   $v$[["Enterprise value","$1,200M"],["Total debt","$300M"],["Cash","$100M"],["Diluted shares","50M"]]$v$::jsonb,
   $v$What is the implied value per share?$v$,
   $v$[{"id":"a","label":"$16.00"},{"id":"b","label":"$18.00"},{"id":"c","label":"$20.00"},{"id":"d","label":"$26.00"}]$v$::jsonb, $v$c$v$,
   $v$[["Net debt","$300M − $100M = $200M"],["Equity value","$1,200M − $200M = $1,000M"],["Per share","$1,000M ÷ 50M = $20.00"]]$v$::jsonb,
   $v$Cash is added back because a buyer of the whole company gets it. Debt is subtracted because the buyer has to repay it.$v$,
   $v$Equity value = EV − debt + cash$v$,
   $v$["Going from EV to equity, which items do you subtract and which do you add?","Debt reduces what is left for shareholders. Cash increases it.","Use diluted shares for the final division."]$v$::jsonb, 3),
  ($v$halden$v$, $v$precedents$v$, 2, 5, $v$Halden Biosciences$v$, $v$Control premium$v$,
   $v$A large pharma company has offered to acquire Halden Biosciences. The board wants to know how generous the bid is.$v$,
   $v$[["Undisturbed share price","$40.00"],["Offer price per share","$52.00"],["Shares outstanding","80M"]]$v$::jsonb,
   $v$What control premium does the offer represent?$v$,
   $v$[{"id":"a","label":"12%"},{"id":"b","label":"23%"},{"id":"c","label":"30%"},{"id":"d","label":"52%"}]$v$::jsonb, $v$c$v$,
   $v$[["Premium in dollars","$52 − $40 = $12"],["Premium in percent","$12 ÷ $40 = 30%"],["The trap","23% divides by the offer price instead of the undisturbed price"]]$v$::jsonb,
   $v$Premiums are measured against the undisturbed price, before any rumor moved the stock. Typical public-company control premiums fall between 20% and 40%.$v$,
   $v$Premium = (Offer − undisturbed price) ÷ undisturbed price$v$,
   $v$["How much more per share is the buyer paying than the market price?","The base for the percentage is the price before the offer.","Shares outstanding is not needed for this one."]$v$::jsonb, 1),
  ($v$ardent$v$, $v$precedents$v$, 3, 7, $v$Ardent Logistics$v$, $v$Transaction multiple$v$,
   $v$Ardent Logistics was acquired last year. You are adding the deal to a precedent transactions table.$v$,
   $v$[["Equity purchase price","$800M"],["Debt assumed","$200M"],["Target cash acquired","$50M"],["Target LTM EBITDA","$95M"]]$v$::jsonb,
   $v$What EV / EBITDA multiple did the buyer pay?$v$,
   $v$[{"id":"a","label":"8.4x"},{"id":"b","label":"9.5x"},{"id":"c","label":"10.0x"},{"id":"d","label":"10.5x"}]$v$::jsonb, $v$c$v$,
   $v$[["Transaction EV","$800M + $200M − $50M = $950M"],["Multiple","$950M ÷ $95M = 10.0x"],["The traps","8.4x uses equity value only; 10.5x forgets to subtract cash"]]$v$::jsonb,
   $v$Deal multiples are built on enterprise value so they can be compared across targets with different capital structures.$v$,
   $v$EV = equity price + debt − cash; multiple = EV ÷ EBITDA$v$,
   $v$["The multiple needs enterprise value, not just the equity price.","Add the debt the buyer took on, then subtract the cash it received.","Divide that EV by LTM EBITDA."]$v$::jsonb, 2),
  ($v$meridian$v$, $v$lbo$v$, 3, 10, $v$Meridian Software$v$, $v$LBO returns$v$,
   $v$Apex Capital is evaluating a leveraged buyout of Meridian Software, a B2B SaaS company with stable recurring revenue. Assume interest is paid from cash flow and no debt is repaid.$v$,
   $v$[["LTM EBITDA","$85M"],["Entry multiple","9.0x EV / EBITDA"],["Debt / equity","65% / 35%"],["Senior debt rate","6.5%"],["EBITDA growth","10% / year"],["Exit multiple","9.0x"],["Hold period","5 years"]]$v$::jsonb,
   $v$What is the approximate equity IRR?$v$,
   $v$[{"id":"a","label":"~18%"},{"id":"b","label":"~22%"},{"id":"c","label":"~28%"},{"id":"d","label":"~35%"}]$v$::jsonb, $v$b$v$,
   $v$[["Entry EV","$85M × 9.0x = $765M"],["Sources","Debt $497M (65%), equity $268M (35%)"],["Exit EV","EBITDA $85M × 1.10⁵ = $136.9M; × 9.0x = $1,232M"],["Exit equity","$1,232M − $497M = $735M"],["Returns","MOIC 2.74x; IRR = 2.74^(1/5) − 1 ≈ 22.4%"]]$v$::jsonb,
   $v$LBO returns come from three levers: EBITDA growth, multiple expansion and debt paydown. With a flat multiple and no paydown, 10% EBITDA growth becomes a 22% equity return purely through leverage.$v$,
   $v$IRR = (Exit equity ÷ Entry equity)^(1/years) − 1$v$,
   $v$["Start with what the sponsor pays: entry EBITDA times the entry multiple.","Split that price into debt and equity. Only the equity check matters for the IRR.","Find exit EV from year 5 EBITDA, subtract the debt, then compare exit equity to the equity check over 5 years."]$v$::jsonb, 1),
  ($v$quarry$v$, $v$lbo$v$, 2, 4, $v$Quarry Partners$v$, $v$MOIC to IRR$v$,
   $v$Quarry Partners sold a portfolio company after five years and returned 3.0x the equity it invested. LPs want the annualized return.$v$,
   $v$[["MOIC","3.0x"],["Hold period","5 years"],["Interim dividends","None"]]$v$::jsonb,
   $v$What IRR does a 3.0x MOIC over five years represent?$v$,
   $v$[{"id":"a","label":"~20%"},{"id":"b","label":"~25%"},{"id":"c","label":"~30%"},{"id":"d","label":"~40%"}]$v$::jsonb, $v$b$v$,
   $v$[["Set up","IRR = 3.0^(1/5) − 1"],["Compute","3.0^0.2 = 1.246"],["Result","IRR ≈ 24.6%"],["The trap","40% simply divides the 200% gain by five years and ignores compounding"]]$v$::jsonb,
   $v$Memorize the grid used in interviews: 2x in 3 years ≈ 26%, 2x in 5 years ≈ 15%, 3x in 5 years ≈ 25%. It lets you sanity check any LBO in seconds.$v$,
   $v$IRR = MOIC^(1/n) − 1$v$,
   $v$["Returns compound. A simple average of the gain per year will overstate the IRR.","You need the yearly rate that turns 1 into 3 over five years.","Take the fifth root of 3.0 and subtract 1."]$v$::jsonb, 2),
  ($v$bastion$v$, $v$lbo$v$, 4, 10, $v$Bastion Foods$v$, $v$Paper LBO with paydown$v$,
   $v$A sponsor buys Bastion Foods, a frozen food producer. Free cash flow after interest is used to repay debt over the hold.$v$,
   $v$[["Entry EBITDA","$50M"],["Entry and exit multiple","8.0x"],["Debt at entry","60% of EV"],["Year 5 EBITDA","$70M"],["Debt at exit","$140M"],["Hold period","5 years"]]$v$::jsonb,
   $v$What is the approximate equity IRR?$v$,
   $v$[{"id":"a","label":"~15%"},{"id":"b","label":"~21%"},{"id":"c","label":"~26%"},{"id":"d","label":"~32%"}]$v$::jsonb, $v$b$v$,
   $v$[["Entry","EV $400M; debt $240M; equity $160M"],["Exit EV","$70M × 8.0x = $560M"],["Exit equity","$560M − $140M = $420M"],["MOIC","$420M ÷ $160M = 2.63x"],["IRR","2.625^(1/5) − 1 ≈ 21.3%"]]$v$::jsonb,
   $v$Paying down $100M of debt moves $100M of value from lenders to the sponsor. Here paydown accounts for $100M of the sponsor's $260M equity gain.$v$,
   $v$Exit equity = Exit EBITDA × multiple − remaining debt$v$,
   $v$["Work out the entry EV and the equity cheque first.","At exit, use the remaining debt, not the original debt.","Compare exit equity to entry equity, then annualize over five years."]$v$::jsonb, 3),
  ($v$pinnacle$v$, $v$ma$v$, 4, 10, $v$Pinnacle Healthcare$v$, $v$Accretion / dilution$v$,
   $v$NovaCorp plans an all-stock acquisition of Pinnacle Healthcare at a 25% premium. Ignore synergies and fees.$v$,
   $v$[["NovaCorp EPS","$4.00"],["NovaCorp shares","100M"],["NovaCorp P/E","20x"],["Pinnacle EPS","$2.50"],["Pinnacle shares","40M"],["Pinnacle share price","$50.00"],["Offer premium","25%"]]$v$::jsonb,
   $v$Is the deal accretive or dilutive to NovaCorp's EPS, and by how much?$v$,
   $v$[{"id":"a","label":"Accretive ~3%"},{"id":"b","label":"Dilutive ~5%"},{"id":"c","label":"Accretive ~8%"},{"id":"d","label":"Dilutive ~12%"}]$v$::jsonb, $v$b$v$,
   $v$[["Purchase price","$50 × 1.25 = $62.50 per share; × 40M = $2,500M"],["New NovaCorp shares","NovaCorp price $80 (20 × $4); $2,500M ÷ $80 = 31.25M shares"],["Combined net income","$400M + $100M = $500M"],["Pro forma EPS","$500M ÷ 131.25M = $3.81"],["Impact","$3.81 vs $4.00 = −4.8%, dilutive"]]$v$::jsonb,
   $v$In an all-stock deal, if the buyer's P/E is lower than the P/E it pays for the target, the deal is dilutive. NovaCorp trades at 20x but pays 25x ($62.50 ÷ $2.50).$v$,
   $v$Pro forma EPS = (NI buyer + NI target) ÷ (buyer shares + new shares)$v$,
   $v$["First work out the total purchase price including the premium.","In an all-stock deal NovaCorp issues new shares at its own price. What is that price?","Combine the two net incomes and divide by the new total share count. Compare with $4.00."]$v$::jsonb, 1),
  ($v$pinnacle-syn$v$, $v$ma$v$, 5, 10, $v$Pinnacle Healthcare II$v$, $v$Breakeven synergies$v$,
   $v$Same deal as Pinnacle Healthcare: pro forma NovaCorp has 131.25M shares and $500M of combined net income. The board asks what synergies would make the deal EPS-neutral.$v$,
   $v$[["Standalone NovaCorp EPS","$4.00"],["Pro forma shares","131.25M"],["Combined net income","$500M"],["Tax rate","25%"]]$v$::jsonb,
   $v$What pre-tax synergies are needed to break even?$v$,
   $v$[{"id":"a","label":"$25M"},{"id":"b","label":"$33M"},{"id":"c","label":"$50M"},{"id":"d","label":"$100M"}]$v$::jsonb, $v$b$v$,
   $v$[["Net income needed","$4.00 × 131.25M = $525M"],["After-tax gap","$525M − $500M = $25M"],["Gross up for tax","$25M ÷ (1 − 25%) = $33.3M"]]$v$::jsonb,
   $v$Synergies are earned pre-tax but EPS is after tax. Always gross the after-tax gap up by (1 − t).$v$,
   $v$Pre-tax synergies = (Target EPS × shares − combined NI) ÷ (1 − t)$v$,
   $v$["What total net income would keep EPS at $4.00 with the new share count?","The gap you found is after tax. Synergies are quoted before tax.","Divide the after-tax gap by (1 − tax rate)."]$v$::jsonb, 2),
  ($v$pe-rule$v$, $v$ma$v$, 2, 3, $v$Calloway Media$v$, $v$P/E rule$v$,
   $v$Calloway Media trades at 15x earnings. It agrees to buy a smaller rival in an all-stock deal at a purchase price of 20x the rival's earnings. No synergies.$v$,
   $v$[["Acquirer P/E","15x"],["Purchase P/E paid","20x"],["Consideration","100% stock"]]$v$::jsonb,
   $v$What is the EPS impact on Calloway?$v$,
   $v$[{"id":"a","label":"Accretive"},{"id":"b","label":"Dilutive"},{"id":"c","label":"Neutral"},{"id":"d","label":"Depends on deal size"}]$v$::jsonb, $v$b$v$,
   $v$[["Earnings yield bought","1 ÷ 20x = 5.0%"],["Cost of the stock used","1 ÷ 15x = 6.7%"],["Conclusion","Paying 6.7% of earnings to acquire 5.0% of earnings lowers EPS: dilutive"]]$v$::jsonb,
   $v$Size changes how much dilution you get, never the direction. The direction is set by comparing the two P/E ratios.$v$,
   $v$All-stock: dilutive if acquirer P/E < purchase P/E$v$,
   $v$["Think of a P/E as a price tag on one dollar of earnings.","Calloway's own stock is the currency. Is that currency expensive or cheap relative to what it buys?","Compare the earnings yield acquired with the earnings yield given up."]$v$::jsonb, 3),
  ($v$granite$v$, $v$restructuring$v$, 3, 7, $v$Granite Retail$v$, $v$Recovery waterfall$v$,
   $v$Granite Retail has filed for bankruptcy. Its business is valued at $300M as a going concern. Claims are paid in strict priority.$v$,
   $v$[["Distributable value","$300M"],["Secured term loan","$200M"],["Senior unsecured notes","$150M"],["Subordinated notes","$100M"]]$v$::jsonb,
   $v$What recovery do the senior unsecured noteholders receive?$v$,
   $v$[{"id":"a","label":"0%"},{"id":"b","label":"33%"},{"id":"c","label":"67%"},{"id":"d","label":"100%"}]$v$::jsonb, $v$c$v$,
   $v$[["Secured first","$200M paid in full; $100M left"],["Senior unsecured","$100M available for $150M of claims"],["Recovery","$100M ÷ $150M = 66.7%"],["Below them","Subordinated notes and equity receive nothing"]]$v$::jsonb,
   $v$The absolute priority rule means each class is paid in full before the next class gets anything. The class where value runs out is called the fulcrum security, and it usually ends up owning the reorganized company.$v$,
   $v$Recovery = value available to the class ÷ size of the class claim$v$,
   $v$["Pay the classes in order of seniority. Who is first?","After the secured lenders, how much value is left?","Divide what is left by the senior unsecured claim."]$v$::jsonb, 1),
  ($v$solstice$v$, $v$structuring$v$, 4, 8, $v$Solstice Hotels$v$, $v$Maximum equity check$v$,
   $v$Your fund targets a 25% IRR. In your base case, the equity in Solstice Hotels is worth $900M at exit in five years.$v$,
   $v$[["Target IRR","25%"],["Exit equity value","$900M"],["Hold period","5 years"]]$v$::jsonb,
   $v$What is the most equity the fund can invest today?$v$,
   $v$[{"id":"a","label":"$225M"},{"id":"b","label":"$295M"},{"id":"c","label":"$360M"},{"id":"d","label":"$450M"}]$v$::jsonb, $v$b$v$,
   $v$[["Required multiple","1.25⁵ = 3.05x"],["Max equity","$900M ÷ 3.05 = $294.9M"],["The trap","$360M divides by 2.5x, which ignores compounding"]]$v$::jsonb,
   $v$Working backwards from a target return is how sponsors set their maximum bid. Discount the exit value at the target IRR instead of WACC.$v$,
   $v$Max equity = Exit equity ÷ (1 + target IRR)ⁿ$v$,
   $v$["Which multiple of money does 25% a year compound to over five years?","Raise 1.25 to the fifth power.","Divide exit equity by that multiple."]$v$::jsonb, 1),
  ($v$orion$v$, $v$structuring$v$, 5, 12, $v$Orion Aerospace$v$, $v$Maximum entry multiple$v$,
   $v$A sponsor is bidding for Orion Aerospace. It will fund the deal with $500M of debt that stays outstanding until exit, and it needs a 20% IRR.$v$,
   $v$[["LTM EBITDA","$100M"],["EBITDA growth","10% / year"],["Exit multiple","10.0x"],["Debt (no paydown)","$500M"],["Target IRR","20%"],["Hold period","5 years"]]$v$::jsonb,
   $v$What is the highest EV / EBITDA multiple the sponsor can pay?$v$,
   $v$[{"id":"a","label":"8.0x"},{"id":"b","label":"9.5x"},{"id":"c","label":"10.5x"},{"id":"d","label":"11.0x"}]$v$::jsonb, $v$b$v$,
   $v$[["Exit EBITDA","$100M × 1.10⁵ = $161.1M"],["Exit equity","$161.1M × 10.0x − $500M = $1,110.5M"],["Max equity today","$1,110.5M ÷ 1.20⁵ = $446.3M"],["Max entry EV","$446.3M + $500M = $946.3M"],["Max multiple","$946.3M ÷ $100M ≈ 9.5x"]]$v$::jsonb,
   $v$This is a reverse LBO: start from the exit, discount equity at the target IRR, then add debt back to find the enterprise value you can afford.$v$,
   $v$Max EV = (Exit equity ÷ (1 + IRR)ⁿ) + debt$v$,
   $v$["Start at the end. What is the business worth at exit?","Strip out the debt to get exit equity, then discount it back at 20% for five years.","Add the debt back to that equity to get the maximum entry EV, then divide by today's EBITDA."]$v$::jsonb, 2)
on conflict (id) do update set
  module_id = excluded.module_id, difficulty = excluded.difficulty, minutes = excluded.minutes,
  title = excluded.title, kind = excluded.kind, scenario = excluded.scenario, data = excluded.data,
  question = excluded.question, options = excluded.options, answer = excluded.answer,
  steps = excluded.steps, concept = excluded.concept, formula = excluded.formula,
  hints = excluded.hints, sort = excluded.sort;

commit;
