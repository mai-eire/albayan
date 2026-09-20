# Roadmap & status

Live document. Updated at the end of every work session, in the same commit as the work. Keep it under ~50 lines; detail belongs in the phase checklists.

**Last updated:** 2026-09-20 · **Current phase:** 3 — Fees, events, reports, hardening (in progress)

## Phases

| Phase | Scope | Status | Checklist |
|---|---|---|---|
| Planning | Requirements, architecture, stack, UI library, design language | ✅ Done | — |
| 0 — Foundation | Offline dev loop, schema v1, auth, roles, access layer, seed, CI, Cloudflare staging | ✅ Done (deploy deferred) | [PHASE-0.md](PHASE-0.md) |
| 1 — Registration & setup | Guardian signup, applications, approvals, academics setup, timetable, staff invites | ✅ Done | [PHASE-1.md](PHASE-1.md) |
| 2 — Daily workflows | Teacher Today, registers, homework, notes, resources, family/student views, notifications | ✅ Done | [PHASE-2.md](PHASE-2.md) |
| 3 — Fees, events, reports | Fees & payments, events with consent, reports, audit viewer, year rollover, GDPR actions, deploy | 🔄 In progress (6/16) | [PHASE-3.md](PHASE-3.md) |
| Later | Stripe, PTM slots, Arabic/RTL, SMS, co-teachers, per-class schedules, staff HR view, session drop-off/pick-up times | — | — |

Phase scope and rationale: [PLAN.md §17](PLAN.md). Definition of done for the current phase is at the top of its checklist.

## Now

Review passes by area, feedback under `docs/feedback/<area>/`: admin passes 2–6 and teacher passes 1–3 are in. Next:

1. Salah reviews the **family (guardian) area**, then the student area; fix what comes back.
2. Task 2, trimmed — a notification to every guardian when the office records a payment. No family fees page.
3. Then events (tasks 3–4) and reports (task 5), parked until the reviews are through.

## Blocked / undecided

- **Per-class timetables (task 16)** — needs a longer discussion (agreed 2026-09-19); the proposal and questions are in [PHASE-3.md](PHASE-3.md).
- **Deploy deferred by decision (2026-09-16)**, now Phase 3 task 11 — when ready: `wrangler login`, create D1/R2 (prod + staging), set `BETTER_AUTH_SECRET`/`RESEND_API_KEY`, fill in database ids, first staging deploy; GitHub secrets `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`; Resend sending domain.
- School timezone: defaulted to `Europe/Dublin` in Settings (editable) — confirm with the school, no longer blocking.
- Eircode confirmed as the postal code format? — affects the postal-area report only.

## Recently done

- 2026-09-20 — Teacher review pass 3 ([feedback/teacher/2026-09-20-review-3.md](feedback/teacher/2026-09-20-review-3.md)): homework due today as its own card (and a hydration error fixed there); paperclip on the attach toggle; weekends in tile on calendars; dev clock day arrows.
- 2026-09-20 — Teacher review pass 2 ([feedback/teacher/2026-09-20-review-2.md](feedback/teacher/2026-09-20-review-2.md)): "Today" as a page action (`TodayButton`); empty classes on the register page and in the overview; dark-mode `light` variant fixed in the theme; homework back to one form with a collapsed attachments section, Edit shows and removes attachments; Today lists homework due today; calendars without weekend colouring and with today ringed; a development-only clock in the header (`lib/clock.ts`) so any page can be seen as on another day.
- 2026-09-19 — Teacher review pass 1 ([feedback/teacher/2026-09-19-review-1.md](feedback/teacher/2026-09-19-review-1.md)) and admin pass 6 ([feedback/admin/2026-09-19-review-6.md](feedback/admin/2026-09-19-review-6.md)): `/teach` → `/teacher` (old links redirect); Today shows the schedule with "Take register" as the page action for the class the teacher leads; one `RegistersTable` for the office and teachers (date filter by text, "Today" button, no separate day view); breadcrumbs follow the URL and `PageHeader` gains a `related` link (DESIGN §3.2); homework in two steps with its own attachment form, next-lesson/next-week due buttons, Publish/Unpublish in the menu, draft attachments hidden until published; teacher calendar removed; a new class starts with its class teacher on every subject and a class-teacher change offers to hand the subjects over; School rules is its own admin page with a rich-text editor (`@mantine/tiptap`, cleaned through the schema in `lib/rules.ts`). Later: staff HR view, sessions with drop-off/pick-up times.
- 2026-09-18 — Admin review pass 5 ([feedback/admin/2026-09-18-review-5.md](feedback/admin/2026-09-18-review-5.md)): server error lines clear on change; office "Add a child" asks everything the wizard does; a class's Applications tab lists only children who asked for that class; `dd/mm/yyyy` placeholder and formats on date fields; over-capacity shown in the classes list and on the class page; "All" status filter; "Students 6 / 15"; roster counts colour-coded; double-click guard on offer/move; `Places` with over-capacity icon and tooltip; `Nothing` instead of dashes (DESIGN §7).

- 2026-09-18 — Admin review pass 4 ([feedback/admin/2026-09-18-review-4.md](feedback/admin/2026-09-18-review-4.md)): inbox filters; the class picker is a drop-down with search inside (`ClassPicker` on `Combobox`), starts empty, offers the preferred session's classes with a teacher filter and "show every session"; session and class asked for shown apart, warning only when the session differs; green review card; status badge beside the name; families "application waiting" filter; staff classes as linked list and a link from registers taken to the teacher-filtered attendance view; class tabs with counts and an Attendance tab; dark-mode timeline bullets.

- 2026-09-18 — Admin review pass 3 ([feedback/admin/2026-09-18-review-3.md](feedback/admin/2026-09-18-review-3.md)): one "Offer a place" modal everywhere (child, family table, class picker with facts and a link, fee, amber review card, warning + note when the offer differs from the preference — note in the email and on the family's page); family table on the move modal; Families: derived name rule, "Invite a guardian", class filters labelled with their session; guardian page tabs (Sensitive), co-guardians, add-child under both parents; staff contact editing; staff-only schedule slots (migration 0006); school rules page in every area; attendance: excused counts as absent, aligned "? / n", sortable dates, register filter, session times, student links; fees figures as filters + search; resources with audience tags and dates; dark-mode timetable tint and the scheme-toggle hydration fix.

- 2026-09-17 — Admin review feedback pass 2 ([feedback/admin/2026-09-17-review-2.md](feedback/admin/2026-09-17-review-2.md)): lists filter in the browser (`useUrlFilters`) with CSV exports for students, families and staff; Guardians → Families (derived from shared children, `lib/families.ts`) with filters by child, session, class and teacher; "Add a parent" picks someone registered or invites someone new; staff filters by session/class/subject and a tabbed profile with register counts; student Family tab, fee marks on tabs, siblings' fees on the Fees tab, Enrolment → Class tab with attendance and the timetable, Move class with capacity/teacher/applications and an over-capacity tick; Academics as sidebar sub-items, class page tabbed with an Applications tab, roster as "x / n"; schedule editor with Break / Other and drag-to-reorder; attendance term view by default with a stable header, sortable dates, "? / n" and clickable rows; dashboard registers-missing counts the term; breadcrumbs look like links; resource file names.
- 2026-09-17 — First-walkthrough feedback pass ([feedback/2026-09-17-first-walkthrough.md](feedback/2026-09-17-first-walkthrough.md)): dense sortable staff tables, breadcrumbs, read-only cards with Edit, Figures for money, header theme toggle, guardian editing, siblings, session end times, teachers fill past registers, segmented register control, homework status/attachments, guardian gender (migration 0005), simpler ethnicities. New tasks 13–15 done: co-guardians (parent invites another parent; admin adds a guardian or a child), staff table/profile with deactivation dates, term-wide attendance overview; teacher "My week" timetable.
- 2026-09-16 — Phase 3 task 1: fees for the office. `lib/fees.ts` derives status and balance per student per year (payments follow a class move); `/admin/fees` lists who still owes with day/class/year filters, totals and CSV; "Record payment" modal (child picker, amount, how, when, paid by, reference); edit/delete payments and edit the fee from the student's Enrolment tab, all audited before/after; student profile gains a Fees tab, the guardian profile becomes Details · Payments; dashboard tile "Fees outstanding" is real; seed has payments. "Overdue" removed from the fee statuses.
- 2026-09-16 — Phase 3 task 0: schema v3 — `payments` (positive amount, method), `events`, `event_targets` (one of session/class), `event_participants` (one row per child) as migration 0004 with constraint tests.
- 2026-09-16 — Phase 2 closed. Task 12: `e2e/daily.spec.ts` — register with an absence → family sees it → office corrects it; homework with a file → student opens it, another class's student gets 403. PHASE-3.md written from PLAN §17 (deploy readiness folded in as task 11).
- 2026-09-16 — Phase 2 task 11: the admin class page shows the roster with this term's attendance counts and can move a student to another class of the year — the old place ends today, the new one starts today with the same fee, audited; tested.
- 2026-09-16 — Phase 2 task 10: the bell links to `/{area}/notifications` — newest first, unread bold with a saffron dot, opening one marks it read and follows its link, "Mark all as read"; the count on the bell updates through `router.refresh()`.
- 2026-09-16 — Phase 2 task 9: calendar — `lib/calendar.ts` builds a Monday-first month from terms and weekly lesson days (events slot in later), tested; `MonthCalendar` grid with today ringed and labels collapsing to dots on phones; `/teacher/calendar`, `/student/calendar`, `/family/calendar` (children's days labelled by name); Hijri date on the eyebrow.
- 2026-09-16 — Phase 2 task 8: family child pages gain Attendance · Homework · Notes · Resources tabs and the overview lists homework due, the last register and the latest note; `/student` home shows the same and `/student/homework`, `/student/resources` exist; `listResourcesForChild` filters by audience; `HomeworkList` component; `EntityList` badges no longer shrink on phones.
- 2026-09-16 — Phase 2 task 7: teacher class page as tabs — Students · Attendance (per-student counts for the current term) · Homework (set and manage for this class) · Resources (share with the class; homework attachments listed); the teacher's student page is tabbed too — Overview · Attendance · Notes · Resources (share with one family).
- 2026-09-16 — Phase 2 tasks 0–6 (schema v2, Teacher Today, registers, admin attendance, homework, resources, notes): see [PHASE-2.md](PHASE-2.md).
- 2026-09-16 — Phase 1 closed (registration, applications, approvals, academics, staff, people, family/student views, notifications helper): see [PHASE-1.md](PHASE-1.md).
- 2026-09-15/16 — Phase 0 closed (offline dev loop, schema v1, auth, access layer, seed, CI; deploy deferred): see [PHASE-0.md](PHASE-0.md).
