#!/usr/bin/env bash
# Runs the database rule tests on a local Postgres (port 5499, socket in /tmp). Usage: bash supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")/.."
P="psql -h /tmp -p 5499 -U postgres -v ON_ERROR_STOP=1 -q"
$P -d postgres -c 'drop database if exists nf_test' -c 'create database nf_test'
$P -d nf_test -f tests/00_supabase_stub.sql -f migrations/0001_init.sql -f migrations/0003_simple_profiles.sql -f migrations/0004_edit_profiles.sql -f migrations/0005_chat_photos_and_online.sql -f migrations/0006_invoices.sql -f migrations/0007_calendar.sql -f migrations/0008_grants.sql -f migrations/0009_handles_cards.sql -f migrations/0010_founding_pros.sql -f migrations/0011_social.sql -f migrations/0012_urgent.sql -f migrations/0013_figure.sql -f migrations/0014_community.sql -f migrations/0015_pro_controls_neighbors.sql -f migrations/0016_photo_search.sql -f migrations/0017_job_parts.sql -f migrations/0018_quotes_orders.sql -f migrations/0019_trust_social.sql -f migrations/0020_requests_demo.sql -f migrations/0021_review_weights.sql -f migrations/0022_terms.sql -f seed.sql -f tests/zz_grants_for_test.sql
$P -d nf_test -f tests/01_rules_test.sql 2>&1 | grep -E 'ok  |FAIL|ERROR|PASSED'
