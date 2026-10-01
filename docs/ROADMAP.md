# Roadmap & status

Live document. Updated at the end of every work session, in the same commit as the work. Keep it under ~50 lines; detail belongs in the phase checklists.

**Last updated:** 2026-10-01 · **Current phase:** 3 — Fees, events, reports, hardening (in progress)

## Phases

| Phase | Scope | Status | Checklist |
|---|---|---|---|
| Planning | Requirements, architecture, stack, UI library, design language | ✅ Done | — |
| 0 — Foundation | Offline dev loop, schema v1, auth, roles, access layer, seed, CI, Cloudflare staging | ✅ Done (deploy deferred) | [PHASE-0.md](PHASE-0.md) |
| 1 — Registration & setup | Guardian signup, applications, approvals, academics setup, timetable, staff invites | ✅ Done | [PHASE-1.md](PHASE-1.md) |
| 2 — Daily workflows | Teacher Today, registers, homework, notes, resources, family/student views, notifications | ✅ Done | [PHASE-2.md](PHASE-2.md) |
| 3 — Fees, events, reports | Fees & payments, events with consent, reports, audit viewer, year rollover, GDPR actions, deploy | 🔄 In progress (10/20) | [PHASE-3.md](PHASE-3.md) |
| Later | Stripe, PTM slots, Arabic/RTL, SMS, co-teachers, staff HR view, session drop-off/pick-up times | — | — |

Phase scope and rationale: [PLAN.md §17](PLAN.md). Definition of done for the current phase is at the top of its checklist.

## Now

Review passes by area, feedback under `docs/feedback/<area>/`: admin 2–6, teacher 1–3, family 1–2 and student 1 are all in and done. Next:

1. **The rest of events (tasks 3–4)**, now the calendar is in: telling the targeted families when an entry is published, then one-tap register and consent for an activity, and the participants list for the office. The school's own dates need none of that, which is why they went first.
2. Salah's review pass on the calendar, and on whatever else comes next.
3. Two open questions from the family pass: a family telling the school a child is leaving, and "apply again" after a decline (both answered in [feedback/family/2026-09-23-review-1.md](feedback/family/2026-09-23-review-1.md), neither built — the second needs a decision on whether the two applications are linked).
4. Then task 6 (audit viewer), 7 (accounts) and 8 (data protection), none of which need a decision first.
5. Offered, not done: seeding resources, teacher notes and student notifications, which are the three things still empty in the student area.

## Blocked / undecided

- **Per-class timetables (task 16)** — needs a longer discussion (agreed 2026-09-19); the proposal and questions are in [PHASE-3.md](PHASE-3.md).
- **Production deploy (task 11)** — staging is live and deploys itself. Production needs a hostname (a custom domain, unlike staging's `workers.dev`), the real `BETTER_AUTH_URL` and `EMAIL_FROM` in `wrangler.jsonc`, its own two secrets, and a required reviewer on the `production` GitHub environment. **Staging CD is waiting on one thing:** the repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, which only Salah can add.
- School timezone: defaulted to `Europe/Dublin` in Settings (editable) — confirm with the school, no longer blocking.
- Eircode confirmed as the postal code format? — affects the postal-area report only.

## Recently done

Newest first. Older work lives in the phase checklists and in [feedback/](feedback/).

- 2026-10-01 — **Staging deploys on every push, and carries the demo school.** The seed was moved onto the staging database (109 users, 60 students, 8 classes) by exporting the local one and importing it in foreign-key order — `wrangler d1 execute --file` splits a file across transactions, so the alphabetical export put `accounts` before `users` and the first import rolled back. `deploy.yml` became `deploy-staging.yml` (push to `main` + CI green → migrate, deploy, `curl /login`) and `deploy-production.yml` (by hand, from the Actions tab, refusing to run while production's `BETTER_AUTH_URL` is a placeholder). One branch rather than a `staging`/`prod` pair — reasoning in [PHASE-3.md](PHASE-3.md). Nothing deploys until the two Cloudflare repository secrets exist.

- 2026-10-01 — **Staging is deployed and reachable**: <https://albayan-staging.sweet-wave-5485.workers.dev>. Both secrets are set on the staging Worker, `BETTER_AUTH_URL` and `EMAIL_FROM` point at the real origin and `noreply@mai.ie`, and the Brevo sending domain was already verified, so email works — proved with one send. Sign-in and registration load against an empty database. What is left of task 11 is production and the GitHub secrets.

- 2026-09-29 — **Deploy groundwork** (task 11): the Cloudflare resources exist — D1 `albayan` and `albayan-staging` in WEUR, R2 `albayan-files` and `albayan-files-staging` in the EU jurisdiction, because the rows and the files are Irish children's records. Their ids are in `wrangler.jsonc`. The **fourteen migrations were collapsed into a single `0000_schema.sql`** while both remote databases were still empty, which is the last moment that is safe; it retired the two hand-written CHECK-constraint rebuilds and fixed a drift where `notifications.student_id` never got the `ON DELETE cascade` its schema declares. The staging database has its tables. Email moved to **Brevo**, which Salah already uses. `bootstrap-admin --remote` promotes an account that registered on the site, `pnpm db:migrate:staging` and `:production` create the tables, and the README carries the runbook and the backup story. Still to do before a first deploy: the hostname, and the two secrets per environment.

- 2026-09-28 — **Reports** (task 5): `/admin/reports` counts the children of a year eight ways — ages, sessions, boys and girls, Arabic at registration, countries of origin, languages at home, where they live, why families came — with a year picker and one CSV; ages and countries also sit on the dashboard. Counts only, and the page says so. Charts are `@mantine/charts`, their rules in DESIGN §4.13. Also **task 2**: recording a payment now tells every guardian of that child what came in and what is still to pay, in the app and by email.

- 2026-09-29 — **The school calendar** (task 17, and the calendar half of task 3): `/admin/calendar` replaces the Events page — the month everyone else sees, with the year's dates and activities listed below it and one **Add entry** form covering holidays, closures, exams, parent–teacher meetings and trips alike. An entry can be for the whole school, for some days or for some classes, and stays a draft until it is published. Every area's calendar gained a **Month / Schedule** switch, the schedule being the year as a list, scoped so a Sunday family never reads about a Saturday trip. Migration 0012 added the `exam` type; the seed now has a term's worth of dates. Then, after Salah's first look: **staff meetings** (migration 0013 — an audience of `staff`, so families and students cannot be shown one), a **colour and an icon for each kind of entry**, and chips that open a **popover** carrying the details, with Edit in it for the office. After his second: **class days are entries too** — pressable for their hours, listed in the schedule among the dates (four weeks of them, or eighty would bury eleven), and for the office a way into the session; the page dropped its second list, and a `+` appears on any day you hover. After his third: the **teacher calendar is back** (taken away on 2026-09-19 when it was empty) — above a timetable now called **My timetable**, and the only calendar that carries the staff meetings.

- 2026-09-29 — The payment form puts the **outstanding balance** where the office types (bold saffron) and asks for a tick before taking more than is owed — the action refuses an unticked overpayment, as it does an unticked overfill of a class. Every row of the fees list can open the form on its own child.

- 2026-09-27 — A school can upload its **logo** (Settings → Logo, migration 0011): it replaces the app's mark in the header, stands above the name on the sign-in pages (which now read mark → name → form), becomes the favicon and heads every email. Optional; without one nothing changes.

- 2026-09-26 — Student review pass 1 ([feedback/student/2026-09-26-review-1.md](feedback/student/2026-09-26-review-1.md)): the home page shows outstanding homework, overdue first, and links to it (it used to hide anything already due); new `/student/attendance` and `/student/details`; School rules reachable at last; the phone tab bar becomes four tabs and a **More** drawer, since students have no burger and eight items would not fit. On the family side a guardian can now correct their child's name, year and health notes from the Details tab, audited.

- 2026-09-23 — Family review pass 2 ([feedback/family/2026-09-23-review-2.md](feedback/family/2026-09-23-review-2.md)): a family's class preference is a **level by name**, so a parent can name a level without naming a day (migration 0010); the child page puts the class beside the name and centres the badge; attendance is a list, one row per date; "Home schooled" no longer replaces the school year; the guardian's country of origin is asked once, on their account; the child's country offers the family's own first; notifications are blocks rather than divided rows, in the popover and on the page; Fees moved after Calendar; and the duplicate-key crash on the calendar is fixed.

- 2026-09-23 — Family review pass 1, part two: **ethnicity is now country of origin** on students and guardians (migration 0009, searchable list of every country in `lib/countries.ts`, Palestine in and Israel out, "Mixed" kept); the child's follows the guardian's until it is changed. The register-a-child wizard also gained the age under the date of birth, a sectioned school-year list, "Taught at home" (a new `students.is_homeschooled`), allergies as a pick-or-type list, "Any day" as a real answer to the preferred day, and sixty-odd languages. The office's "Add a child" and a student's profile ask the same.

- 2026-09-23 — Family review pass 1, part one ([feedback/family/2026-09-23-review-1.md](feedback/family/2026-09-23-review-1.md)): the bell opens a popover with the unread ones and "Mark all as read" is a page action everywhere; a notification carries what it is about (migration 0008 — subject badge, child's name); the family overview lists the other parents; child pages gain breadcrumbs, counts on the tabs, "3 / 6" attendance and a **Fees** tab, and the Overview tab is gone (Details is first); new `/family/fees` for the household. The seed now has registers, homework, notifications and six two-parent families so all of this can be seen.

- 2026-09-23 — Applications are kept and searchable (Phase 3 task 2b): the year applied for and the decision date are on the record (migration 0007); the office's list covers every outcome with year, session, class, name and status filters; an Application tab on the student page for the office, the family (editable while it waits) and the teacher (facts only). Also: record a payment from a family's Fees tab, every guardian on the students list, tables without stripes, "Applications (6)" in the nav.

- 2026-09-20 — Teacher review pass 3 ([feedback/teacher/2026-09-20-review-3.md](feedback/teacher/2026-09-20-review-3.md)): homework due today as its own card (and a hydration error fixed there); paperclip on the attach toggle; weekends in tile on calendars; dev clock day arrows.

- 2026-09-20 — Teacher review pass 2 ([feedback/teacher/2026-09-20-review-2.md](feedback/teacher/2026-09-20-review-2.md)): "Today" as a page action (`TodayButton`); empty classes on the register page and in the overview; dark-mode `light` variant fixed in the theme; homework back to one form with a collapsed attachments section, Edit shows and removes attachments; Today lists homework due today; calendars without weekend colouring and with today ringed; a development-only clock in the header (`lib/clock.ts`) so any page can be seen as on another day.

- 2026-09-19 — Teacher review pass 1 ([feedback/teacher/2026-09-19-review-1.md](feedback/teacher/2026-09-19-review-1.md)) and admin pass 6 ([feedback/admin/2026-09-19-review-6.md](feedback/admin/2026-09-19-review-6.md)): `/teach` → `/teacher` (old links redirect); Today shows the schedule with "Take register" as the page action for the class the teacher leads; one `RegistersTable` for the office and teachers (date filter by text, "Today" button, no separate day view); breadcrumbs follow the URL and `PageHeader` gains a `related` link (DESIGN §3.2); homework in two steps with its own attachment form, next-lesson/next-week due buttons, Publish/Unpublish in the menu, draft attachments hidden until published; teacher calendar removed; a new class starts with its class teacher on every subject and a class-teacher change offers to hand the subjects over; School rules is its own admin page with a rich-text editor (`@mantine/tiptap`, cleaned through the schema in `lib/rules.ts`). Later: staff HR view, sessions with drop-off/pick-up times.

- 2026-09-17/18 — **Admin review passes 2–5** and the first walkthrough: dense sortable lists that filter in the browser with CSV exports, families derived from shared children, the offer-a-place modal, tabbed profiles, the attendance term view, session schedules, resources with audiences. What was asked for and what was done is in [feedback/admin/](feedback/admin/) and [feedback/2026-09-17-first-walkthrough.md](feedback/2026-09-17-first-walkthrough.md).

- 2026-09-15/16 — **Phases 0, 1 and 2 closed**, and Phase 3 tasks 0 and 1 (schema v3; fees, payments and the outstanding list for the office). Task-level detail is in [PHASE-0.md](PHASE-0.md), [PHASE-1.md](PHASE-1.md), [PHASE-2.md](PHASE-2.md) and [PHASE-3.md](PHASE-3.md); it is not repeated here.
