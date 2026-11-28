-- Elite's coach is capped at 300 messages a day (tutor_daily_limit): say so.
update public.tiers
   set features = array['Everything in Pro', 'Vale, your AI coach: 300 messages a day', 'MD desk: deal structuring', 'The Elite member card']
 where id = 'elite';
