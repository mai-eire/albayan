# Phase 0 — Foundation

Goal: a deployable skeleton with the data model, auth, role routing, access layer, seed data and CI — and a working **offline** dev loop. No school features yet.

Ends with the **OpenNext checkpoint** (task 15). Estimated ≈1 week.

Definition of done for the phase: a new contributor can `git clone && pnpm install && pnpm dev`, log in as the seeded admin, switch to a seeded teacher-parent and see both role areas, run `pnpm test` green with no network, and the staging Worker serves the login page.

## Tasks

- [x] **1. Scaffold** — Next.js 16 + TypeScript via `npm create cloudflare@latest -- --framework=next` (OpenNext adapter), pnpm, ESLint + Prettier, `pnpm check`. `.gitignore` covers `.wrangler/`, `.open-next/`, `.dev/`, `.env*`.
  DoD: `pnpm dev` serves a page offline; `pnpm build && wrangler dev` serves the same page.

- [x] **2. UI base** — Mantine 9 implementing `docs/DESIGN.md` §2–3: `lib/theme.ts` (colour tuples, type scale, radius, component defaults), fonts via `next/font`, PostCSS preset, `ColorSchemeScript` + scheme toggle, `AppShell` per §3.1 (sidebar + top bar, drawer on mobile, bottom tabs for the student area), and the first shared components: `PageHeader`, `StatTile`, `StatusBadge`, `SubjectBadge`, `EmptyState`. Both colour schemes checked.
  DoD: placeholder pages at `/admin`, `/teach`, `/family`, `/student` render inside the shell.

- [x] **3. Drizzle + local D1** — `lib/db/schema/*.ts`, `drizzle.config.ts`, `pnpm db:generate` (drizzle-kit → SQL migrations), `pnpm db:migrate:local` (`wrangler d1 migrations apply --local`), typed `db()` accessor from the OpenNext binding.
  DoD: a migration applies to the local SQLite file; a smoke query runs from a Server Component.

- [x] **4. Schema v1** — identity (`users` + Better Auth tables), people (`guardians`, `students`, `student_guardians`, `teachers`), academics (`academic_years`, `terms`, `school_sessions`, `session_periods`, `subjects`, `classes`, `teaching_assignments`, `enrolments`), platform (`school_settings`, `notifications`, `audit_log`). Constraints per PLAN §4: unique active enrolment per student, one-of checks on `session_periods`, JSON list columns, CHECK-constrained enums.
  Daily-work, fees and events tables are added in their own phases, not now.
  DoD: migration generated and applied; types exported; constraints verified by an integration test that violates each one.

- [x] **5. Email transport** — `lib/email/transport.ts` with `file` (writes `.dev/mail/<ts>-<subject>.html`, logs a line with any link) and `resend` implementations; React Email base template.
  DoD: `pnpm test` exercises the file transport; no Resend key needed locally.

- [x] **6. Better Auth** — email/password + username plugin, Drizzle adapter, cookie sessions; pages: `/login` (accepts email *or* student ID), `/logout`, `/forgot-password`, `/reset-password`, `/invite/[token]`; forced password change flag for OTP accounts.
  DoD: login/logout works; reset email lands in `.dev/mail/` and the link works.

- [x] **7. Bootstrap admin** — `pnpm bootstrap-admin --email … --name …` creates the first admin (idempotent). No public admin signup exists anywhere.
  DoD: fresh DB → script → login as admin.

- [x] **8. Role derivation + routing** — `getCurrentUser()` loads user + optional guardian/teacher/student rows once per request; `/` redirects to the user's (first) area; route-group layouts guard `/admin`, `/teach`, `/family`, `/student`; role switcher in the top bar for multi-role users.
  DoD: a teacher hitting `/admin` is redirected; a teacher-parent sees the switcher and both areas.

- [ ] **9. `lib/access.ts`** — `requireAdmin/Teacher/Guardian/Student`, `canViewStudent`, `teachesClass`, `teachesSubjectIn`, `isGuardianOf`. Pure functions over loaded data where possible; DB lookups isolated.
  DoD: unit tests cover every rule × every role, including self, none, class-teacher-without-subject, and ended enrolments.

- [ ] **10. Server action convention** — `lib/actions.ts` helper: `action(schema, handler)` doing Zod parse → handler with `{ user, db }` → typed `{ ok } | { error }` result; `audit()` helper; one example action (update school settings) used as the reference implementation.
  DoD: example action wired to a form on `/admin/settings`; audit row written; test covers validation failure and access denial.

- [ ] **11. Storage adapter** — `lib/storage/bucket.ts` over the R2 binding (works against local emulation); `POST /api/files` and `GET /api/files/[key]` route handlers streaming through the Worker, with the auth hook stubbed to admin-only until `resources` exists in Phase 2.
  DoD: upload then download a 20 MB file locally; unauthenticated request is rejected.

- [ ] **12. Seed** — `pnpm db:seed`: school settings, year `2026-27` with 3 terms, Saturday + Sunday sessions each with a 4-period schedule (Quran, Arabic, Break, Islamic Studies), 3 subjects, 4 classes per session, 8 teachers (one also a guardian), 40 families / 60 students with siblings, teaching assignments, enrolments with fees. Deterministic (fixed seed) so tests can rely on it.
  DoD: seed runs on an empty local DB in < 5 s and is idempotent (re-run resets).

- [ ] **13. Tests** — Vitest unit; Vitest workers pool integration on a throwaway local D1; Playwright with one smoke flow (admin logs in, sees dashboard shell). `pnpm test` runs unit + integration; `pnpm test:e2e` runs Playwright.
  DoD: all green offline; CI-ready.

- [ ] **14. CI + Cloudflare** — GitHub Actions: `pnpm check` + `pnpm test` on PRs; deploy job on `main`: `wrangler d1 migrations apply` (staging then prod, remote) → `opennextjs-cloudflare deploy`. Create Worker, D1 (prod + staging), R2 buckets, `wrangler.toml` envs, secrets (`RESEND_API_KEY`, `BETTER_AUTH_SECRET`).
  DoD: staging URL serves `/login`; migrations applied remotely.

- [ ] **15. OpenNext checkpoint** — write a short note in this file: what (if anything) hurt (build times, unsupported features, dev-binding quirks). Decide: stay on Next.js or move to React Router v7 before any feature code. Record the decision in PLAN §1.

## Decisions to make during Phase 0 (small, record them here)

- **Next.js 16, not 15** (2026-09-15). The OpenNext C3 template ships Next 16.3; it is the line the adapter targets, so pinning 15 would mean fighting the tooling. App Router, server actions and route groups are unchanged for our purposes. Next 16 differs from older docs — check `node_modules/next/dist/docs/` before using an API from memory.
- **Mantine 9, not 8** (2026-09-16). 9.6 was current when task 2 started; the 8→9 changes are small (a few prop renames, `defaultRadius` now `md` as DESIGN.md wants, built-in Zod resolver in `@mantine/form`). Requires React ≥ 19.2, which Next 16 ships.
- **Server → client boundaries.** `MantineProvider` takes a function (`cssVariablesResolver`), so it lives in the client `components/Providers.tsx`; Server Components can't pass `component={Link}` to Mantine, so navigation buttons use `components/LinkButton.tsx`.
- `@playwright/test` was added in task 2 (ahead of task 13) to screenshot pages in both colour schemes and at phone width against the installed Chrome (`channel: "chrome"`, no browser download).
- **Integration tests use `getPlatformProxy`** (wrangler → Miniflare in-process) with a temp `persist` dir and the `drizzle/*.sql` migrations applied by hand (`test/db.ts`), instead of `@cloudflare/vitest-pool-workers`. Same D1 implementation, plain Node test runner, one dependency fewer. Revisit only if a test needs Workers-runtime APIs.
- **Better Auth tables** use ISO-text timestamps via a custom Drizzle type (`isoDate` in `lib/db/columns.ts`) so the whole DB stays readable; Better Auth sees `Date`s. Password hashes live in `accounts.password` (Better Auth's layout), not on `users` as PLAN §4 sketched. Column names are snake_case in SQLite (`casing: "snake_case"`), camelCase in TypeScript.
- **Better Auth needs an email on every user.** Students who have none get a synthetic unique address, `<studentid>@students.invalid`, set on approval (Phase 1); it is never shown or emailed. Student ID doubles as the Better Auth username (case-insensitive, hyphens allowed).
- **Invites** are our own tokens in Better Auth's `verifications` table (`lib/invites.ts`), seven-day expiry, single use; accepting sets the password through Better Auth's internal adapter and signs the user in. Temporary passwords (`lib/passwords.ts`) set `users.mustChangePassword`; `/change-password` clears it. Task 8 enforces the redirect globally.
- `"type": "module"` in package.json so `tsx` scripts (`pnpm bootstrap-admin`) see the schema's `export *` re-exports.
- **vinext is on the checkpoint list.** `create-cloudflare` now offers two Next.js paths: `vinext` (Cloudflare's Vite-based Next runtime, marked "recommended") and the OpenNext adapter. We scaffolded with `--variant=opennext` as planned; task 15 compares against vinext as well as React Router v7.
- Tooling: pnpm 10 via corepack (`packageManager` pinned); `pnpm check` = ESLint (flat configs from `eslint-config-next`) + `tsc` + Prettier (Markdown excluded so docs aren't reflowed); `cloudflare-env.d.ts` is committed and generated env-only (`--include-runtime=false`) with runtime types from `@cloudflare/workers-types`; `agentRules: false` in `next.config.ts` because `next dev` otherwise appends a block to `CLAUDE.md`.

- i18n approach: recommendation is `next-intl` with a single `en` locale from day one (cheap now, painful to retrofit), `Intl` for dates/numbers, no Arabic strings yet. Hijri date via `Intl.DateTimeFormat('en-u-ca-islamic-umalqura')` as in the prototype.
- Better Auth id strategy: use `advanced.database.useNumberId` so `users.id` is an integer like every other table.
- Timezone helper: single `lib/time.ts` with `todayInSchoolTz()`, `formatDate()`, used everywhere instead of ad-hoc `Date` math. School timezone to confirm (Europe/Dublin?).
- `lib/money.ts`: `eurosToCents(input: string | number)`, `formatEuros(cents)`; forms accept `250` or `250.50`.

## Explicitly not in Phase 0

Registration wizard, applications inbox, any admin CRUD beyond school settings, attendance/homework/notes/resources/fees/events tables and screens, notifications UI, reports, year rollover, GDPR actions. Those start in Phase 1.
