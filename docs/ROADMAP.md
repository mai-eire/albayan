# Roadmap & status

Live document. Updated at the end of every work session, in the same commit as the work. Keep it under ~50 lines; detail belongs in the phase checklists.

**Last updated:** 2026-09-15 · **Current phase:** 0 — Foundation (not started)

## Phases

| Phase | Scope | Status | Checklist |
|---|---|---|---|
| Planning | Requirements, architecture, stack, UI library, design language | ✅ Done | — |
| 0 — Foundation | Offline dev loop, schema v1, auth, roles, access layer, seed, CI, Cloudflare staging | ⬜ Not started | [PHASE-0.md](PHASE-0.md) |
| 1 — Registration & setup | Guardian signup, applications, approvals, academics setup, timetable, staff invites | ⬜ | PHASE-1.md (when Phase 0 ends) |
| 2 — Daily workflows | Teacher Today, registers, homework, notes, resources, family/student views, notifications | ⬜ | — |
| 3 — Fees, events, reports | Fees & payments, events with consent, reports, audit viewer, year rollover, GDPR actions | ⬜ | — |
| Later | Stripe, PTM slots, Arabic/RTL, SMS, co-teachers, per-class schedules | — | — |

Phase scope and rationale: [PLAN.md §17](PLAN.md). Definition of done for the current phase is at the top of its checklist.

## Now

Phase 0, in order:

1. Task 1 — scaffold Next.js on the OpenNext Cloudflare adapter; `pnpm dev` offline.
2. Task 2 — Mantine theme from DESIGN.md, `AppShell`, first shared components.
3. Task 3–4 — Drizzle + local D1, schema v1.

## Blocked / undecided

- School timezone (plan assumes `Europe/Dublin`) — needed by task 12 (seed) at the latest.
- Eircode confirmed as the postal code format? — affects the postal-area report only.

## Recently done

- 2026-09-15 — Plan v2, Phase 0 checklist, CLAUDE.md, UI library chosen (Mantine) via three prototypes, design language written.
