#!/usr/bin/env bash
# Local test run: fresh database → Supabase stub (with first-prototype tables) → schema twice → tests
set -euo pipefail
cd "$(dirname "$0")"
DB=vantaris_test
su postgres -c "dropdb --if-exists $DB && createdb $DB"
P="su postgres -c"
cp 00_supabase_stub.sql 10_security_and_rules.sql ../schema.sql /tmp/ && chmod 644 /tmp/*.sql
$P "psql -q -v ON_ERROR_STOP=1 -d $DB -f /tmp/00_supabase_stub.sql" >/dev/null
$P "psql -q -v ON_ERROR_STOP=1 -d $DB -f /tmp/schema.sql" >/dev/null && echo "schema: first run OK"
$P "psql -q -v ON_ERROR_STOP=1 -d $DB -f /tmp/schema.sql" >/dev/null && echo "schema: second run OK (idempotent)"
$P "psql -q -v ON_ERROR_STOP=1 -d $DB -f /tmp/10_security_and_rules.sql"
