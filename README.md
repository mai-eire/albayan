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
