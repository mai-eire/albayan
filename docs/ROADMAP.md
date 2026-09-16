# Roadmap & status

Live document. Updated at the end of every work session, in the same commit as the work. Keep it under ~50 lines; detail belongs in the phase checklists.

**Last updated:** 2026-09-16 · **Current phase:** 1 — Registration & setup (starting)

## Phases

| Phase | Scope | Status | Checklist |
|---|---|---|---|
| Planning | Requirements, architecture, stack, UI library, design language | ✅ Done | — |
| 0 — Foundation | Offline dev loop, schema v1, auth, roles, access layer, seed, CI, Cloudflare staging | ✅ Done (deploy deferred) | [PHASE-0.md](PHASE-0.md) |
| 1 — Registration & setup | Guardian signup, applications, approvals, academics setup, timetable, staff invites | 🔄 In progress (0/14) | [PHASE-1.md](PHASE-1.md) |
| 2 — Daily workflows | Teacher Today, registers, homework, notes, resources, family/student views, notifications | ⬜ | — |
| 3 — Fees, events, reports | Fees & payments, events with consent, reports, audit viewer, year rollover, GDPR actions | ⬜ | — |
| Later | Stripe, PTM slots, Arabic/RTL, SMS, co-teachers, per-class schedules | — | — |

Phase scope and rationale: [PLAN.md §17](PLAN.md). Definition of done for the current phase is at the top of its checklist.

## Now

Phase 1, in order:

1. Task 1 — shared components (`EntityList`, `CardTitle`, `DateText`, `MoneyText`, `SensitiveSection`…), `lib/money.ts`, `lib/age.ts`.
2. Task 2–5 — academics setup: years & terms, subjects, sessions + schedule editor, classes + teachers per subject.
3. Task 6 — staff invites.

## Blocked / undecided

- **Deploy deferred by decision (2026-09-16)** — when ready: `wrangler login`, create D1/R2 (prod + staging), set `BETTER_AUTH_SECRET`/`RESEND_API_KEY`, fill in database ids, first staging deploy; GitHub secrets `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`; Resend sending domain.
- School timezone: defaulted to `Europe/Dublin` in Settings (editable) — confirm with the school, no longer blocking.
- Eircode confirmed as the postal code format? — affects the postal-area report only.

## Recently done

- 2026-09-16 — Phase 0 closed (deploy deferred). OpenNext checkpoint: stay on Next.js + OpenNext (PLAN §1). PHASE-1.md written.
- 2026-09-16 — Task 14 (half): GitHub Actions CI (check + unit/integration + e2e) and Deploy (staging → approved production) workflows; staging/production Wrangler envs. Task 15 note written, awaiting decision.
- 2026-09-16 — Task 13: `pnpm test` = 49 Vitest unit + integration tests; `pnpm test:e2e` = 4 Playwright flows on an isolated seeded DB (20 s).
- 2026-09-16 — Task 12: deterministic seed (`pnpm db:seed`, 3.4 s): settings, year + 3 terms, Sat/Sun sessions with schedules, 8 classes, 8 teachers (one a parent), 40 families / 60 students (6 pending applications), assignments, enrolments with fees; every role logs in.
- 2026-09-16 — Task 11: R2 adapter (`lib/storage/bucket.ts`), `POST /api/files` + `GET /api/files/[...key]` through the Worker, admin-only for now; 20 MB upload/download round-trip verified locally, 401/403/404/413 paths checked.
- 2026-09-16 — Tasks 9–10: `lib/access.ts` rules with exhaustive tests; `action()` + `audit()` helpers; `/admin/settings` as the reference action (validation, denial and audit covered by tests, checked in a browser); `lib/time.ts`; shell and pages read the school name and timezone from settings.
- 2026-09-16 — Task 8: `getCurrentUser()` (session + role rows, once per request), derived areas, `requireUser`/`requireArea` guards in `lib/access.ts`, `/` lands on the first area, login honours `?next=`, role switcher for multi-role users; all checked in a browser.
- 2026-09-16 — Tasks 5–7: email transport (file/Resend) + React Email templates; Better Auth with username = student ID, login/logout/forgot/reset/invite/change-password pages, all driven end-to-end in a browser; `pnpm bootstrap-admin`.
- 2026-09-16 — Tasks 3–4: Drizzle + local D1 (`pnpm db:generate`, `pnpm db:migrate:local`, `db()` from the OpenNext binding), schema v1 (19 tables incl. Better Auth's), 13 constraint tests on a throwaway D1 (`pnpm test`), first real query on the admin dashboard.
- 2026-09-16 — Task 2: Mantine 9 theme from DESIGN.md, `Shell` (sidebar/drawer, student bottom tabs, role switcher, colour-scheme toggle), `PageHeader`/`StatTile`/`StatusBadge`/`SubjectBadge`/`EmptyState`, placeholder pages for the four areas, `/dev/ui` gallery; checked light + dark, desktop + phone, dev + Workers runtime.
- 2026-09-15 — Task 1: scaffolded Next.js 16 on the OpenNext adapter (`create-cloudflare --variant=opennext`), pnpm 10, ESLint + Prettier, `pnpm check`; `pnpm dev` and `pnpm preview` both serve the placeholder page offline. Decisions recorded in PHASE-0.md.
- 2026-09-15 — Plan v2, Phase 0 checklist, CLAUDE.md, UI library chosen (Mantine) via three prototypes, design language written.
