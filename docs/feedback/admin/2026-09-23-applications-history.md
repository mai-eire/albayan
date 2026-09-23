# Admin — applications kept, 2026-09-23

Salah asked to see previous applications and decisions, and for the application to be visible on a student's page. Status: ☑ done · ? decided in the reply.

## The office's list

- ☑ `/admin/applications` lists every application of a year — waiting, accepted, declined. Filters: academic year (navigates, defaults to the current one), session, class, child or guardian, and status (defaults to **Waiting**).
- ☑ The Outcome column carries the decision and its date; the drawer shows where an accepted child was placed (and the note sent with the offer) or why one was declined. Decision buttons only appear while it waits.
- ☑ The nav count and the "5 waiting" eyebrow still count only those waiting.

## On a student's page

- ☑ **Admin**: the whole application, including what the family wrote and the reason for a refusal.
- ☑ **Family**: the same, plus **Edit** while the office hasn't decided — the wizard's questions in one form, audited, no notification (decision 2026-09-23).
- ☑ **Teacher**: the facts only — applied, year, decision, session and class asked for, school year and Arabic at the time, and where the child was placed. Not the family's notes, not the decline reason.
  - The privacy test hid `preferred_session_id` from teacher queries; that was stricter than CLAUDE.md's list (ethnicity, languages, reasons, address, guardian contacts), and the decision above needs it, so the test now hides `application_notes` and `declined_reason` only.

## Schema

- ☑ Migration 0007: `students.application_year_id` (indexed, references `academic_years`) and `students.declined_at`. Backfilled — the year from the session the family named, else the current year; the decline date from the row's last change.
- ☑ Every path that creates an application records the year: the family wizard, the office's "Add a child", the seed.

## Follow-ups

- ☑ A declined application keeps its "Offer a place after all" button — the office changes its mind, or a place opens. The offer modal opens with an amber note saying when and why it was declined; accepting clears the refusal (the audit log keeps it) and emails the family as usual. Declining stays a one-way step from "waiting".
- ☑ The guardian's name in the table links to their page; clicking anywhere else on the row still opens the application.
- ☑ An accepted application links to the child's page from the panel ("Open Amira's page"), not the table — a column of links that only some rows have reads as broken, and the panel is where you are when you want the child.
