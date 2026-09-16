# Roadmap & status

Live document. Updated at the end of every work session, in the same commit as the work. Keep it under ~50 lines; detail belongs in the phase checklists.

**Last updated:** 2026-09-16 · **Current phase:** 3 — Fees, events, reports, hardening (starting)

## Phases

| Phase | Scope | Status | Checklist |
|---|---|---|---|
| Planning | Requirements, architecture, stack, UI library, design language | ✅ Done | — |
| 0 — Foundation | Offline dev loop, schema v1, auth, roles, access layer, seed, CI, Cloudflare staging | ✅ Done (deploy deferred) | [PHASE-0.md](PHASE-0.md) |
| 1 — Registration & setup | Guardian signup, applications, approvals, academics setup, timetable, staff invites | ✅ Done | [PHASE-1.md](PHASE-1.md) |
| 2 — Daily workflows | Teacher Today, registers, homework, notes, resources, family/student views, notifications | ✅ Done | [PHASE-2.md](PHASE-2.md) |
| 3 — Fees, events, reports | Fees & payments, events with consent, reports, audit viewer, year rollover, GDPR actions, deploy | 🔄 In progress (1/13) | [PHASE-3.md](PHASE-3.md) |
| Later | Stripe, PTM slots, Arabic/RTL, SMS, co-teachers, per-class schedules | — | — |

Phase scope and rationale: [PLAN.md §17](PLAN.md). Definition of done for the current phase is at the top of its checklist.

## Now

Phase 3, in order:

1. Task 1 — fees for the office (`/admin/fees`, `lib/fees.ts`, outstanding tile).
2. Task 2 — fees for families, and the outstanding-balance flag on the wizard and inbox.
3. Task 3–4 — events with targeting, registration and consent.

## Blocked / undecided

- **Deploy deferred by decision (2026-09-16)**, now Phase 3 task 11 — when ready: `wrangler login`, create D1/R2 (prod + staging), set `BETTER_AUTH_SECRET`/`RESEND_API_KEY`, fill in database ids, first staging deploy; GitHub secrets `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`; Resend sending domain.
- School timezone: defaulted to `Europe/Dublin` in Settings (editable) — confirm with the school, no longer blocking.
- Eircode confirmed as the postal code format? — affects the postal-area report only.

## Recently done

- 2026-09-16 — Phase 3 task 0: schema v3 — `payments` (positive amount, method), `events`, `event_targets` (one of session/class), `event_participants` (one row per child) as migration 0004 with constraint tests.
- 2026-09-16 — Phase 2 closed. Task 12: `e2e/daily.spec.ts` — register with an absence → family sees it → office corrects it; homework with a file → student opens it, another class's student gets 403. PHASE-3.md written from PLAN §17 (deploy readiness folded in as task 11).
- 2026-09-16 — Phase 2 task 11: the admin class page shows the roster with this term's attendance counts and can move a student to another class of the year — the old place ends today, the new one starts today with the same fee, audited; tested.
- 2026-09-16 — Phase 2 task 10: the bell links to `/{area}/notifications` — newest first, unread bold with a saffron dot, opening one marks it read and follows its link, "Mark all as read"; the count on the bell updates through `router.refresh()`.
- 2026-09-16 — Phase 2 task 9: calendar — `lib/calendar.ts` builds a Monday-first month from terms and weekly lesson days (events slot in later), tested; `MonthCalendar` grid with today ringed and labels collapsing to dots on phones; `/teach/calendar`, `/student/calendar`, `/family/calendar` (children's days labelled by name); Hijri date on the eyebrow.
- 2026-09-16 — Phase 2 task 8: family child pages gain Attendance · Homework · Notes · Resources tabs and the overview lists homework due, the last register and the latest note; `/student` home shows the same and `/student/homework`, `/student/resources` exist; `listResourcesForChild` filters by audience; `HomeworkList` component; `EntityList` badges no longer shrink on phones.
- 2026-09-16 — Phase 2 task 7: teacher class page as tabs — Students · Attendance (per-student counts for the current term) · Homework (set and manage for this class) · Resources (share with the class; homework attachments listed); the teacher's student page is tabbed too — Overview · Attendance · Notes · Resources (share with one family).
- 2026-09-16 — Phase 2 tasks 0–6 (schema v2, Teacher Today, registers, admin attendance, homework, resources, notes): see [PHASE-2.md](PHASE-2.md).
- 2026-09-16 — Phase 1 closed (registration, applications, approvals, academics, staff, people, family/student views, notifications helper): see [PHASE-1.md](PHASE-1.md).
- 2026-09-15/16 — Phase 0 closed (offline dev loop, schema v1, auth, access layer, seed, CI; deploy deferred): see [PHASE-0.md](PHASE-0.md).
