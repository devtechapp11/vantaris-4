-- The zero-trust lockdown removed default table privileges, service_role's
-- included. The lesson Edge Functions (service role) need exactly these.
grant select, insert on public.lesson_sessions   to service_role;
grant select, insert on public.lesson_items      to service_role;
grant select, insert on public.exercise_pool     to service_role;
grant select         on public.exercise_attempts to service_role;
grant select         on public.skill_mastery     to service_role;
