# End-to-end test: sign-up and booking flow

Runs the real site against a small local Supabase stand-in (Postgres, GoTrue auth, PostgREST, Mailpit for emails).

What it checks, in a browser:
1. Company owner signs in with an email code, registers a company, creates a technician invite.
2. Technician opens the invite and creates a profile; a solo pro registers with a license.
3. Client sends "Request a visit" to the company; the office assigns the technician; the client sees who is coming.
4. Client books the solo pro for a time slot; the pro confirms, starts and finishes the job; the job counter goes up.
5. Client posts a five-skill review.

Setup used (Docker, host network): `supabase/postgres` on 5432, `supabase/gotrue` on 9999, `postgrest/postgrest` on 3001,
`axllent/mailpit` (SMTP 54325, API 54324), and `node gateway.cjs` on 54321 (routes `/auth/v1` and `/rest/v1`, adds CORS).
Then build the site with `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321` and the anon key, start it on port 3100 and run
`node signup-flow.cjs`. The test wipes all users and data in that local database first. Never point it at the real project.
