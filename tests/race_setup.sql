insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000e1', 'race@example.com') on conflict do nothing;
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
select public.open_problem('forge') is not null; select public.open_problem('halcyon') is not null;
