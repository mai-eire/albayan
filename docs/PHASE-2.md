# Phase 2 — Daily workflows

Goal: a normal school day runs through the app. A teacher opens *Today*, takes the register, sets homework, writes a note and shares a resource; families and students see attendance, homework, notes and resources for their child; admin sees which registers are missing and can fix any day; the calendar shows terms, lesson days and events; every change that families should know about notifies them.

Estimated ≈2–3 weeks. Scope and rationale: PLAN §17. The daily-work tables (`attendance`, `homework`, `student_notes`, `resources`, PLAN §5) are not in schema v1 yet; each lands with its task as a migration.

Definition of done: on a seeded DB, a teacher's *Today* lists this morning's lessons with computed times and a "Take register" button on the class they lead; the register saves with everyone present by default and one toggled absent; the guardian's overview shows that absence and the admin's attendance page shows the register as submitted; the teacher publishes homework with a file attached and the student sees it as "due in 3 days" and can open the file; a teacher's note marked for guardians appears on the family page and never on the student's unless allowed; admin edits a past register and the audit row records before/after. `pnpm test` covers the attendance rules (one row per student per day, same-day teacher edits only), homework visibility and resource targeting; `pnpm test:e2e` runs the take-register → guardian sees it flow.

## Tasks

- [x] **0. Schema v2** — `attendance`, `homework`, `student_notes`, `resources` from PLAN §5 as one migration with the CHECK constraints (attendance status, note category/visibility, resource's single target); constraint tests in `lib/db/schema.test.ts`. DoD: `pnpm test` covers the uniqueness of (student, date) and the resource target check.
- [x] **1. Teacher Today** — `/teach`: today's lessons from `dayOfWeekIn` + the session schedules + my assignments, each with computed times (`lib/timetable.ts`), the class and room; "Take register" on classes where I'm class teacher or teach the first period; homework due today; empty state on a non-school day. DoD: matches DESIGN §3.3 example; Hijri date on the eyebrow.
- [ ] **2. Registers** — `/teach/attendance/[classId]?date=`: roster with every student present by default, tap to cycle present → late → absent → excused, optional note, one save; same-day edits by the teacher, admin-only afterwards (`lib/access.ts` rule + test); `attendance` unique on (student, date). Absence notification to guardians if `school_settings.absenceEmails`. DoD: integration test for the day rule and the unique constraint.
- [ ] **3. Admin attendance** — `/admin/attendance?date=`: sessions running that day → classes → submitted / missing, with counts; drill in to view and edit a register (audited before/after). Dashboard tile "Registers missing" becomes real. DoD: dashboard count matches the page.
- [ ] **4. Homework** — `/teach/homework` (mine, across classes) and the class page's Homework tab: create/edit/publish on (class, subject) with title, markdown description, due date; only for subjects I teach in that class (`teachesSubjectIn`). Publishing notifies the class's guardians and students. DoD: `homework` status derived by `lib/homework.ts` (due later / due soon / overdue) with tests; `StatusBadge` homework domain used.
- [ ] **5. Resources** — `/api/files` opened to teachers for their own uploads; `resources` with exactly one target (school-wide, class+subject, homework, student) and an audience; `/admin/resources` (school-wide), teacher uploads from a class, homework or student; download links through the Worker with the access check. DoD: test that a guardian can fetch a class resource for their child and not another class's; 25 MiB cap enforced.
- [ ] **6. Notes** — teacher/admin notes on a student with category and visibility (staff / guardians / guardians and student); soft delete; family-visible notes notify the guardian. DoD: `getStudentForGuardian`/`ForStudent` return only notes their visibility allows (tested).
- [ ] **7. Class page tabs (teacher)** — `/teach/classes/[id]`: Students · Attendance (summary per student this term) · Homework · Resources on `LinkTabs`; student page gains attendance, homework, notes and resources. DoD: nothing sensitive added to `lib/db/queries/teach.ts` (the SQL test keeps passing).
- [ ] **8. Family & student daily views** — `/family/[id]/attendance | homework | notes | resources`; overview list gains "this week's attendance", "homework due", "latest note"; `/student` home with today's lessons, homework due (relative words), attendance summary; `/student/homework`, `/student/resources`. DoD: DESIGN §5 family/student patterns; both colour schemes; phone width.
- [ ] **9. Calendar** — `/teach/calendar`, `/student/calendar`, family calendar: terms, weekly lesson days and events (events land in Phase 3; the union is built now so adding them is one more source). Hijri date shown as secondary. DoD: `lib/calendar.ts` builds a month from terms + sessions with tests.
- [ ] **10. Notifications list** — bell → `/{area}/notifications`: list, mark read (single and all), unread count already on the bell; `notify()` gains the Phase 2 triggers (homework, note, resource, absence). DoD: marking read updates the bell without a full reload.
- [ ] **11. Admin class page** — `/admin/academics/classes/[id]` gains roster and attendance summary; enrolments can be moved between classes of the same year (audited). DoD: moving a student keeps history (old enrolment `left`, new `active`).
- [ ] **12. E2E + roadmap** — Playwright: teacher takes a register → guardian sees the absence → admin edits it; teacher publishes homework with a file → student opens it. Roadmap and PLAN kept current; PHASE-3.md created at the end.

## Decisions to make during Phase 2

- Register default: everyone present (PLAN §10). Whether "late" needs a time — recommendation: no, a note is enough.
- Homework description: markdown rendered with a small allow-list, or plain text with line breaks. Recommendation: plain text first; add markdown when a teacher asks.
- Whether teachers can see other teachers' notes on their students (PLAN §5 says read). Recommendation: yes, staff-visible notes are shared.

## Explicitly not in Phase 2

Fees and payments UI, events with registration/consent, reports, audit viewer, year rollover, GDPR actions, Arabic/RTL, SMS, Stripe.
