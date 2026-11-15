#!/usr/bin/env bash
# Runs the database rule tests on a local Postgres (port 5499, socket in /tmp). Usage: bash supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")/.."
P="psql -h /tmp -p 5499 -U postgres -v ON_ERROR_STOP=1 -q"
$P -d postgres -c 'drop database if exists nf_test' -c 'create database nf_test'
$P -d nf_test -f tests/00_supabase_stub.sql -f migrations/0001_init.sql -f migrations/0003_simple_profiles.sql -f migrations/0004_edit_profiles.sql -f seed.sql -f tests/zz_grants_for_test.sql
$P -d nf_test -f tests/01_rules_test.sql 2>&1 | grep -E 'ok  |FAIL|ERROR|PASSED'
