# Roadmap & status

Live document. Updated at the end of every work session, in the same commit as the work. Keep it under ~50 lines; detail belongs in the phase checklists.

**Last updated:** 2026-09-16 · **Current phase:** 0 — Foundation (tasks 1–4 of 15 done)

## Phases

| Phase | Scope | Status | Checklist |
|---|---|---|---|
| Planning | Requirements, architecture, stack, UI library, design language | ✅ Done | — |
| 0 — Foundation | Offline dev loop, schema v1, auth, roles, access layer, seed, CI, Cloudflare staging | 🔄 In progress (4/15) | [PHASE-0.md](PHASE-0.md) |
| 1 — Registration & setup | Guardian signup, applications, approvals, academics setup, timetable, staff invites | ⬜ | PHASE-1.md (when Phase 0 ends) |
| 2 — Daily workflows | Teacher Today, registers, homework, notes, resources, family/student views, notifications | ⬜ | — |
| 3 — Fees, events, reports | Fees & payments, events with consent, reports, audit viewer, year rollover, GDPR actions | ⬜ | — |
| Later | Stripe, PTM slots, Arabic/RTL, SMS, co-teachers, per-class schedules | — | — |

Phase scope and rationale: [PLAN.md §17](PLAN.md). Definition of done for the current phase is at the top of its checklist.

## Now

Phase 0, in order:

1. Task 5–6 — file email transport, Better Auth.
2. Task 7–8 — bootstrap admin, role derivation + routing (replaces the placeholder users in the area layouts).
3. Task 9–10 — `lib/access.ts`, server action convention.

## Blocked / undecided

- School timezone (plan assumes `Europe/Dublin`) — needed by task 12 (seed) at the latest.
- Eircode confirmed as the postal code format? — affects the postal-area report only.

## Recently done

- 2026-09-16 — Tasks 3–4: Drizzle + local D1 (`pnpm db:generate`, `pnpm db:migrate:local`, `db()` from the OpenNext binding), schema v1 (19 tables incl. Better Auth's), 13 constraint tests on a throwaway D1 (`pnpm test`), first real query on the admin dashboard.
- 2026-09-16 — Task 2: Mantine 9 theme from DESIGN.md, `Shell` (sidebar/drawer, student bottom tabs, role switcher, colour-scheme toggle), `PageHeader`/`StatTile`/`StatusBadge`/`SubjectBadge`/`EmptyState`, placeholder pages for the four areas, `/dev/ui` gallery; checked light + dark, desktop + phone, dev + Workers runtime.
- 2026-09-15 — Task 1: scaffolded Next.js 16 on the OpenNext adapter (`create-cloudflare --variant=opennext`), pnpm 10, ESLint + Prettier, `pnpm check`; `pnpm dev` and `pnpm preview` both serve the placeholder page offline. Decisions recorded in PHASE-0.md.
- 2026-09-15 — Plan v2, Phase 0 checklist, CLAUDE.md, UI library chosen (Mantine) via three prototypes, design language written.
