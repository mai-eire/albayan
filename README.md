# Al-Bayan

Weekend Islamic school platform. Start with `docs/ROADMAP.md`.

```
pnpm install
pnpm dev        # http://localhost:3000, offline
pnpm check      # lint + typecheck + format check
pnpm preview    # production build served by the Workers runtime, still local
```

Requires Node 22 and pnpm 10 (`corepack enable pnpm`).

## Deploying

The app runs as one Cloudflare Worker per environment, each bound to its own D1 database
and R2 bucket. `staging` is a throwaway copy; the top level of `wrangler.jsonc` is
production.

| | Production | Staging |
|---|---|---|
| Worker | `albayan` | `albayan-staging` |
| URL | not deployed yet | https://albayan-staging.sweet-wave-5485.workers.dev |
| Database | `albayan` (WEUR) | `albayan-staging` (WEUR) |
| Files | `albayan-files` (EU) | `albayan-files-staging` (EU) |

Both databases and both buckets are in the EU because they hold children's records. The
buckets carry an enforced `jurisdiction`, not a location hint, so any `wrangler r2` command
against them needs `--jurisdiction eu`.

### Secrets

Two per environment, set once and never committed:

```
pnpm exec wrangler secret put BETTER_AUTH_SECRET [--env staging]   # signs session cookies
pnpm exec wrangler secret put BREVO_API_KEY      [--env staging]   # transactional email
```

Use a different `BETTER_AUTH_SECRET` per environment: a staging leak must not forge
production sessions. Generate one with `openssl rand -base64 32`.

`EMAIL_FROM` and `BETTER_AUTH_URL` are not secret and live in `wrangler.jsonc`.
`BETTER_AUTH_URL` must be the environment's exact origin — sign-in cookies and every link
in every email are built from it.

### First deploy of an environment

```
pnpm db:migrate:staging                  # create the tables (or db:migrate:production)
pnpm run deploy -- --env staging         # drop the --env for production
```

`pnpm run deploy`, not `pnpm deploy`: `deploy` is one of pnpm's own commands, and the bare
form tries to publish a workspace package instead of running the script.

Then create the first admin. The script cannot create an account remotely — it promotes one
that already exists, because hashing a password the way Better Auth does is its business,
not a script's:

1. Open the deployed site and register as a guardian.
2. `pnpm bootstrap-admin --email you@example.com --remote [--env staging]`

That marks the account verified as well, so a first deploy works before email does.

### Subsequent deploys

**Staging deploys itself.** Pushing to `main` runs `ci.yml`, which is one job graph:

```
check ──┬── e2e (3 shards)
        └── staging
```

`check` is lint, typecheck, format and the unit and integration tests — about two minutes.
Staging waits for that and *not* for e2e, so a push is live in roughly four: the staging
database is migrated, the Worker deployed, and `/login` fetched to prove it boots. e2e runs
beside it in three shards and is what gates production. Needs two repository secrets,
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

The trade is that staging can briefly run a commit whose e2e later failed. It holds fake
data and is not the school's site; four minutes to a working URL is worth more than the
guarantee. Production gets the opposite treatment — nothing reaches it without e2e green
and a person clicking.

**Production is released by hand** — `deploy-production.yml`, run from the Actions tab on a
ref you pick. It is not chained to staging: a release is a decision, and `BETTER_AUTH_URL`
is baked into every sign-in cookie and every link in every email, so deploying the wrong
origin is not a no-op. The workflow refuses to run while that var is still a placeholder.
Add a required reviewer on the `production` GitHub environment before the first release.

To deploy either by hand from a laptop: `pnpm run deploy [-- --env staging]`.

### Netlify, while the domain moves

A Worker can only answer on a domain whose nameservers point at Cloudflare. Until that move
happens, Netlify serves the same app on the domain against the **staging** database and
bucket — not production, which holds nothing yet anyway.

There are no bindings off Workers, so D1 is reached over its REST `/raw` endpoint through
`drizzle-orm/sqlite-proxy` and R2 over its S3 API with `aws4fetch`. `lib/cloudflare.ts` is
the only place that chooses. The Worker path is unchanged.

**This is a demo on the real domain, not a launch.** Every query is an API round trip, the
Cloudflare API allows roughly 1,200 requests per five minutes for the whole account, and one
page render here costs ten to twelve queries. A handful of people clicking is fine; a
registration evening is not.

Build command `pnpm build`, publish `.next`, via `@netlify/plugin-nextjs` (`netlify.toml`).

Secret, scoped to Functions:

```
CLOUDFLARE_D1_TOKEN        # custom API token, Account → D1 → Edit, nothing else
R2_ACCESS_KEY_ID           # an R2 API token, created for the EU jurisdiction
R2_SECRET_ACCESS_KEY
BETTER_AUTH_SECRET         # a NEW one; Wrangler secrets do not reach Netlify
BREVO_API_KEY
```

Plain variables — **not** secret, because Netlify's secrets scanning trips on values that
also appear in the repo, and the database id is in `wrangler.jsonc`:

```
CLOUDFLARE_ACCOUNT_ID=2d41aea86e9936a72e29accd2bd05be2
CLOUDFLARE_DATABASE_ID=141866ba-5473-4fec-8d9b-0100a2575ac5   # albayan-staging
R2_BUCKET=albayan-files-staging
EMAIL_TRANSPORT=brevo
EMAIL_FROM=Al-Bayan staging <noreply@mai.ie>
```

Every one of these must be set **on the site**, with its scope including Functions. Values
in `netlify.toml` are build-only and never reach the function runtime; neither do variables
scoped to Builds. Netlify's own `NETLIFY=true` is reserved — it cannot be set by hand — and
is build-only as well, so it is no use as a signal. Of Netlify's automatic variables only
`URL`, `SITE_NAME` and `SITE_ID` are readable at runtime, and `SITE_ID` is what the app uses
to notice it is not on a Worker. Nothing has to be set to switch the transport on.
`DATA_TRANSPORT=http` forces it, for a host that is not Netlify.

Netlify rejects a bulk paste that contains a reserved name, so a block beginning
`NETLIFY=true` saves **nothing at all**. If the site 500s, read the message: a missing
variable now names itself.

`BETTER_AUTH_URL` is deliberately **not** set here while the domain is unsettled. Without it
`appOrigin` derives the origin from the request instead (`lib/app-url.ts`), which is correct
on Netlify but comes from the `Host` header — so a request carrying a forged host would put
that host into a password-reset or invite link. Acceptable for a staging stand-in whose demo
accounts all use the password `password`; set it before any real family has an account.

Netlify applies variables on the *next* deploy, so redeploy after adding them.

Nothing local can reach the token — dev, `vitest` and the e2e server always use bindings —
because `getCloudflareContext({ async: true })` does not fail without a Worker *locally*: it
falls back to wrangler and returns a real, local miniflare database. A deployment that
inferred its environment from that call succeeding would come up showing a school with no
students and silently lose every write. In a deployed function the same call fails instead,
with `ERR_MODULE_NOT_FOUND: wrangler`, because wrangler is not in the bundle — which says
nothing about the real mistake, so `lib/cloudflare.ts` replaces it with one that does.
To prove the HTTP path locally, build and run it with the real values:

```
DATA_TRANSPORT=http NODE_ENV=production CLOUDFLARE_D1_TOKEN=… pnpm exec next start
```

**Removing it**, once DNS is on Cloudflare: delete `netlify.toml`, `lib/db/http.ts`, the
`s3Store` half of `lib/storage/bucket.ts` and the choice in `lib/cloudflare.ts`, drop
`aws4fetch` and `@netlify/plugin-nextjs`, then revoke both tokens. `D1:Edit` cannot be
scoped to one database, so that token can write every database in the account — it should
not outlive the stand-in.

### Backups

D1 keeps **30 days of history automatically** (Time Travel). Nothing to set up, and it is
the right tool for "someone deleted something on Tuesday":

```
pnpm exec wrangler d1 time-travel info albayan
pnpm exec wrangler d1 time-travel restore albayan --timestamp=2026-09-30T09:00:00Z
```

For a copy that outlives those 30 days, export to a file the school keeps:

```
pnpm exec wrangler d1 export albayan --remote --output=albayan-$(date +%F).sql
```

There is deliberately **no scheduled job that copies the database anywhere**. An export is
every child's name, date of birth, address and medical notes; putting that on a CI artifact
store or a third-party bucket creates a copy nobody is watching. The export is run by a
person, onto storage the school controls, and deleted when it is superseded.
