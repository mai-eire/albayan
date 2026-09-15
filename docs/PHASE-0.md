# Phase 0 — Foundation

Goal: a deployable skeleton with the data model, auth, role routing, access layer, seed data and CI — and a working **offline** dev loop. No school features yet.

Ends with the **OpenNext checkpoint** (task 15). Estimated ≈1 week.

Definition of done for the phase: a new contributor can `git clone && pnpm install && pnpm dev`, log in as the seeded admin, switch to a seeded teacher-parent and see both role areas, run `pnpm test` green with no network, and the staging Worker serves the login page.

## Tasks

- [ ] **1. Scaffold** — Next.js 15 + TypeScript via `npm create cloudflare@latest -- --framework=next` (OpenNext adapter), pnpm, ESLint + Prettier, `pnpm check`. `.gitignore` covers `.wrangler/`, `.open-next/`, `.dev/`, `.env*`.
  DoD: `pnpm dev` serves a page offline; `pnpm build && wrangler dev` serves the same page.

- [ ] **2. UI base** — Tailwind, shadcn/ui init, app shell (sidebar + top bar, responsive), theme tokens, logical-property convention.
  DoD: placeholder pages at `/admin`, `/teach`, `/family`, `/student` render inside the shell.

- [ ] **3. Drizzle + local D1** — `lib/db/schema/*.ts`, `drizzle.config.ts`, `pnpm db:generate` (drizzle-kit → SQL migrations), `pnpm db:migrate:local` (`wrangler d1 migrations apply --local`), typed `db()` accessor from the OpenNext binding.
  DoD: a migration applies to the local SQLite file; a smoke query runs from a Server Component.

- [ ] **4. Schema v1** — identity (`users` + Better Auth tables), people (`guardians`, `students`, `student_guardians`, `teachers`), academics (`academic_years`, `terms`, `school_sessions`, `session_periods`, `subjects`, `classes`, `teaching_assignments`, `enrolments`), platform (`school_settings`, `notifications`, `audit_log`). Constraints per PLAN §4: unique active enrolment per student, one-of checks on `session_periods`, JSON list columns, CHECK-constrained enums.
  Daily-work, fees and events tables are added in their own phases, not now.
  DoD: migration generated and applied; types exported; constraints verified by an integration test that violates each one.

- [ ] **5. Email transport** — `lib/email/transport.ts` with `file` (writes `.dev/mail/<ts>-<subject>.html`, logs a line with any link) and `resend` implementations; React Email base template.
  DoD: `pnpm test` exercises the file transport; no Resend key needed locally.

- [ ] **6. Better Auth** — email/password + username plugin, Drizzle adapter, cookie sessions; pages: `/login` (accepts email *or* student ID), `/logout`, `/forgot-password`, `/reset-password`, `/invite/[token]`; forced password change flag for OTP accounts.
  DoD: login/logout works; reset email lands in `.dev/mail/` and the link works.

- [ ] **7. Bootstrap admin** — `pnpm bootstrap-admin --email … --name …` creates the first admin (idempotent). No public admin signup exists anywhere.
  DoD: fresh DB → script → login as admin.

- [ ] **8. Role derivation + routing** — `getCurrentUser()` loads user + optional guardian/teacher/student rows once per request; `/` redirects to the user's (first) area; route-group layouts guard `/admin`, `/teach`, `/family`, `/student`; role switcher in the top bar for multi-role users.
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

- i18n approach: recommendation is `next-intl` with a single `en` locale from day one (cheap now, painful to retrofit), `Intl` for dates/numbers, no Arabic strings yet.
- Better Auth id strategy: use `advanced.database.useNumberId` so `users.id` is an integer like every other table.
- Timezone helper: single `lib/time.ts` with `todayInSchoolTz()`, `formatDate()`, used everywhere instead of ad-hoc `Date` math. School timezone to confirm (Europe/Dublin?).
- `lib/money.ts`: `eurosToCents(input: string | number)`, `formatEuros(cents)`; forms accept `250` or `250.50`.

## Explicitly not in Phase 0

Registration wizard, applications inbox, any admin CRUD beyond school settings, attendance/homework/notes/resources/fees/events tables and screens, notifications UI, reports, year rollover, GDPR actions. Those start in Phase 1.
