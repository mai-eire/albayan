# Al-Bayan School Platform — Architecture & Implementation Plan

Status: proposal v2, pre-implementation. Written 2026-09-15.

v2 changes: Cloudflare hosting (Workers + D1 + R2), Drizzle instead of Prisma, `SchoolSession` concept, **schedule defined per session** (ordered periods with durations) + **teacher-per-subject per class**, fees on enrolment with payments (no discount modelling), medical info + emergency contacts, diversity reporting.

Guiding principle: **build the simplest system that makes the school's common workflows genuinely easy.**

---

## 0. Context and decisions already made

| Question | Answer |
|---|---|
| School type | Weekend / supplementary school (Arabic, Quran, Islamic Studies). |
| Sessions | Students enrol into **one session** (e.g. Saturday or Sunday). Sessions are replicas of each other. More may be added later (Sat-Morning, Sat-Evening). |
| Grouping | One class per student per academic year. A class belongs to one session. |
| Schedule | Defined **per session**: a start time and an ordered list of periods (subject or break, with a duration). All classes in a session share it. Per class, admin assigns a teacher to each subject. Per-class schedule overrides and co-teachers are possible later additions, not built now. |
| Fees | One **annual** fee per student (stored on the enrolment), defaulted from the year's standard fee and editable by admin (discounts are a manual edit, rules not modelled). Payments recorded against it. Online payments later. |
| Hosting | **Cloudflare** only (Workers, D1, R2). Small scale. |
| Student login | Student ID + password. Optional student email/phone; if set, can log in with it and recover the student ID. |
| Notifications | In-app + email. No SMS in v1. |
| Language | English only; strings structured so Arabic/RTL can be added later. |
| Registration | Application → admin approval. Guardians state a preferred class/session. |
| Attendance | Once per student per school day. |
| Student "academic year" field | The child's mainstream-school year group (`schoolYearGroup`), distinct from the school's academic year and class. |
| Sensitive data | Country of origin etc. collected optionally for diversity statistics; admin-only; form explains it plays no part in decisions. |
| Safety data | Medical/allergy info per child; emergency contact per guardian. Visible to the child's teachers. |
| Student ID | `ALB-26-0042` |
| Local development | **Zero service dependencies.** `pnpm dev` must work offline: SQLite on disk for the DB, local folder for files, emails written to disk. No Docker, no cloud accounts needed to contribute. |

---

## 1. Recommended technology stack

**Single full-stack TypeScript app, deployed entirely on Cloudflare.**

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16 (App Router) on Cloudflare Workers via `@opennextjs/cloudflare`** | Cloudflare's officially supported path for Next.js (`npm create cloudflare@latest -- --framework=next`). Server Components + Server Actions keep pages simple. |
| Database | **Cloudflare D1** (SQLite) | Single vendor, free tier covers this scale, zero ops. Trade-offs below. |
| ORM / migrations | **Drizzle ORM** | First-class D1 support, runs in Workers, typed schema in TypeScript, SQL migrations via `drizzle-kit` applied with `wrangler d1 migrations apply`. Prisma on Workers is possible but needs driver adapters and is heavier — not worth it. |
| Auth | **Better Auth** (email/password + username plugin, Drizzle adapter) | Works in Workers; student ID acts as username. |
| UI | **Mantine 9** (`@mantine/core`, `@mantine/dates`, `@mantine/hooks`) + Tabler icons | Chosen after a three-way prototype (Mantine / MUI / Tailwind+shadcn, see git history `4b6f3f8`). Broadest coverage with the least code — dates, forms, tables, modals, notifications, timeline all built in; colourful and rounded by default; first-class RTL via `DirectionProvider` for the Arabic phase; no Tailwind. |
| Charts | **`@mantine/charts`** (Recharts underneath; admin reports only) | Same theme tokens as the rest of the UI. |
| Validation | **Zod** | Shared between forms and server actions. |
| Email | **Resend** | Cloudflare does not send transactional email (Email Workers only receive/route), so one external email provider is unavoidable. |
| Files | **Cloudflare R2** via the Worker binding | Private bucket. Uploads and downloads stream through the Worker (no presigned URLs), so the same code runs against the local emulator. |
| Scheduled jobs | Cloudflare Cron Triggers (only if a need appears, e.g. homework-due reminders) | |
| Testing | Vitest (+ `@cloudflare/vitest-pool-workers` for D1 integration tests), Playwright | |
| Tooling | pnpm, ESLint, Prettier, GitHub Actions, Wrangler | |

### D1 (SQLite) trade-offs — read before agreeing

D1 is the right call for "one dependency" and this scale, but it is SQLite, which shapes the schema:

- No array or enum columns: `spokenLanguages`, `registrationReasons` are stored as JSON text; enums are text columns with `CHECK` constraints (Drizzle enforces at the type level too).
- No timezone-aware timestamps: everything stored as UTC ISO strings / integers; the app renders in the school's timezone (a `school_settings` value; **to confirm — Europe/Dublin?**).
- No decimal type: money is stored as integer cents (`feeCents`, `amountCents`) because SQLite would otherwise store `250.10` as a float and sums drift. The UI, forms and emails only ever show and accept euros (`250` or `250.50`); the conversion lives in one `lib/money.ts`.
- Single-writer, ~10 GB limit, no concurrent-transaction complexity: fine for a school; irrelevant at this scale.
- Reporting queries (group by country of origin, etc.) are trivial in SQLite.

Fallback if D1 ever bites: Postgres on Neon reached through Cloudflare Hyperdrive. Drizzle makes that a migration, not a rewrite. Do **not** start there — it adds a vendor for no current benefit.

### Why not Netlify

Netlify hosts Next.js well but provides neither a database nor object storage, so it would mean Netlify + Neon + R2 + Resend. Cloudflare covers hosting, DB and files in one account.

### Framework fallback

If the OpenNext adapter causes friction in Phase 0 (it should not; it supports App Router, server actions, middleware, ISR), the alternative is **React Router v7 (framework mode)**, which has a native Cloudflare Workers template. Decide at the end of Phase 0, before feature code exists.

**Decided 2026-09-16: stay on Next.js + OpenNext.** Nothing adapter-specific hurt in Phase 0 (note in PHASE-0.md, task 15). vinext (Cloudflare's Vite-based Next runtime) is the fallback to look at first if a real deploy misbehaves.

Alternatives considered and rejected: Django/Rails (fine choices, but not a Cloudflare-native fit and less "SaaS-feel"); separate SPA + API (two codebases); Supabase/Firebase (RLS policies for this role model become the hardest part). UI: MUI (fights its Material identity, `sx` everywhere, custom colours need TS augmentation) and Tailwind + shadcn (cleanest result but the whole component layer and its character are code we'd own and maintain).

### Design language

Everything visual — tokens, layout, component rules, patterns per role, copy — is specified in **`docs/DESIGN.md`**, which is the source of truth and is extended before any new visual decision is implemented. Summary: tile green primary, saffron accent, clay critical, lapis/plum as subject colours; Bricolage Grotesque headings, Figtree body; bordered cards on a tinted ground; light and dark from Phase 0; logical properties throughout for the RTL phase.

---

## 2. High-level architecture

One Next.js app running as a Cloudflare Worker, bound to one D1 database and one R2 bucket, calling Resend for email. No queues, no microservices, no event bus.

```
Browser ──► Cloudflare Worker (Next.js via OpenNext)
              ├── app/(auth)        login, register, reset, invite
              ├── app/admin/...     admin area
              ├── app/teacher/...     teacher area
              ├── app/family/...    guardian area
              ├── app/student/...   student area
              ├── server actions    all writes (Zod → access check → write → audit → notify)
              ├── lib/access.ts     the entire authorisation layer
              ├── lib/db            Drizzle schema + per-viewer query functions
              ├── lib/email         Resend + React Email templates
              └── lib/storage       R2 presigned URLs
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
       D1           R2         Resend
```

Structural rules:

- **Reads** happen in Server Components using query functions in `lib/db/queries/*.ts`, each written for a specific viewer (`getStudentForTeacher`, `getStudentForGuardian`). This is how field-level privacy is enforced without a permission engine.
- **Writes** are Server Actions: validate → check access → write → audit (if sensitive) → notify → email. Plain functions.
- **Email/notification dispatch** uses `waitUntil` (Workers' after-response hook) so users aren't blocked. No queue at this scale; an outbox table + Cron Trigger is the upgrade path.
- **Local development has no service dependencies** (see below).
- **No generic anything.**

### Local development — zero service dependencies

`git clone && pnpm install && pnpm dev` works offline. Every external thing has a local stand-in that needs no account, no Docker and no network:

| Concern | Production | Local (`pnpm dev`, tests) |
|---|---|---|
| Database | D1 | **SQLite file** on disk — D1's local mode *is* SQLite (`.wrangler/state/v3/d1/*.sqlite`), provided in-process by Miniflare through OpenNext's dev bindings. Same Drizzle code, same migrations (`wrangler d1 migrations apply --local`). Inspect with any SQLite tool. |
| Files | R2 bucket | Miniflare's local R2 emulation, stored under `.wrangler/state/`. Same binding API, same code. |
| Email | Resend | `EMAIL_TRANSPORT=file`: each email is written to `.dev/mail/<timestamp>-<subject>.html` and logged to the console (link included for password resets/invites). No mail server. |
| Auth | Better Auth | Same, it's a library. |
| Cron | Cloudflare Cron Trigger | `wrangler dev --test-scheduled` or a `pnpm cron:run` script; only relevant if a cron ever exists. |
| Seed data | — | `pnpm db:seed` fills the local SQLite with the demo school (§15). |

Rules: no code path may call a network service in dev unless `NODE_ENV=production`; anything cloud-specific is behind a small adapter (`lib/email/transport.ts`, `lib/storage/bucket.ts`) with a local implementation. `wrangler dev` (also local) is the final production-like check before deploy.

| Concept | Model decision |
|---|---|
| User | `User` — identity and login only. |
| Roles | Derived: `User.isAdmin` flag + existence of a `Guardian`, `Teacher` or `Student` row for the user. A user can hold several roles (teacher who is also a parent). |
| Parent / Guardian | `Guardian` (1:1 User) with address, emergency contact, sensitive demographic fields. `StudentGuardian` join carries the relationship (mother/father/…) and primary-contact flag. |
| Student | `Student`, login optional (`userId` nullable), with medical info. |
| Teacher | `Teacher` (1:1 User). Minimal. |
| Academic Year / Term | `AcademicYear` (with standard fee) and `Term`. |
| School Session | `SchoolSession` — a recurring weekly slot (Saturday 10:00–14:00) in an academic year. Classes belong to exactly one. |
| Class | `Class`, scoped to one academic year and one session. New rows each year → enrolment history for free. |
| Subject | `Subject` — global list. |
| Schedule / Period | `SessionPeriod` — an ordered entry in a session's schedule: subject (or a title such as "Break") and duration in minutes. Start/end times are computed from the session start time, never typed. |
| Teaching assignment | `TeachingAssignment` — (class, subject, teacher). "Who teaches Arabic to Level 2". A teacher's timetable = their assignments joined to their class's session periods. A co-teacher later is simply a second row. |
| Timetable / Lesson | **Not a table.** A class's timetable = its session's periods + its teaching assignments. |
| Enrolment | `Enrolment` — student in class, **carries the agreed fee**. |
| Attendance | `Attendance` — one row per student per date. |
| Homework | `Homework` on (class, subject). |
| Teacher Note | `StudentNote` with visibility. |
| Resource | `Resource` attached to exactly one of: school-wide, (class, subject), homework, student. |
| Fee / Payment | Fee = `Enrolment.feeCents`. `Payment` rows against the enrolment. Balance derived. |
| Event / Activity | `Event` with type, optional class/session targeting, `EventParticipant` for registration & consent. |
| Calendar | Not a table: union of terms, session schedules (weekly) and events. |
| Parent-Teacher Meeting | `Event` of that type. Slots later. |
| Application | Not a table: a `Student` with `status = applied` plus `preferredSessionId` / `preferredClassName`. |
| Notification / AuditLog | Per-user rows / sensitive-action rows. |

### Relationship summary

- Guardian ⟷ Student: many-to-many via `StudentGuardian`.
- Student → Class: `Enrolment` (one active at a time; history retained).
- Class → Session: many-to-one. Session → Periods: one-to-many. Class → TeachingAssignments: one per subject in the session's schedule.
- Teacher "teaches" a student if they have a teaching assignment in the student's active class, or are the class teacher.
- Student → Attendance / Notes / Resources / EventParticipants: one-to-many. Homework reaches students via their class.
- Guardian → Payments: via `Payment.paidByGuardianId` (who paid) and via children (whose fee it was).

---

## 4. Database schema (D1 / SQLite via Drizzle)

Shorthand. `id` is an **autoincrement integer** except where a natural key is noted: `academic_years.id = "2026-27"`, `subjects.id = code` (e.g. `quran`). Students additionally carry the business identifier `studentId` (`ALB-26-0042`), assigned on approval. All tables have `createdAt`/`updatedAt` (ISO UTC). JSON columns noted. Money is stored as integer euro cents (`…Cents` columns) and only ever shown/entered in euros.

### Identity

```
users
  id, email? UNIQUE, username? UNIQUE (= studentId for students), passwordHash,
  name, phone?, isAdmin bool, status (active|invited|disabled),
  emailVerifiedAt?, lastLoginAt?
```
(Better Auth adds its own `sessions`, `accounts`, `verifications` tables.)

### People

```
guardians
  id, userId UNIQUE,
  addressLine1?, addressLine2?, city?, postalCode? (Eircode), area? (derived from Eircode routing key, e.g. "D15"),
  emergencyContactName?, emergencyContactPhone?, emergencyContactRelationship?,
  spokenLanguages JSON [], countryOfOrigin?,                    -- sensitive
  registrationReasons JSON [] (arabic|quran|religion|mosque|community|other),
  registrationReasonOther?                                      -- sensitive

students
  id, studentId? UNIQUE (assigned on approval), userId? UNIQUE,
  firstName, lastName, gender (male|female), dateOfBirth,        -- age computed
  countryOfOrigin?, isHomeschooled,                             -- countryOfOrigin sensitive
  schoolYearGroup?,                                             -- mainstream school year
  arabicProficiency (none|beginner|intermediate|advanced|native),
  email?, phone?,                                               -- student's own, optional
  allergies?, medicalNotes?,                                    -- safety; visible to their teachers
  status (applied|active|inactive|declined),
  preferredSessionId?, preferredClassName?, applicationNotes?,  -- from the guardian's application;
                                                                -- the class preference is a level by
                                                                -- name, since a family may name the
                                                                -- level without naming the day
  applicationYearId?,                                           -- the year applied for, kept so a
                                                                -- decided application is still findable
  offerNote?, declinedReason?,                                  -- the office's word to the family
  appliedAt, approvedAt?, declinedAt?, createdByGuardianId

student_guardians
  studentId, guardianId, relationship (mother|father|guardian|grandparent|other),
  isPrimaryContact bool                                         PK (studentId, guardianId)

teachers
  id, userId UNIQUE, title?, isActive bool
```

### Academic structure

```
academic_years    id ("2026-27" — the name is the key; URL-safe, never changes), startDate, endDate,
                  isCurrent bool, standardFeeCents
terms             id, academicYearId, name, startDate, endDate
school_sessions   id, academicYearId, name ("Saturday"), dayOfWeek (0–6), startTime, isActive
session_periods   id, sessionId, sortOrder, subjectId? | title? ("Break", "Assembly"), durationMinutes
                  -- exactly one of subjectId / title is set; end time of the session = start + Σ durations
subjects          id (code, e.g. "quran" — natural key), name, isActive
classes           id, academicYearId, sessionId, name ("Level 2"), classTeacherId?, room?, capacity?
teaching_assignments
                  id, classId, subjectId, teacherId              UNIQUE (classId, subjectId)
                  -- one row per subject in the session's schedule; a co-teacher later = drop the
                  -- unique constraint and add a role column, nothing else changes
enrolments        id, studentId, classId, startDate, endDate?, status (active|left),
                  feeCents, feeNote?
                  UNIQUE partial: one active enrolment per student
```

Timetable derivation (a query, not a table):
- Class timetable: `session_periods` of the class's session, each period's teacher from `teaching_assignments` by subject.
- Teacher timetable: their `teaching_assignments` → class → session → the period(s) with that subject → computed times.
- "Today's lessons": sessions where `dayOfWeek = today`, then the above.
- Per-class schedule override (if ever needed): a `class_periods` table that, when non-empty for a class, replaces the session's list. Not built now.

### Daily work

```
attendance        id, studentId, date, classId, status (present|absent|late|excused),
                  note?, recordedByUserId                       UNIQUE (studentId, date)
homework          id, classId, subjectId, title, description (markdown), dueDate,
                  createdByUserId, publishedAt?
student_notes     id, studentId, authorUserId, body, category (general|praise|concern|behaviour),
                  visibility (staff|guardians|guardians_and_student), deletedAt?
resources         id, title, description?, kind (file|link), storageKey?, mimeType?, sizeBytes?, url?,
                  uploadedByUserId, audience (students_and_guardians|guardians_only|staff_only),
                  -- exactly one target (CHECK): isSchoolWide | (classId, subjectId?) | homeworkId | studentId
```

### Fees

```
payments          id, enrolmentId, amountCents, paidOn, method (cash|bank_transfer|card),
                  reference?, paidByGuardianId?, recordedByUserId, providerRef? (Stripe later), note?
```
- Fee is **annual**: `enrolments.feeCents`, set at approval from `academic_years.standardFeeCents`, editable by admin at any time with a free-text `feeNote`. Discount rules change year on year and are not modelled; the admin simply edits the amount.
- Balance = `feeCents − Σ payments`. Status (unpaid / part-paid / paid / waived-when-fee-is-0) is derived, not stored.
- Per-student list: payments on the student's enrolments. Per-guardian list: payments where `paidByGuardianId` = guardian, plus a "family" view summing all their children's balances.
- Payments are ordinary editable rows: a mis-entered amount is corrected in place, a mistaken payment is deleted. Both are admin-only and written to the audit log with before/after values. No ledger semantics.
- The approval and student screens show how many siblings are already enrolled, so the admin can apply whatever discount is current without the system knowing the rule.
- Extra charges (trips, books) are **not** fees in v1; trip fees arrive with event registration in a later phase.

### Events & calendar

```
events            id, title, description?, type
                  (trip|camp|summer_school|club|sports_day|community|parent_teacher_meeting|holiday|closure|other),
                  startAt, endAt, location?, isPublished bool,
                  requiresRegistration bool, requiresConsent bool, feeCents?,
                  audience (whole_school|selected_sessions|selected_classes), createdByUserId
event_targets     eventId, sessionId? | classId?        -- only when audience is selected_*
event_participants id, eventId, studentId, status (registered|withdrawn),
                  consentGivenByGuardianId?, consentAt?
```
Holidays and closures are events. A Saturday-only closure targets the Saturday session.

### Platform

```
notifications     id, userId, type, title, body?, href?, readAt?,
                  subjectId?, studentId?                        -- what it is about, when it is
                                                                -- about one: a subject badge and
                                                                -- the child's name on the row
audit_log         id, actorUserId?, action, entityType, entityId, changes JSON, ip?
```

### Deliberately absent

No `roles`/`permissions`, `campuses`, `class_subjects`, `fee_charges`/`invoices`/`ledger`, polymorphic `documents`, key-value `settings`. School-level config (name, timezone, ID prefix, bank details for the "how to pay" box, the school rules, and the R2 key of their logo) is a single `school_settings` row.

---

## 5. Authentication

- Better Auth, email/password + username plugin, Drizzle/D1 adapter. DB-backed session cookies (httpOnly, secure, sameSite=lax).
- **Guardians:** self-register with email + password; must verify email before submitting a child application.
- **Teachers & admins:** invite-only; admin creates the account, invite email with set-password link.
- **Students:** login field accepts *student ID or email*. Account created on approval with a generated one-time password shown to the guardian (and printable). Forced password change on first login. If the student verifies an email, they can use email login, email reset, and "forgot my student ID". Otherwise guardians/admins reset the student's password.
- Password reset by email for anyone with a verified email.
- Rate limiting on auth endpoints via Cloudflare WAF rate-limiting rules (no code).
- Login failures, password changes and role changes are audited.

---

## 6. Authorisation / role model

Roles: **admin, teacher, guardian, student**, derived per §3. Multi-role users get a role switcher; the URL prefix (`/admin`, `/teacher`, `/family`, `/student`) decides which hat is on.

`lib/access.ts`, plain functions:

```
requireAdmin / requireTeacher / requireGuardian / requireStudent (session) → role row
canViewStudent(viewer, studentId)     admin | guardian of | teaches | self
teachesClass(teacher, classId)        class teacher OR has a teaching assignment in the class
teachesSubjectIn(teacher, classId, subjectId)   has the (class, subject) teaching assignment
canViewResource(viewer, resource)
```

| | Admin | Teacher | Guardian | Student |
|---|---|---|---|---|
| Students | all, RW | own classes, limited fields | own children; name, year and health RW (audited) | self, R |
| Sensitive demographics (country of origin, languages, reasons, address) | RW | **hidden** | own only | — |
| Allergies / medical notes | RW | **visible** for own students | own children RW | own, R |
| Emergency contact (on guardian) | RW | **visible** for own students' guardians | own RW | — |
| Guardian phone/email | RW | hidden (name + relationship only) | own; other parents by name and relationship only | hidden (name + relationship only) |
| Attendance | RW (audited after the day) | RW own classes | R | R |
| Homework | RW | RW own class+subject | R | R |
| Notes | RW | RW own; R others' on own students | R by visibility | R by visibility |
| Resources | RW | RW own | R by audience | R by audience |
| Fees / payments | RW | — | R own children | — |
| The school's logo | RW (Settings) | R | R | R |
| Events | RW | R | R + register/consent | R |
| Reports | R | — | — | — |

Privacy is structural: teacher-facing queries never select the hidden columns. Medical and emergency-contact data are the deliberate exception because a teacher is the person on the spot.

Field policy: country of origin (guardian and student), spoken languages and registration reasons are **optional**, with "prefer not to say", and the form states: *"Used only for anonymous diversity statistics. It has no effect on any admission or placement decision."* They feed the admin reports (§11) as aggregate counts and are never shown to teachers.

---

## 7. Routes / pages

```
/login  /register  /forgot-password  /reset-password  /change-password  /invite/[token]
/forgot-student-id        (with task 7, when students get their own email)
/dev/ui                   Every component in both colour schemes; development only

/admin                    Dashboard: registers due today (by session), pending applications,
                          outstanding fees, upcoming events, headline diversity charts
/admin/applications       Applied students → approve (session/class, fee) / decline
/admin/students           List (filter by session/class/year) → /[id] profile tabs
/admin/guardians          List → /[id] (children, payments, sensitive info)
/admin/staff              Teachers & admins, invites
/admin/academics          Years, terms, sessions, subjects
/admin/academics/classes  Classes for current year → /[id]: roster, timetable, attendance summary
/admin/attendance         By date and session: registers submitted / missing; edit
/admin/fees               Outstanding balances, record payment, payment history
/admin/events             Events & calendar
/admin/resources          School-wide resources
/admin/reports            Diversity & demographics: ages, sessions, boys and girls, Arabic at
                          registration, country of origin, languages, postal area, why they
                          came; year picker; /export for all of them as one CSV
/admin/audit              Audit log
/admin/rules              School rules (rich text, shown in every area)
/admin/settings           School details, timezone, ID prefix, bank details, the school's logo

/teacher                  Today: my schedule, the register to take (class teacher), homework due
/teacher/classes          My classes → /[classId]: roster, timetable, attendance, homework, resources
/teacher/students/[id]    Limited profile incl. allergies/medical + emergency contact; /application
/teacher/attendance       This term's registers for my classes; /[classId]?date= takes one
/teacher/homework         Mine across classes; create/edit
/teacher/resources        Mine
/teacher/timetable        My week
/teacher/rules            School rules

/family                   Children, and the other parents on them
/family/[studentId]       Details (the base tab), then timetable | attendance | homework | notes
                          | resources | fees | application | events
/family/fees              What the household owes this year and every payment recorded
/family/register-child    Application wizard
/family/parents           Add another parent
/family/calendar  /family/rules
/family/account           Own details, emergency contact, sensitive info, email preference

/student                  Home: next class, homework outstanding, last register, latest note
/student/timetable | homework | resources | calendar | attendance | details | rules

Every area also has /{area}/notifications. Anonymous: /api/logo (the school's logo, §12).
```

---

## 8. Guardian UX

- Child switcher in the URL (`/family/[studentId]/...`); hidden when one child. `/family` itself lists the children and the other parents on them, by name and relationship only.
- A child's tabs open on **Details**, which the family may correct: the name, date of birth, gender, school year and health notes are theirs to keep right (audited); the student ID, the Arabic level and the class are the school's. Each tab says what is inside — counts, "3 / 6" for attendance, a mark for the fee.
- **Application wizard**: (1) your details incl. emergency contact, (2) child: name, DOB, gender, year group, Arabic proficiency, allergies/medical, preferred session (Saturday/Sunday) and optionally preferred class, (3) optional diversity questions with the statistics explanation, (4) review & submit. Add another child from the same wizard with guardian details pre-filled.
- Pending child shows "Application received — we'll email you when it's reviewed".
- **Fees**: a tab per child with that child's fee, what has been paid and the balance, and `/family/fees` for the household — every child and every payment the office has recorded, with the "How to pay" box. Read-only; the office records payments.
- **Application**: what they asked for and what became of it, editable by the family until the office decides.
- **Events**: one-tap register/consent, recorded with name and timestamp.
- Guardians see "Level 2 · Saturday" — never "academic year", "session id" or "enrolment".

## 9. Student UX

Home · Timetable · Homework · Resources · Attendance · Calendar · School rules · My details. Phone-first, big targets, plain language: the bottom bar carries the first four and a **More** tab for the rest (DESIGN §3.1), because a student has no burger.

- **Home** answers "what do I have to do?": the next class, homework still outstanding with overdue first, the last register, the latest note. Every row leads to the page it summarises.
- **My details** is read-only — what the school has written down, their own allergies and medical notes, and who it has down as looking after them by name and relationship. Corrections go through a parent, and the page says so.
- Notes shown only when teachers opted the student in.

## 10. Teacher UX

- **Today**: lessons today (their assignments in classes whose session runs today, with computed times), "Take register" per class where they're class teacher or teach the first period, homework due today, quick actions.
- **Quick actions**: Take attendance · Add homework · Add note · Share resource.
- **Register**: roster, all default present, tap to toggle, save. Same-day edits allowed; afterwards admin-only.
- **Class page**: roster with age, Arabic proficiency, allergy flag icon; timetable; attendance summary; homework; resources.
- **Student page (limited)**: attendance, homework, notes, resources, allergies/medical, emergency contact. Nothing else.
- Teachers never edit timetables, enrolments or fees.

## 11. Admin UX

- Sidebar: **Dashboard · Applications · Students · Guardians · Staff · Academics · Attendance · Fees · Events · Resources · Reports · Settings**. Audit log lives under Settings to keep the list at twelve.
- **Applications inbox**: applied children with age, year group, Arabic proficiency, preferred session, guardian and siblings already enrolled. Approve = confirm session/class, confirm fee (defaults to the year's standard fee, editable), generate student ID + OTP, notify guardian.
- **Academics setup**, once a year: year → terms → subjects → sessions (with their schedule) → classes (pick session) → teachers per subject for each class. "Copy last year's structure" pre-fills sessions, schedules and classes.
- **Schedule editor** (per session): set the start time, then an ordered list of periods — pick a subject or type a title (Break), set duration in minutes, drag to reorder. A live preview shows the computed timeline (10:00 Quran · 10:50 Arabic · 11:40 Break · 11:55 Islamic Studies). No times are typed.
- **Class teachers** (per class): a table with one row per subject in the session's schedule and a teacher dropdown on each row, plus the class teacher. The class timetable renders underneath. A teacher assigned to the same subject in two classes of the same session is shown as a warning (they'd be in two rooms at once), not blocked.
- **Fees**: outstanding balances by session/class; record payment (choose child's enrolment, amount, method, who paid); payment history per student and per guardian; export CSV.
- **Reports**: bar charts of the children who have a place in the year — age (one bar per year of age, not bands), session, gender, Arabic at registration, country of origin, languages spoken at home, postal area, why the family came; year picker. Counts only, and the page says so; one CSV holds every report. The household answers (address, languages, reasons) live on a guardian, so a child's are taken from the guardian who registered them — the person who answered those questions. Two of the eight (ages, countries) also sit on the dashboard, linking here.
- **Attendance**: by date → sessions → classes → submitted/missing; drill in and edit (audited).
- **Year rollover** (end of year, Phase 3): create the next academic year, copy sessions/schedules/classes, then a roll-over screen listing every active student with a proposed next class (default: same level name, admin adjusts) → creates next year's enrolments at the new standard fee and marks the old ones ended. Guardians get a "confirm your child's place for 2027-28" notification. Students who don't return are marked `inactive`. This is the only annual workflow beyond setup, and the first one isn't needed until the end of year one.

### On the proposed generic navigation

The suggested top-level set is a good *admin* IA but wrong for the other roles. Recommendation: **role-specific navigation** (four nav sets above); admin's is closest to your list, with Applications and Reports added and Homework moved inside class/student pages.

---

## 12. File / resource storage

- Private R2 bucket bound to the Worker. **All file traffic goes through the Worker**, never via presigned URLs:
  - Upload: `POST /api/files` route handler → access check → stream the request body into `env.BUCKET.put(key, stream)` → create the `resources` row. Workers stream uploads without buffering; 25 MB is well within limits.
  - Download: `GET /api/files/[...key]` → `canViewResource` on the resource that owns the key (a key with no resource row yet is admin-only) → `env.BUCKET.get(key)` → stream back with `Content-Disposition` and cache headers. Cloudflare's cache can serve repeats.
  - This is one code path that works identically against the local emulator, and it keeps the authorisation check in one place. Presigned URLs were rejected because they don't work offline and would add a second auth path.
- 25 MB limit; PDF, images, Office docs, audio, MP4. Links stored as `kind = link`.
- Key layout `uploads/{uuid}/{filename}`. Bucket versioning on.
- **One public exception**, `GET /api/logo`: the sign-in page needs the school's logo before anyone has a session. It serves nothing but the key held in `school_settings`, so no other object is reachable through it, and it sends a sandbox CSP so an SVG opened at that URL cannot run script. The upload still goes through `/api/files`; the action then asks R2 what actually landed rather than trusting the browser.

## 13. Notifications

- `notifications` rows + Resend emails, created by a `notify()` helper inside the causing server action, dispatched with `waitUntil`.
- v1 triggers: application approved/declined; new homework; new family-visible note; new resource; event published / registration confirmed; payment recorded; absence marked (per-school toggle); staff invite; student OTP issued.
- A notification may record **what it is about** — a subject and a child — and the row then shows the subject's badge and the child's first name, so a parent of three knows which one it concerns. Those are the only two things a notification is ever about; there is no generic entity reference.
- A recorded payment tells **every guardian of that child** what came in and what is left ("€100 received for Amira" · "Cash on Saturday 3 October. Still to pay: €50."), linking to that child's fees. A correction or a deletion does not: the family was told what the office received, and a second message about the same money would confuse more than it corrects.
- The bell opens a popover with the unread ones and the two actions anyone wants there (mark all as read, see them all); the full list is `/{area}/notifications`.
- One per-user "email me about updates" toggle. No digests/push/SMS.
- Email goes through `lib/email/transport.ts` with two implementations: `resend` (production) and `file` (dev/test, writes HTML to `.dev/mail/`). Templates are React Email components rendered to HTML in both cases, so what you see locally is what gets sent.

## 14. Audit / history

- `audit_log` written explicitly by server actions for: auth events; edits/deletes of sensitive, medical or emergency-contact data; attendance edits after the day; note deletions; fee changes and payments; approvals/declines; role changes.
- Natural history: enrolments (class history), audited payment edits, soft-deleted notes.
- No temporal tables.
- **Data protection (GDPR):** the school is a data controller. The app needs three admin actions and nothing more: export a family's data (JSON/CSV), delete a declined/withdrawn application outright, and anonymise a student who has left (keeps attendance/payment history for the school's records, strips name, DOB, medical and demographic fields). A short privacy notice is linked from the registration form. Retention (e.g. anonymise N years after leaving) is a manual admin decision, not a scheduled job, in v1.

## 15. Testing strategy

- **Unit (Vitest):** `lib/access.ts` exhaustively; age calc; student-ID generation; balance derivation; timetable derivation from session periods + assignments; "today's lessons".
- **Integration (Vitest workers pool, real local D1 = a throwaway SQLite file per run, no network):** approve application; take register; record payment; register for event; report queries.
- **E2E (Playwright against a locally running app with seeded SQLite and file email transport — assertions on emails read the `.dev/mail/` folder):** guardian registers → application → admin approves → student OTP login; register → guardian sees it; homework → student sees it; consent to trip; record payment → family balance; teacher blocked from a student outside their classes.
- **Seed:** 1 year, 3 terms, 2 sessions (Sat/Sun), 4 classes each, 3 subjects, 8 teachers, 60 students, 40 families with a few siblings and a teacher-parent.

## 16. Deployment

- **Cloudflare Workers** (OpenNext) + **D1** + **R2** + Resend. Custom domain via Cloudflare DNS; WAF rate limiting on `/login`, `/register`, `/forgot-*`.
- Environments: `production` and `staging` as two Worker environments with their own D1/R2 bindings (`wrangler.toml` `[env.staging]`). Preview per PR is optional (Workers Builds supports it).
- CI (GitHub Actions): lint, typecheck, unit + integration tests → `wrangler d1 migrations apply` → `opennextjs-cloudflare deploy`. Migrations always backward-compatible with the running build.
- Backups: D1 Time Travel (30-day point-in-time restore) plus a weekly `wrangler d1 export` to R2 via a cron job. R2 versioning on.
- Secrets via `wrangler secret`. Errors to Sentry (free tier) or Workers Logs. External uptime ping.
- Cost: effectively £0–5/month at this scale (Workers paid plan £5 if request/CPU limits are exceeded).

## 17. Development phases

**Live status lives in [`ROADMAP.md`](ROADMAP.md); this section is the original scope and rationale and is not updated with progress.** Each phase ends with something a real user can log into.

**Phase 0 — Foundation (≈1 week)**
Next.js + OpenNext with local D1/R2 bindings working offline first, then the Cloudflare project (Worker, D1, R2, staging env), Drizzle schema for identity/people/academics, Better Auth (first admin created by a one-off `pnpm bootstrap-admin` script / seed, never a public signup), role derivation + switcher, four route groups with guards, `lib/access.ts` with tests, seed, CI + deploy. *Checkpoint: OpenNext friction? If yes, swap to React Router v7 now.*

**Phase 1 — Registration & school setup (≈2 weeks)**
Guardian registration + verification; application wizard (incl. medical, emergency contact, diversity questions, preferred session); admin applications inbox with approve (session/class/fee) → student ID + OTP; academics: years, terms, subjects, sessions with schedule editor, classes, teacher-per-subject assignment; teacher invites; people lists/profiles with the privacy split; family/student areas show details and timetable.

**Phase 2 — Daily workflows (≈2–3 weeks)**
Teacher Today; registers; homework; notes; resource upload/sharing; family/student views; calendar; notifications + email; admin attendance overview.

**Phase 3 — Fees, events, reports, hardening (≈2 weeks)**
Fees on enrolment (admin-editable), payments, per-student/per-guardian history, outstanding list; year rollover; events with targeting, registration, consent; admin reports with charts + dashboard headlines; audit viewer; account settings incl. student email/phone linking and "forgot my student ID"; accessibility + mobile pass; E2E suite.

**Later, only when asked:** Stripe Checkout (→ `payments.providerRef`); PTM slots; homework completion; Arabic/RTL; SMS/WhatsApp; per-lesson attendance; trip fees and per-event documents; co-teachers/assistants on a class; per-class schedule overrides; discount rules if they ever stabilise.

---

## Decisions on formerly open questions

All settled 2026-09-15; the defaults below are now the plan.

1. Teachers do **not** see guardian phone numbers or email; contact goes through the office. Teachers see guardian name + relationship, and the emergency contact.
2. Emergency contact is **per guardian**; a child's profile shows all of their guardians' emergency contacts.
3. Same-day absence emails to guardians: **per-school toggle, default off**.
4. Year rollover: **admin rolls continuing students over, guardians confirm** — no re-application.
5. Schedule per session; teachers per subject per class; co-teachers, per-class overrides and discount rules deferred until asked for.
