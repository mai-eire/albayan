# Review feedback 2 — admin walkthrough, 2026-09-17

Salah's notes from reviewing the admin area after Phase 3 task 1 and the first feedback pass, one line each, with what happened to them. Status: ☐ open · ☑ done · → folded into a phase task · ✗ not doing (reason) · ? needs a decision.

## Dashboard

- ☑ "Registers missing" counts the whole term so far, not just today; the hint says how many of those are this week. Links to the term view.

## Filtering

- ☑ Filters were round-tripping to the server. Lists now load once and filter in the browser (`useUrlFilters`: the URL still carries the filters for sharing and refresh, but changing one no longer re-renders on the server). Applied to students, families, staff, fees, classes and the attendance term view. CSV exports read the same URL parameters.

## Families

- ☑ A *family* is derived, not stored: guardians who share a child are one family (`lib/families.ts`, a union over `student_guardians`). The Guardians page is now **Families** — one row per family with its guardians, children and classes — and each guardian still has their own page. The fees "families still to pay" count uses the same grouping.
- ☑ Families list filters by child, session, class and teacher (e.g. every family with a child in Level 1, or in Omar's classes) and exports the filtered rows to CSV. Students and staff lists export too.
- ☑ Guardian page: "Add a parent" beside "Add a child" — pick someone already registered (search by name, email or phone) or invite someone new; either way they're linked to the children you tick.

## Staff

- ☑ Staff list filters by session, class and subject ("everyone who teaches Quran", "everyone teaching Level 1").
- ☑ Staff page has tabs: Overview (account, this term's figures: classes, registers taken / due, notes written) · Classes (each class with session, subjects, and registers taken vs due this term) · Notes.

## Students

- ☑ Adding a guardian starts by checking who already exists: the same "already registered / someone new" picker as the guardian page. (Typing an email that already has an account still just links it — no duplicate is ever created.)
- ☑ "Guardians" tab is now "Family"; siblings show their student ID, class and session.
- ☑ The Fees tab carries a fee-status mark (paid · part paid · unpaid) so the state is visible before opening it; the guardian's Payments tab does the same for the family as a whole (`LinkTabs` `mark`, DESIGN §4.12).
- ☑ Fees tab: "Also in this family" under the payments — each sibling's fee, paid and balance with a status badge, so the office sees at once whether the parent should be paying for the others too.
- ☑ "Enrolment" tab is now **Class**: the place (class, session, since, fee — with Edit fee and Move class), this term's attendance figures with the recent registers, and the class's schedule with times, subjects and teachers (the same `ClassTimetable` families see). The application details stay at the bottom.

## General

- ☑ Breadcrumbs looked like text. They're now link-coloured with a leading ‹ so they read as the way back (DESIGN §3.2).

## Academics

- ☑ Academics is no longer one page with tabs *and* breadcrumbs. The sidebar has sub-items — Years & terms · Subjects · Sessions · Classes — and each is its own page with its own breadcrumbs. `/admin/academics` goes to Classes (the page the office opens most).
- ☑ The class page is tabbed: Details · Teachers (assignments + the timetable) · Students · Applications.
- ☑ Session schedule: the period picker offers every subject, then "Break" and "Other…"; choosing Other puts the title box in the same row. Rows reorder by dragging the handle on the start side (`@hello-pangea/dnd`, the library Mantine's own examples use).

## Academics › Classes

- ☑ Applications tab: children who asked for this class, or for its session without naming a class, with a link to the inbox.
- ☑ Roster shows Present · Late · Absent · Excused as "x / n", n being the registers taken so far this term.
- ☑ Move student: the picker shows each class's teacher, places taken / capacity and applications waiting; the current class is shown above for comparison; a full class shows a warning and needs a tick to go over capacity. The same modal is used from the student's Class tab.

## Scheduling

- ? **Per-class timetables.** Today a session has one schedule (ordered periods with durations, each a subject or a break) and every class in the session follows it; only the teacher per subject varies by class. Salah's model: the session sets the *structure* (slots: Subject · Break · Other, with durations), and which subject fills each Subject slot is decided per class, so that two classes can have Quran in different slots and one Quran teacher can take both. Proposed as **Phase 3 task 16** (see PHASE-3.md) — it needs a `class_periods` table (class × session period → subject), a matrix page per session (columns = classes, rows = slots, each cell a subject select, breaks fixed), an "auto-allocate" that assigns subjects to slots so no teacher is in two rooms at once, and updates to every timetable derivation (teacher week, class day, family timetable, Today). Not started: worth agreeing the model and the auto-allocate rules first — see the task text for the questions.

## Attendance

- ☑ "This term" is the default view.
- ☑ Term view dates read "2026-09-12 (Sat)" so they sort as they read.
- ☑ A register not taken shows "? / 12" instead of "12 students".
- ☑ The whole row opens the register.
- ☑ Same layout in both views: title, then `[date] [By day] [This term]` on the end side; the "Autumn term · 15 of 16 registers still to come" line sits under the title in both (`PageHeader` `subtitle`).

## Resources

- ☑ File resources show the file name under the title.
