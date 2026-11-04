\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

-- Users: A (free → pro), B (free), plus messy sign-up metadata
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"display_name": "   Alice\u0007x   "}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com', '{}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@example.com', jsonb_build_object('display_name', repeat('Z', 300))),
  ('00000000-0000-0000-0000-00000000000d', 'd@example.com', '{"display_name": 42}');

select t.ok((select display_name from public.profiles where id = '00000000-0000-0000-0000-00000000000a') = 'Alicex', 'sign-up name is cleaned');
select t.ok((select display_name from public.profiles where id = '00000000-0000-0000-0000-00000000000b') = 'Analyst', 'missing name falls back to Analyst');
select t.ok((select char_length(display_name) from public.profiles where id = '00000000-0000-0000-0000-00000000000c') = 40, 'long name is cut to 40');
select t.ok((select count(*) from public.profiles where id = '00000000-0000-0000-0000-0000000000aa') = 1, 'early user got a new profile after upgrade');
select t.ok(not exists (select 1 from information_schema.tables where table_name = 'deal_history'), 'old deal_history table removed');

-- ===================== Player A (free) =====================
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';

select t.ok((select count(*) from public.profiles) = 1, 'A sees only own profile');
select t.expect_error($$update public.profiles set points = 99999$$, 'permission denied');
select t.expect_error($$insert into public.profiles (id) values (gen_random_uuid())$$, 'permission denied');
select t.expect_error($$delete from public.profiles$$, 'permission denied');
select t.expect_error($$insert into public.subscriptions (plan_id, tier, razorpay_subscription_id, razorpay_plan_id, livemode, status) values ('pro_monthly','pro','sub_HACK0000000001','plan_x',true,'active')$$, 'permission denied');
select t.expect_error($$update public.plans set amount = 100$$, 'permission denied');
select t.expect_error($$insert into public.points_ledger (user_id, amount, reason, local_date) values (auth.uid(), 5000, 'hack', current_date)$$, 'permission denied');
select t.expect_error($$update public.problem_attempts set correct = true, points = 999$$, 'permission denied');
select t.expect_error($$select answer from public.problems$$, 'permission denied');
select t.expect_error($$select steps from public.problems$$, 'permission denied');
select t.expect_error($$select * from public.problems$$, 'permission denied');
select t.expect_error($$select * from public.webhook_events$$, 'permission denied');
select t.expect_error($$select public.user_tier(auth.uid())$$, 'permission denied');
select t.expect_error($$select public.apply_razorpay_subscription('{"id":"sub_HACK0000000001","status":"active","plan_id":"plan_x"}', true, null, auth.uid(), 'elite_monthly')$$, 'permission denied');
select t.expect_error($$select public.begin_tutor_turn(auth.uid(), 'forge')$$, 'permission denied');
select t.expect_error($$select public._ensure_profile(gen_random_uuid())$$, 'permission denied');
select t.ok((select count(*) from public.problems) = 20, 'catalog columns are listable (id, title...)');
select t.ok((select count(*) from (select id, title, difficulty from public.problems) x) = 20, 'safe columns readable');

-- Opening a problem: question yes, answer/steps no
select t.ok(not ((public.open_problem('forge') -> 'problem') ?| array['answer', 'steps', 'concept', 'formula', 'hints']), 'open_problem hides answer, steps, concept, formula, hints');
select t.ok((public.open_problem('forge') -> 'result') = 'null'::jsonb, 'no result before submit');
select t.ok(jsonb_array_length(public.open_problem('forge') -> 'problem' -> 'options') = 4, 'four options returned');
select t.expect_error($$select public.open_problem('halden')$$, 'LEVEL_LOCKED');
select t.expect_error($$select public.open_problem('does-not-exist')$$, 'NOT_FOUND');
select public.open_problem('halcyon') is not null;
select public.open_problem('corbel') is not null;
select t.expect_error($$select public.open_problem('veridian')$$, 'QUOTA_REACHED');
select t.ok(public.open_problem('forge') is not null, 're-opening an already opened problem does not use quota');
select t.ok((public.get_me() -> 'quota' ->> 'remaining')::int = 0, 'quota shows 0 remaining');

-- Submitting
select t.expect_error($$select public.submit_answer('forge', 'z')$$, 'INVALID_CHOICE');
select t.expect_error($$select public.submit_answer('atlas', 'b')$$, 'NOT_OPENED');
select t.ok((public.submit_answer('forge', 'b') -> 'result' ->> 'correct')::boolean, 'correct answer scores');
select t.ok((select points between 10 and 15 from public.problem_attempts where problem_id = 'forge'), 'points = 10 x difficulty with up to 50% speed bonus');
select t.ok((public.submit_answer('forge', 'a') ->> 'already_submitted')::boolean, 'second submit is not scored again');
select t.ok((public.submit_answer('forge', 'a') -> 'result' ->> 'choice') = 'b', 'original choice kept');
select t.ok(jsonb_array_length(public.open_problem('forge') -> 'result' -> 'steps') = 2, 'free plan sees first two steps');
select t.ok((public.open_problem('forge') -> 'result' ->> 'steps_locked')::boolean, 'remaining steps flagged as locked');
select t.ok(not (public.submit_answer('halcyon', 'a') -> 'result' ->> 'correct')::boolean, 'wrong answer');
select t.ok((public.get_me() -> 'profile' ->> 'solved')::int = 1 and (public.get_me() -> 'profile' ->> 'attempted')::int = 2, 'solved/attempted counters');
select t.ok((public.get_me() -> 'profile' ->> 'streak')::int = 1, 'streak started');
select t.ok(jsonb_array_length(public.get_me() -> 'week') = 7, 'seven-day chart');
select t.ok((public.get_me() -> 'daily') is not null, 'daily deal picked');
select t.ok((select count(*) from public.points_ledger) = 1, 'one ledger entry');

-- Profile edits
select t.ok((public.save_profile('  Player A  ', 'Example School', 'pe', 'Asia/Kolkata', true) -> 'profile' ->> 'display_name') = 'Player A', 'save_profile trims');
select t.expect_error($$select public.save_profile(null, null, 'hacker')$$, 'INVALID_GOAL');
select t.expect_error($$select public.save_profile(null, null, null, 'Mars/Olympus')$$, 'INVALID_TIMEZONE');
select t.expect_error($$select public.save_profile('     ')$$, 'INVALID_NAME');
select t.ok((public.save_profile(null, '') -> 'profile' ->> 'school') is null, 'school can be cleared');
select public.save_profile(null, 'Example School') is not null;

-- Leaderboard
select t.ok((public.get_leaderboard('week') -> 'me' ->> 'rank')::int = 1, 'A ranks first this week');
select t.expect_error($$select public.get_leaderboard('forever')$$, 'INVALID_SCOPE');
select t.ok(not ((public.get_leaderboard('all') -> 'rows' -> 0) ?| array['id', 'email', 'user_id']), 'leaderboard exposes no ids or emails');

-- ===================== Player B =====================
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select t.ok((select count(*) from public.problem_attempts) = 0, 'B cannot see A''s attempts');
select t.ok((select count(*) from public.points_ledger) = 0, 'B cannot see A''s points');
select t.ok((select count(*) from public.profiles) = 1, 'B sees only own profile');
select t.ok((public.get_leaderboard('week') -> 'rows' -> 0 ->> 'name') = 'Player A', 'B sees A on leaderboard by name');
select t.ok((public.get_leaderboard('week') -> 'me' ->> 'rank') is null, 'B not ranked yet');

-- ===================== Anonymous =====================
reset request.jwt.claim.sub;
set role anon;
select t.ok((select count(*) from public.plans) = 6, 'anon can read plans');
select t.ok((select count(*) from public.tiers) = 4, 'anon can read tiers');
select t.expect_error($$select public.get_me()$$, 'permission denied');
select t.expect_error($$select public.open_problem('forge')$$, 'permission denied');
select t.expect_error($$select * from public.profiles$$, 'permission denied');

-- ===================== Server (service role) =====================
reset role;
set role service_role;
select t.ok((public.apply_razorpay_subscription(
  jsonb_build_object('id', 'sub_TEST0000000001', 'plan_id', 'plan_TEST0000000001', 'status', 'created'),
  false, null, '00000000-0000-0000-0000-00000000000a', 'pro_monthly')).status = 'created', 'subscription row created');
select t.ok(public.user_tier('00000000-0000-0000-0000-00000000000a') = 'free', 'created (unpaid) subscription gives no access');
select (public.apply_razorpay_subscription(
  jsonb_build_object('id', 'sub_TEST0000000001', 'plan_id', 'plan_TEST0000000001', 'status', 'active',
                     'customer_id', 'cust_TEST000000001', 'paid_count', 1,
                     'current_start', extract(epoch from now())::bigint,
                     'current_end', extract(epoch from now() + interval '30 days')::bigint),
  false, now())).status;
select t.ok(public.user_tier('00000000-0000-0000-0000-00000000000a') = 'pro', 'active subscription gives Pro');
select t.ok((select razorpay_customer_id from public.billing_customers where user_id = '00000000-0000-0000-0000-00000000000a') = 'cust_TEST000000001', 'razorpay_customer_id recorded');
select (public.apply_razorpay_subscription(
  jsonb_build_object('id', 'sub_TEST0000000001', 'status', 'halted'), false, now() - interval '1 hour')).status;
select t.ok((select status::text from public.subscriptions where razorpay_subscription_id = 'sub_TEST0000000001') = 'active', 'older webhook ignored (out-of-order delivery)');
select (public.apply_razorpay_subscription(
  jsonb_build_object('id', 'sub_TEST0000000001', 'status', 'some_new_status'), false, now())).status;
select t.ok((select status::text from public.subscriptions where razorpay_subscription_id = 'sub_TEST0000000001') = 'active', 'unknown status keeps current status');
select t.expect_error($$select public.apply_razorpay_subscription('{"id":"sub_UNKNOWN00000001","status":"active"}', false)$$, 'UNKNOWN_SUBSCRIPTION');
select t.expect_error($$select public.apply_razorpay_subscription('{"id":"x; drop table users","status":"active"}', false)$$, 'INVALID_SUBSCRIPTION_ID');

select public.apply_razorpay_payment(jsonb_build_object(
  'id', 'pay_TEST0000000001', 'amount', 99900, 'currency', 'INR', 'status', 'captured', 'method', 'card',
  'card', jsonb_build_object('last4', '1111', 'network', 'Visa'), 'invoice_id', 'inv_TEST000000001'), false, 'sub_TEST0000000001');
select public.apply_razorpay_payment(jsonb_build_object(
  'id', 'pay_TEST0000000001', 'amount', 99900, 'currency', 'INR', 'status', 'authorized'), false, 'sub_TEST0000000001');
select t.ok((select status from public.payments where razorpay_payment_id = 'pay_TEST0000000001') = 'captured', 'payment status never goes backwards');
select t.ok((select user_id from public.payments where razorpay_payment_id = 'pay_TEST0000000001') = '00000000-0000-0000-0000-00000000000a', 'payment linked to player');

select t.ok((public.begin_tutor_turn('00000000-0000-0000-0000-00000000000b', 'forge') ->> 'reason') = 'PLAN', 'free player has no tutor');
select t.ok((public.begin_tutor_turn('00000000-0000-0000-0000-00000000000a', 'atlas') ->> 'reason') = 'NOT_OPENED', 'tutor needs the problem opened');
select t.ok((public.begin_tutor_turn('00000000-0000-0000-0000-00000000000a', 'forge') -> 'solution') <> 'null'::jsonb, 'tutor sees solution after submit');
reset role;

-- ===================== Player A (now Pro) =====================
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select t.ok((public.get_me() -> 'tier' ->> 'id') = 'pro', 'A is Pro');
select t.ok(public.open_problem('veridian') is not null, 'Pro has no weekly quota');
select t.ok(public.open_problem('halden') is not null, 'Pro opens Associate');
select t.ok(public.open_problem('pinnacle') is not null, 'Pro opens VP');
select t.expect_error($$select public.open_problem('solstice')$$, 'LEVEL_LOCKED');
select t.ok(jsonb_array_length(public.open_problem('forge') -> 'result' -> 'steps') = 5, 'Pro sees full walkthrough');
select t.ok((public.get_me() -> 'subscription' -> 'payment_method' ->> 'card_last4') = '1111', 'card shown on profile');
reset role;

set role service_role;
select t.ok((public.begin_tutor_turn('00000000-0000-0000-0000-00000000000a', 'pinnacle') -> 'solution') = 'null'::jsonb, 'tutor gets no solution before submit');
select count(*) from (select public.begin_tutor_turn('00000000-0000-0000-0000-00000000000a', 'pinnacle') from generate_series(1, 38)) x;
select t.ok((public.begin_tutor_turn('00000000-0000-0000-0000-00000000000a', 'pinnacle') ->> 'reason') = 'LIMIT', 'tutor daily limit of 40 enforced');
select public.refund_tutor_turn((select max(id) from public.ai_usage));
select t.ok((public.begin_tutor_turn('00000000-0000-0000-0000-00000000000a', 'pinnacle') ->> 'allowed')::boolean, 'refunded message can be used again');

-- Cancelled subscription → back to free
select (public.apply_razorpay_subscription(
  jsonb_build_object('id', 'sub_TEST0000000001', 'status', 'cancelled', 'ended_at', extract(epoch from now())::bigint),
  false, now() + interval '1 minute')).status;
select t.ok(public.user_tier('00000000-0000-0000-0000-00000000000a') = 'free', 'cancelled subscription removes access');
reset role;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select t.ok(jsonb_array_length(public.open_problem('forge') -> 'result' -> 'steps') = 2, 'walkthrough locks again after cancel');
select t.expect_error($$select public.submit_answer('pinnacle', 'b')$$, 'LEVEL_LOCKED');
reset role;

-- ===================== Account deletion =====================
delete from auth.users where id = '00000000-0000-0000-0000-00000000000a';
select t.ok(not exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-00000000000a'), 'profile deleted with account');
select t.ok(not exists (select 1 from public.problem_attempts where user_id = '00000000-0000-0000-0000-00000000000a'), 'attempts deleted with account');
select t.ok((select user_id from public.payments where razorpay_payment_id = 'pay_TEST0000000001') is null, 'payment record kept, unlinked from deleted user');
select t.ok((select user_id from public.subscriptions where razorpay_subscription_id = 'sub_TEST0000000001') is null, 'subscription record kept, unlinked');

-- ===================== Public stats (landing page) =====================
set role anon;
select t.ok(public.get_public_stats() ?& array['deals_solved', 'players', 'problems', 'modules'], 'anon can read aggregate stats');
select t.ok((select count(*) from jsonb_object_keys(public.get_public_stats())) = 4, 'public stats expose only the four counts');
select t.ok((public.get_public_stats() ->> 'problems')::int = 20, 'public stats count published problems');
select t.expect_error($$select public.get_me()$$, 'permission denied');
reset role;

select 'ALL TESTS PASSED';
