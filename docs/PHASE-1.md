# Phase 1 — Registration & school setup

Goal: the school can be set up for a year and families can register children into it. Admin builds the academic structure (year, terms, subjects, sessions with their schedule, classes, teachers per subject); guardians register, verify their email and apply for a child; admin approves into a class with a fee and the child gets a student login; every role sees the people and timetable they are allowed to.

Estimated ≈2 weeks. Scope and rationale: PLAN §17.

Definition of done: on a seeded DB, an admin can create a new session, edit its schedule and see the timeline preview; invite a teacher who accepts and appears in the staff list; a new guardian can register, verify, and submit an application; the admin approves it (session, class, fee) and the guardian's email carries the student ID and one-time password; the student logs in and sees their timetable; the teacher's roster shows the child with an allergy flag and no address, ethnicity or guardian phone; the admin's student profile shows everything. `pnpm test` covers the privacy split of every per-viewer query and the timetable derivation; `pnpm test:e2e` runs the register → approve → student login flow.

## Tasks

- [x] **1. Shared components** — `EntityList`, `CardTitle`, `DateText`, `MoneyText`, `SensitiveSection`, `DirectionalIcon`, `ChildSwitcher`, plus `lib/money.ts` (`eurosToCents`, `formatEuros`) and `lib/age.ts` (`ageOn(dateOfBirth, date)`). Added to `/dev/ui`. DoD: unit tests for money and age; components checked in both schemes.

- [x] **2. Academic years & terms** — `/admin/academics`: years list, create/edit year (dates, standard fee, mark current), terms per year. Actions audited. DoD: admin creates 2027-28 with three terms; "current" moves; validation on overlapping dates.

- [x] **3. Subjects** — same page, tab: list, add, rename, deactivate. Subject colour from `lib/subjects.ts`. DoD: new subject appears in the schedule editor's subject picker.

- [x] **4. Sessions & schedule editor** — sessions per year (name, weekday, start time, active); per session the ordered periods (subject or title, minutes, drag/arrow reorder) with the live computed timeline (10:00 Quran · 10:50 Arabic …). DoD: computed times match `lib/timetable.ts` unit tests; deleting a session with classes is refused.

- [x] **5. Classes & teachers per subject** — classes per session (name, room, capacity, class teacher); per class a table with one row per subject in the session's schedule and a teacher select, plus the rendered class timetable. Double-booked teacher (same subject, same session, two classes) shown as a warning, not blocked. DoD: teaching assignments upsert per (class, subject); warning appears in seed data when provoked.

- [x] **6. Staff** — `/admin/staff`: teachers and admins list; invite teacher (creates user + teacher row, sends `InviteEmail`), invite admin, resend invite, deactivate/reactivate teacher, remove admin flag (never the last admin). DoD: invited teacher accepts via `/invite/[token]` and shows in the list as active; audit rows written.

- [x] **7. Guardian registration** — `/register`: name, email, phone, password → Better Auth sign-up with email verification (`VerifyEmailEmail`); guardian row created on sign-up; `/family` shows "verify your email" until verified and blocks the application wizard. DoD: e2e registers, opens the link from `.dev/mail`, lands verified.

- [x] **8. Application wizard** — `/family/register-child`: (1) your details incl. address, emergency contact; (2) child: names, DOB, gender, year group, Arabic proficiency, allergies/medical, preferred session (+ optional class); (3) optional diversity questions with the standard sentence; (4) review & submit. Creates `students` (status applied) + `student_guardians`. "Add another child" pre-fills step 1. DoD: pending child shows "Application received" on `/family`; validation tested at the action level.

- [ ] **9. Applications inbox** — `/admin/applications`: applied students with age, year group, proficiency, preferred session, guardian, siblings already enrolled; detail drawer; approve (session/class select, fee defaulting from the year, note) → student ID from `school_settings.studentIdPrefix` + year, student user with synthetic email + temporary password, enrolment, `ApprovedEmail` to guardian carrying ID and password; decline with reason → `DeclinedEmail`. Both audited. DoD: integration test approves a seeded application end to end; ID sequence is per year and gap-free.

- [ ] **10. People lists & profiles (admin)** — `/admin/students` (filters: session, class, status; search) → profile tabs Details · Guardians · Sensitive (lock icon, `SensitiveSection`) · Enrolment; `/admin/guardians` → profile with children and sensitive info. Edit actions for details, medical, sensitive fields (audited). DoD: per-viewer queries in `lib/db/queries/students.ts` (`getStudentForAdmin`).

- [ ] **11. Teacher views** — `/teach/classes` (my classes with session, level, count) → `/teach/classes/[id]` Students tab: roster with age, proficiency, allergy flag; `/teach/students/[id]`: limited profile with allergies/medical and guardians' names, relationships and emergency contacts only. DoD: `getStudentForTeacher` test proves ethnicity, languages, reasons, address and guardian phone/email are never selected; `canViewStudent` enforced with `notFound()`.

- [ ] **12. Family & student views** — `/family`: `ChildSwitcher`, child overview list (place, next lesson, application status), `/family/[studentId]/details` and `/timetable`; `/family/account` (own details, emergency contact, sensitive info, email preference); `/student` home (next lesson) and `/student/timetable`. Timetable derived by `lib/timetable.ts` from session periods + assignments. DoD: `getStudentForGuardian` and `getStudentForStudent` tested; timetable renders per DESIGN §4.10.

- [ ] **13. Notifications helper** — `lib/notify.ts`: `notify(db, { userId, type, title, body, href })` writes the row and, if the user's email preference allows, sends the matching email via `waitUntil`. Used by approve/decline and invites. Bell shows the unread count; the list UI is Phase 2. DoD: unit test for the preference gate.

- [ ] **14. E2E + roadmap** — Playwright flow: register → verify → apply → admin approves → student logs in with the emailed password → timetable visible; teacher blocked from a student outside their classes. Roadmap and PLAN kept current; PHASE-2.md created at the end.

## Decisions to make during Phase 1

- Student ID format: `ALB-26-0042` = prefix, two-digit start year of the academic year, four-digit sequence per year. Sequence source: `max(studentId)` for the year under the approve action (single-writer D1 makes this safe).
- Email verification: Better Auth `emailVerification.sendOnSignUp`; applications require `users.emailVerified`.
- Whether to keep the wizard state client-side (single client component with `Stepper`) or per-step server round trips. Recommendation: client-side, one action on submit.

## Explicitly not in Phase 1

Attendance, homework, notes, resources UI, fees/payments UI, events, reports, notifications list, year rollover, GDPR actions.
