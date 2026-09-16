# Roadmap & status

Live document. Updated at the end of every work session, in the same commit as the work. Keep it under ~50 lines; detail belongs in the phase checklists.

**Last updated:** 2026-09-16 · **Current phase:** 2 — Daily workflows (starting)

## Phases

| Phase | Scope | Status | Checklist |
|---|---|---|---|
| Planning | Requirements, architecture, stack, UI library, design language | ✅ Done | — |
| 0 — Foundation | Offline dev loop, schema v1, auth, roles, access layer, seed, CI, Cloudflare staging | ✅ Done (deploy deferred) | [PHASE-0.md](PHASE-0.md) |
| 1 — Registration & setup | Guardian signup, applications, approvals, academics setup, timetable, staff invites | ✅ Done | [PHASE-1.md](PHASE-1.md) |
| 2 — Daily workflows | Teacher Today, registers, homework, notes, resources, family/student views, notifications | 🔄 In progress (6/13) | [PHASE-2.md](PHASE-2.md) |
| 3 — Fees, events, reports | Fees & payments, events with consent, reports, audit viewer, year rollover, GDPR actions | ⬜ | — |
| Later | Stripe, PTM slots, Arabic/RTL, SMS, co-teachers, per-class schedules | — | — |

Phase scope and rationale: [PLAN.md §17](PLAN.md). Definition of done for the current phase is at the top of its checklist.

## Now

Phase 2, in order:

1. Task 6 — notes with visibility.
2. Task 7 — teacher class page tabs (attendance summary, homework, resources) and student page extras.
3. Task 8 — family/student daily views (attendance, homework, notes, resources).

## Blocked / undecided

- **Deploy deferred by decision (2026-09-16)** — when ready: `wrangler login`, create D1/R2 (prod + staging), set `BETTER_AUTH_SECRET`/`RESEND_API_KEY`, fill in database ids, first staging deploy; GitHub secrets `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`; Resend sending domain.
- School timezone: defaulted to `Europe/Dublin` in Settings (editable) — confirm with the school, no longer blocking.
- Eircode confirmed as the postal code format? — affects the postal-area report only.

## Recently done

- 2026-09-16 — Phase 2 task 5: resources — `canViewResource` (audience, then school-wide / class / student connection) with `loadResourceViewer`; uploads open to staff, downloads gated by the owning resource; `/admin/resources` (school-wide), `/teach/resources` (share with a class, attach to homework); class/homework shares notify the class; `ResourceForm`/`ResourceList`; route tests for family-of-the-class vs another family, audience and the 25 MB cap.
- 2026-09-16 — Phase 2 task 4: homework — `/teach/homework` with add/edit/publish/delete on the (class, subject) pairs I teach (`teachesSubjectIn`), drafts invisible to families, publishing notifies the class's guardians and students once (in-app + `NoticeEmail`); `lib/homework.ts` status and due labels with tests.
- 2026-09-16 — Phase 2 task 3: `/admin/attendance?date=` — every class that day with students, absences and taken/not taken; drill in to view or correct a register (shares the teacher's editor; past-day changes audited, including newly created rows); the dashboard's "Registers missing" tile is real.
- 2026-09-16 — Phase 2 task 2: registers — `/teach/attendance` (today's classes, taken/not taken) → tap-to-cycle register with notes and one save; `canEditRegister` (same day for the class's teachers, admin any day, audited after the day); new absences notify guardians, email only if the school's absence-emails toggle is on; `register` status domain.
- 2026-09-16 — Phase 2 task 1: Teacher Today — my lessons for the weekday with computed times on a `LessonTimeline` (past tile · now saffron · later gray), "Take register" on classes I lead or open, greeting by the hour; `listLessonsForTeacher` tested.
- 2026-09-16 — Phase 2 task 0: schema v2 — `attendance` (one row per student per day), `homework`, `student_notes`, `resources` (exactly one target, file-or-link fields) as migration 0003 with constraint tests.
- 2026-09-16 — Phase 1 closed. Task 14: `e2e/journey.spec.ts` runs register → confirm → apply → approve → student signs in with the emailed password and sees the timetable → a Saturday teacher gets 404 on the Sunday child; Playwright now runs one worker. PHASE-2.md written from PLAN §17.
- 2026-09-16 — Phase 1 task 13: `lib/notify.ts` — every notification is an in-app row, the email runs after the response (`after()` → waitUntil) only if the person's email preference allows; approve/decline use it; the bell shows the unread count in every area; preference gate tested.
- 2026-09-16 — Phase 1 task 12: `/family` children list → `/family/[id]` with `ChildSwitcher` and Overview (next class, application status, fee) · Details · Timetable; `/family/account` (details, emergency contact, sensitive info, email toggle — `users.emailNotifications`, migration 0002); `/student` home with the next class and `/student/timetable`; `getStudentForGuardian`/`getStudentForStudent` tested; `nextDateOn`/`relativeDay` in `lib/time.ts`.
- 2026-09-16 — Phase 1 task 11: `/teach/classes` (my classes with day, what I teach, count) → class page with roster (age, Arabic, allergy/medical flags) and the class timetable; `/teach/students/[id]` limited profile; `lib/db/queries/teach.ts` with a test that logs the SQL and fails if any sensitive column is ever selected; `canViewStudent`/`teachesClass` enforced with 404s; `ClassTimetable` component.
- 2026-09-16 — Phase 1 task 10: `/admin/students` (search, status/day/class filters in the URL) → profile with Details · Guardians · Sensitive · Enrolment tabs as routes (`LinkTabs`), edit cards for details, health and ethnicity (audited field diffs); `/admin/guardians` list and profile with children and the sensitive card; `getStudentForAdmin` and friends in `lib/db/queries/students.ts`; `Field` component.
- 2026-09-16 — Phase 1 task 9: `/admin/applications` inbox (age, year, Arabic, preference, guardian, siblings attending) with a detail drawer; approve → per-year gap-free student ID, student sign-in with a temporary password, enrolment with fee, email to the guardian; decline with a reason (new `declinedReason` column, migration 0001) and email; both audited and tested end to end, including the student's first sign-in.
- 2026-09-16 — Phase 1 task 8: `/family/register-child` wizard (you · child · family · review) on `Stepper`, per-step validation from the same Zod schemas the action uses, guardian details pre-filled, optional diversity questions with the standard sentence, "Register another child"; `/family` lists children with their status; `lib/demographics.ts` option lists; action tests.
- 2026-09-16 — Phase 1 task 7: `/register` for guardians (name, email, phone, password) → guardian row, verification email, signed in; `/family` shows a saffron notice with resend until confirmed and hides "Register a child"; Better Auth gets its base URL from the request in dev; e2e register → confirm → verified.
- 2026-09-16 — Phase 1 task 6: `/admin/staff` — teachers and admins list, invite (new account + emailed link, or the role added to an existing account), resend invite, stop/resume teaching, make/remove admin (never yourself); `account` status domain; `lib/app-url.ts` for links in emails; action tests.
- 2026-09-16 — Phase 1 task 5: classes per year (add/edit/delete, refused with students), class teacher, a teacher select per subject in the session's schedule with a saffron double-booking warning, and the derived class timetable.
- 2026-09-16 — Phase 1 task 4: sessions per year (add/edit/delete, refused with classes), schedule editor with subject-or-title periods, minutes, reorder, and a live computed timeline; `lib/timetable.ts` with tests.
- 2026-09-16 — Phase 1 task 3: subjects tab (add with derived code, rename, deactivate/reactivate); `record` status domain.
- 2026-09-16 — Phase 1 task 2: `/admin/academics` tabbed layout; years list, add/edit year (name derived from the first day, fee in euros, current flag), terms with overlap and in-year checks; `DateField`, `AppLink`, `confirmDestructive`, `ActionError`.
- 2026-09-16 — Phase 1 task 1: `EntityList`, `CardTitle`, `DateText`, `MoneyText`, `SensitiveSection`, `DirectionalIcon`, `ChildSwitcher`; `lib/money.ts`, `lib/age.ts` with tests; gallery updated.
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
