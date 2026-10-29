#!/usr/bin/env bash
# Concurrency checks (run after run.sh): last free slot, double submit.
set -euo pipefail
DB=vantaris_test; P="su postgres -c"
cp "$(dirname "$0")/race_setup.sql" /tmp/ && chmod 644 /tmp/race_setup.sql
$P "psql -q -At -d $DB -f /tmp/race_setup.sql" >/dev/null
for p in corbel veridian lumen byteshift atlas northwind; do
  printf "set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1'; select public.open_problem('%s') is not null;" "$p" > /tmp/race_$p.sql; chmod 644 /tmp/race_$p.sql
  ($P "psql -q -At -d $DB -f /tmp/race_$p.sql" > /tmp/race_$p.out 2>&1 &)
done; sleep 3
echo "opens that got the last free slot (expect 1): $(grep -l '^t$' /tmp/race_*.out | wc -l)"
for i in 1 2 3 4 5 6; do
  printf "set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1'; select public.submit_answer('forge','b')->>'already_submitted';" > /tmp/sub_$i.sql; chmod 644 /tmp/sub_$i.sql
  ($P "psql -q -At -d $DB -f /tmp/sub_$i.sql" > /tmp/sub_$i.out 2>&1 &)
done; sleep 3
echo "scored submissions (expect 1): $(cat /tmp/sub_*.out | grep -c '^false$')"
