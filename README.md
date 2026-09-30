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
pnpm deploy                              # add -- --env staging for staging
```

Then create the first admin. The script cannot create an account remotely — it promotes one
that already exists, because hashing a password the way Better Auth does is its business,
not a script's:

1. Open the deployed site and register as a guardian.
2. `pnpm bootstrap-admin --email you@example.com --remote [--env staging]`

That marks the account verified as well, so a first deploy works before email does.

### Subsequent deploys

Pushing to `main` is the deploy trigger. `.github/workflows/ci.yml` runs `pnpm check`,
`pnpm test` and `pnpm test:e2e`; only if all three pass does `deploy.yml` migrate and deploy
staging, and then wait for an approval on the `production` GitHub environment before doing
the same to production. Needs repository secrets `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID`, and both environments configured with a reviewer on production.

To deploy by hand instead: `pnpm deploy`.

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
