# End-to-end test: sign-up and booking flow

Runs the real site against a small local Supabase stand-in (Postgres, GoTrue auth, PostgREST, Mailpit for emails).

What it checks, in a browser:
1. Company owner signs in with an email code, registers a company, creates a technician invite.
2. Technician opens the invite and creates a profile; a solo pro registers with a license.
3. Client sends "Request a visit" to the company; the office assigns the technician; the client sees who is coming.
4. Client books the solo pro for a time slot; the pro confirms, starts and finishes the job; the job counter goes up.
5. Client posts a five-skill review; the pro rates the client, which publishes the review; the pro replies.
Also: an admin approves the company and pros with buttons, the pro edits the profile, client and pro chat.

Quick start: `bash tests/e2e/local-stack.sh /tmp/nf` starts everything below and applies the migrations.

Setup used (Docker, host network): `supabase/postgres` on 5432, `supabase/gotrue` on 9999, `postgrest/postgrest` on 3001,
`axllent/mailpit` (SMTP 54325, API 54324), `supabase/storage-api` on 5000 (file backend), and `node gateway.cjs` on 54321 (routes `/auth/v1`, `/rest/v1`, `/storage/v1`, adds CORS).
Apply the migrations (0002 as `supabase_admin`). Then build the site with `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321` and the anon key, start it on port 3100 and run
`IMG_DIR=<folder with face.jpg, w1.jpg, w2.jpg> node signup-flow.cjs`. It also uploads an avatar, work photos and before/after job photos. The test wipes all users and data in that local database first. Never point it at the real project.
