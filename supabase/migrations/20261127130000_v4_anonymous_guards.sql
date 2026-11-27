-- V4 onboarding: guest desks (Supabase anonymous sign-ins).
-- Guests have the `authenticated` role, so every guard reads the JWT's
-- is_anonymous claim (public._is_anonymous(), from 20261127120000).
--
-- The leaderboard is wrapped, not rewritten: the live body stays exactly as
-- deployed, whatever version that is.

do $$
begin
  if to_regprocedure('public._get_leaderboard_inner(text, integer)') is null then
    alter function public.get_leaderboard(text, integer) rename to _get_leaderboard_inner;
  end if;
end $$;

revoke all on function public._get_leaderboard_inner(text, integer) from public, anon, authenticated;

create or replace function public.get_leaderboard(p_scope text default 'week', p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  -- Guests keep their own standing (Path, rail) but not the list of players.
  if public._is_anonymous() then
    raise exception 'LINK_REQUIRED' using errcode = '42501', hint = 'Save your desk to see the league.';
  end if;
  return public._get_leaderboard_inner(p_scope, p_limit);
end $$;

revoke all on function public.get_leaderboard(text, integer) from public, anon;
grant execute on function public.get_leaderboard(text, integer) to authenticated;
