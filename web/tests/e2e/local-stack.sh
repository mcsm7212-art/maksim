#!/usr/bin/env bash
# Starts a throwaway local Supabase stand-in for browser tests (Docker, host network). Never use with real data.
# Ports: Postgres 5432, auth 9999, REST 3001, storage 5000, gateway 54321, Mailpit 54324 (API) / 54325 (SMTP).
# Writes the anon key to $OUT/keys.env. Usage: bash tests/e2e/local-stack.sh <out-dir>
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; WEB="$(cd "$HERE/../.." && pwd)"; OUT="${1:-/tmp/nf-stack}"; mkdir -p "$OUT"
S=super-secret-jwt-token-with-at-least-32-characters-long
pgrep -x dockerd >/dev/null || { (dockerd > "$OUT/dockerd.log" 2>&1 &); sleep 6; }
docker rm -f nfdb nfauth nfrest nfmail nfstore >/dev/null 2>&1 || true
node -e "
const c=require('crypto');const b=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
const k=r=>{const h=b({alg:'HS256',typ:'JWT'}),p=b({role:r,iss:'supabase-demo',exp:1983812996});return h+'.'+p+'.'+c.createHmac('sha256','$S').update(h+'.'+p).digest('base64url')};
require('fs').writeFileSync('$OUT/keys.env','ANON='+k('anon')+'\nSERVICE='+k('service_role')+'\n')"
source "$OUT/keys.env"
docker run -d --name nfdb --network host -e POSTGRES_PASSWORD=postgres -e JWT_SECRET=$S supabase/postgres:17.6.1.043 -c listen_addresses=127.0.0.1 >/dev/null
for i in $(seq 1 60); do PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -tAc 'select 1' >/dev/null 2>&1 && break; sleep 1; done; sleep 3
docker run -d --name nfmail --network host axllent/mailpit:v1.27 --smtp 127.0.0.1:54325 --listen 127.0.0.1:54324 >/dev/null
docker run -d --name nfauth --network host -e GOTRUE_API_HOST=127.0.0.1 -e GOTRUE_API_PORT=9999 -e API_EXTERNAL_URL=http://localhost:54321/auth/v1 \
 -e GOTRUE_DB_DRIVER=postgres -e GOTRUE_DB_DATABASE_URL='postgres://supabase_auth_admin:postgres@127.0.0.1:5432/postgres' \
 -e GOTRUE_SITE_URL=http://localhost:3100 -e GOTRUE_URI_ALLOW_LIST='http://localhost:3100/**' -e GOTRUE_JWT_SECRET=$S -e GOTRUE_JWT_EXP=3600 -e GOTRUE_JWT_AUD=authenticated -e GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated -e GOTRUE_JWT_ADMIN_ROLES=service_role \
 -e GOTRUE_EXTERNAL_EMAIL_ENABLED=true -e GOTRUE_MAILER_AUTOCONFIRM=false -e GOTRUE_SMTP_HOST=127.0.0.1 -e GOTRUE_SMTP_PORT=54325 -e GOTRUE_SMTP_ADMIN_EMAIL=admin@novafides.local -e GOTRUE_SMTP_SENDER_NAME=NovaFides \
 -e GOTRUE_MAILER_URLPATHS_CONFIRMATION=/auth/v1/verify -e GOTRUE_MAILER_URLPATHS_RECOVERY=/auth/v1/verify -e GOTRUE_MAILER_URLPATHS_MAGIC_LINK=/auth/v1/verify -e GOTRUE_RATE_LIMIT_EMAIL_SENT=1000 -e GOTRUE_SMTP_MAX_FREQUENCY=1s \
 supabase/gotrue:v2.182.1 >/dev/null
docker run -d --name nfstore --network host -e ANON_KEY=$ANON -e SERVICE_KEY=$SERVICE -e AUTH_JWT_SECRET=$S -e PGRST_JWT_SECRET=$S \
 -e DATABASE_URL='postgres://supabase_storage_admin:postgres@127.0.0.1:5432/postgres' -e STORAGE_BACKEND=file -e FILE_STORAGE_BACKEND_PATH=/var/lib/storage \
 -e TENANT_ID=stub -e REGION=local -e GLOBAL_S3_BUCKET=stub -e FILE_SIZE_LIMIT=52428800 -e PORT=5000 -e SERVER_PORT=5000 -e HOST=127.0.0.1 -e SERVER_HOST=127.0.0.1 \
 supabase/storage-api:v1.28.0 >/dev/null
for i in $(seq 1 60); do [ "$(PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -tAc "select count(*) from information_schema.columns where (table_schema, table_name, column_name) in (('auth','users','id'),('storage','buckets','public'),('storage','objects','user_metadata'))")" = 3 ] && sleep 3 && break; sleep 1; done
cd "$WEB/supabase"
PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 -q -f migrations/0001_init.sql >/dev/null
PGPASSWORD=postgres psql -h 127.0.0.1 -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -q -f migrations/0002_storage.sql
for f in migrations/000[3-9]_*.sql; do PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 -q -f "$f"; done
PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 -q -f seed.sql
docker run -d --name nfrest --network host -e PGRST_DB_URI='postgres://authenticator:postgres@127.0.0.1:5432/postgres' -e PGRST_DB_SCHEMAS=public -e PGRST_DB_ANON_ROLE=anon -e PGRST_JWT_SECRET=$S -e PGRST_SERVER_PORT=3001 -e PGRST_SERVER_HOST=127.0.0.1 postgrest/postgrest:v12.2.3 >/dev/null
fuser -k 54321/tcp >/dev/null 2>&1 || true; (node "$HERE/gateway.cjs" > "$OUT/gateway.log" 2>&1 &)
sleep 3; echo "stack up; anon key in $OUT/keys.env"
