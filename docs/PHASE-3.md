# Phase 3 — Fees, events, reports, hardening

Goal: the office runs the money and the calendar through the app and can answer the questions it gets asked. Fees sit on enrolments, payments are recorded and corrected in the open, families see their balance and how to pay; events reach the right families and collect registrations and consent; the reports page draws the demographic and attendance pictures; the audit log is readable; the three data-protection actions exist; the year can roll over. Then an accessibility and phone pass and the full E2E suite, and the app is ready for a first school.

Estimated ≈2 weeks. Scope and rationale: PLAN §17; tables in PLAN §5 "Fees", "Events & calendar" (not in the schema yet — each lands with its task as a migration).

Definition of done: on a seeded DB, admin records a €100 cash payment against a child, edits it to €120 and deletes another — each audited with before/after and the family's fees tab shows the right balance and the "How to pay" box; admin publishes a trip for Saturday classes with consent, the family registers and consents in one tap and the event page lists who is coming; the reports page shows the eight charts for the current year and exports CSV; the audit page filters by action and person; admin exports one family's data, deletes a declined application and anonymises a student who left; the rollover screen creates next year's enrolments from proposed classes. `pnpm test` covers balance derivation, event targeting, report counts and anonymisation; `pnpm test:e2e` runs record payment → family balance and consent to a trip; the accessibility pass leaves no axe violations on the main pages.

## Tasks

- [x] **0. Schema v3** — `payments`, `events`, `event_targets`, `event_participants` from PLAN §5 as one migration with CHECK constraints (payment method, event type, audience, participant status); constraint tests. DoD: `pnpm test` covers them.
- [x] **1. Fees (admin)** — `/admin/fees`: outstanding balances by session/class with totals; record payment (child's enrolment, amount in euros, method, paid on, who paid, reference, note); edit and delete payments (audited before/after); per-student and per-guardian history on their profiles; CSV export. `lib/fees.ts` derives balance and status (unpaid / part-paid / paid / waived when the fee is 0) with tests. Edit a student's fee and note from the enrolment tab (audited). No "overdue": there is only what is outstanding. DoD: the dashboard tile becomes "Fees outstanding" (total and number of families) and is real.
- [ ] **2. Fees (family)** — `/family/[id]/fees`: fee for the year, payments, balance; family total on the overview; "How to pay" box with the bank details from `school_settings`. Payment recorded notifies the guardian. A family with an outstanding balance from a previous year sees it flagged plainly at the top of the application wizard, and the applications inbox flags it to the admin on that child's row and drawer. DoD: `getStudentForGuardian` carries the balance; never shows another child's payments; the wizard and inbox flags tested.
- [ ] **3. Events (admin)** — `/admin/events`: create/edit/publish events (type, dates, location, description, audience: whole school / sessions / classes, registration and consent flags, optional fee); participants list with consent timestamps; CSV. Holidays and closures are events too and appear on calendars. Publishing notifies the targeted families. DoD: targeting tested (a Saturday-only trip never notifies Sunday families).
- [ ] **4. Events (family, student, teacher)** — calendar gets events as its third source; `/family/events` (or per child) lists upcoming events with one-tap register / consent recorded with name and timestamp; students and teachers see events read-only. DoD: registration confirmation notification; withdrawing works.
- [ ] **5. Reports** — `/admin/reports` with `@mantine/charts`: active students by ethnicity, spoken language, postal area, gender, age (one bar per year of age, no bands), session, Arabic proficiency, registration reasons; year filter; counts only; CSV export; two or three headline charts on the dashboard. DoD: report queries tested against the seed; nothing per-student leaves the page.
- [ ] **6. Audit viewer** — `/admin/settings/audit`: the log newest first with filters by action, person and date; before/after rendered readably. DoD: every audited action so far shows sensibly.
- [ ] **7. Accounts** — student `/student/account`: add and verify an email, phone; then email login, reset and `/forgot-student-id` work for them; guardians and admins can reset a student's password (temporary password shown once, audited). Teacher `/teach/account` (name, phone, email preference). DoD: forgot-student-id e2e.
- [ ] **8. Data protection** — on the guardian profile: export the family's data (JSON); on a declined application: delete outright; on a student who left: anonymise (keeps attendance and payments, strips name, DOB, medical, demographic fields, sign-in). Privacy notice page linked from `/register`. All audited. DoD: anonymisation tested; exports never include other families.
- [ ] **9. Year rollover** — `/admin/academics/years/[id]/rollover`: create the next year (copy sessions, schedules, classes), then a screen listing every active student with a proposed next class (same level name; adjust), creating next year's enrolments at the new standard fee and ending the old ones; students not returning are marked inactive; guardians get "confirm your child's place" notifications. DoD: integration test rolls the seed over.
- [ ] **10. Accessibility and phone pass** — axe on every main page in both schemes, keyboard paths for registers, forms and modals, 44px targets, contrast; fix what turns up. DoD: axe clean; documented in DESIGN §6.
- [ ] **11. Deploy readiness** — the deferred Phase 0 deploy: Cloudflare resources, secrets, first staging deploy, GitHub secrets, Resend domain; backups (D1 Time Travel note, weekly export cron). DoD: staging URL works end to end with the seed.
- [ ] **12. E2E + roadmap** — Playwright: record payment → family balance; publish trip → consent; forgot-student-id. Roadmap and PLAN kept current; the "Later" list reviewed with the school.

## Decisions made before Phase 3 (2026-09-16)

- No "overdue" concept: a fee is either outstanding or not. What matters is that an outstanding balance from a previous year is flagged to the family when they apply again and to the admin reviewing the application.
- Events with a fee show the amount; the money is collected outside the app.
- Reports break age down per year of age, not bands — a school's numbers are small enough.

## Decisions made during Phase 3

- 2026-09-16 (task 1) — A student's fee for a year is the fee on their current place; their payments are every payment against any of their places that year, so a class move never double-counts or loses money. A guardian's Payments tab lists the family's payments (all their children), with "Paid by" as a column, rather than only payments recorded against that guardian — the office asks "what has this family paid?", not "which parent handed over the cash?".

## Explicitly not in Phase 3

Stripe, PTM slots, homework completion tracking, Arabic/RTL, SMS/WhatsApp, per-lesson attendance, co-teachers, per-class schedule overrides.
