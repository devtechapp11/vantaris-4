-- Minimal stand-in for a Supabase project, for local testing only.
-- Recreates the roles, the auth schema, auth.uid() and the default grants
-- Supabase applies to the public schema.
do $$ begin
  create role anon nologin noinherit;
exception when duplicate_object then null; end $$;
do $$ begin
  create role authenticated nologin noinherit;
exception when duplicate_object then null; end $$;
do $$ begin
  create role service_role nologin noinherit bypassrls;
exception when duplicate_object then null; end $$;

create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

-- The first-prototype schema, to test the upgrade path.
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text not null default 'Analyst', email text, rank text not null default 'Summer Intern',
  xp integer not null default 0, deals_completed integer not null default 0,
  streak integer not null default 0, best_score integer not null default 0, avatar_url text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.deal_history (
  id uuid default gen_random_uuid() primary key, user_id uuid references auth.users(id) on delete cascade not null,
  deal_headline text not null, deal_type text not null default 'M&A', score integer not null default 0,
  grade text not null default 'C', xp_earned integer not null default 0, created_at timestamptz not null default now());
alter table public.profiles enable row level security;
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- An early user who signed up under the first prototype.
insert into auth.users (id, email, raw_user_meta_data)
values ('00000000-0000-0000-0000-0000000000aa', 'early@example.com', '{"display_name": "Early bird"}')
on conflict do nothing;
insert into public.profiles (id, display_name, xp) values ('00000000-0000-0000-0000-0000000000aa', 'Early bird', 900)
on conflict do nothing;

-- Test helpers
create schema if not exists t;
grant usage on schema t to anon, authenticated, service_role;
create or replace function t.expect_error(p_sql text, p_like text) returns text language plpgsql as $$
begin
  execute p_sql;
  raise exception 'EXPECTED ERROR "%" BUT IT SUCCEEDED: %', p_like, p_sql;
exception when others then
  if sqlerrm like 'EXPECTED ERROR%' then raise; end if;
  if sqlerrm not ilike '%' || p_like || '%' then
    raise exception 'WRONG ERROR for [%]: got "%" expected "%"', p_sql, sqlerrm, p_like;
  end if;
  return 'ok  (blocked: ' || sqlerrm || ')';
end $$;
create or replace function t.ok(p boolean, p_msg text) returns text language plpgsql as $$
begin
  if not coalesce(p, false) then raise exception 'ASSERT FAILED: %', p_msg; end if;
  return 'ok  ' || p_msg;
end $$;
grant execute on all functions in schema t to anon, authenticated, service_role;
