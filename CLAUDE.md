# Al-Bayan — weekend Islamic school platform

Read `docs/PLAN.md` before doing anything non-trivial. It is the source of truth for the domain model, schema, roles and phases. `docs/PHASE-0.md` is the current task list.

Guiding principle: **build the simplest system that makes the school's common workflows genuinely easy.** This is an application, not a framework. When two designs work, pick the one with fewer concepts.

## Non-negotiables

- **Abstractions and config must earn their place.** Shared helpers, adapters and settings (school name, logo, timezone, bank details in `school_settings`) are fine; each new abstraction or config option needs a one-line justification in the commit or PR. What we do not build: generic entity systems, workflow engines, form builders, plugin/module systems, role/permission tables, event buses, microservices. When in doubt, write the specific thing.
- **Privacy is structural.** Data reads go through per-viewer query functions in `lib/db/queries/` (`getStudentForTeacher`, `getStudentForGuardian`, …). A teacher-facing query never selects ethnicity, languages, registration reasons, address or guardian contact details. It *does* select allergies/medical notes and emergency contacts. Never pass an admin-shaped object to a teacher/family/student component.
- **All writes are server actions** shaped as: Zod parse → access check (`lib/access.ts`) → write → audit (if sensitive) → notify. No API routes for writes except file upload.
- **Authorisation lives only in `lib/access.ts`.** Roles are derived: `users.isAdmin` plus the existence of a `guardians` / `teachers` / `students` row for the user. A user can hold several roles. Do not add role/permission tables.
- **Local development has zero service dependencies.** `pnpm dev` and `pnpm test` must work offline: local D1 (a SQLite file under `.wrangler/state/`), local R2 emulation, `EMAIL_TRANSPORT=file` writing to `.dev/mail/`. Anything cloud-specific sits behind an adapter in `lib/email/` or `lib/storage/` with a local implementation. Never add Docker or a hosted service to the dev loop.
- **Files go through the Worker** (`/api/files`), never presigned URLs.

## Data conventions (D1 = SQLite)

- Ids are autoincrement integers, except natural keys: `academic_years.id = "2026-27"`, `subjects.id = code` (`quran`). `students.studentId` (`ALB-26-0042`) is the human-facing identifier, separate from the row id. Every read is access-checked, so guessable ids are fine.
- No arrays or enums in SQLite: lists are JSON text columns; enums are text with a CHECK constraint and a TypeScript union.
- Timestamps are UTC ISO strings; the school timezone comes from `school_settings` and is used for display and "today" calculations via `lib/time.ts`.
- Money is stored as integer euro cents (`…Cents` columns) because SQLite has no decimal type; it is shown and entered only in euros, converted in `lib/money.ts`. Never do arithmetic on euro floats.
- Age is computed from `dateOfBirth`, never stored.
- The timetable is derived (session periods + teaching assignments), not stored per class.
- Payments are editable/deletable by admin; every change is audited with before/after values.

## Stack

Next.js 15 App Router on Cloudflare Workers via `@opennextjs/cloudflare` · Drizzle + D1 · Better Auth · Tailwind + shadcn/ui · Zod · Resend (prod) · Vitest + Playwright · pnpm.

## Commands

(Filled in as Phase 0 lands.)

- `pnpm dev` — app with local bindings, offline
- `pnpm db:generate` / `pnpm db:migrate:local` / `pnpm db:seed`
- `pnpm test` — unit + integration (local SQLite, no network)
- `pnpm test:e2e` — Playwright against the local app
- `pnpm bootstrap-admin` — create the first admin
- `pnpm check` — lint + typecheck

## Style

- TypeScript strict. Prefer plain functions and modules over classes.
- Server Components for reads; client components only where interaction needs them.
- UI copy is plain English aimed at parents and children; never expose internal terms (enrolment, session id, academic year id) to guardians or students.
- Use Tailwind logical properties (`ps-`, `ms-`, `text-start`) so RTL can be added later.
- Match the surrounding code's density; no comment banners, no speculative TODOs.
