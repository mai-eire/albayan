# Review feedback — 2026-09-17

Salah's notes from the first walkthrough (after Phase 3 task 1), one line each, with what happened to them. For reviewing the changes; not a spec. Status: ☐ open · ☑ done · → folded into a phase task · ✗ not doing (reason).

## Admin

- ☐ Dashboard tiles link to their page.
- ☐ Colour-scheme toggle out of the profile menu, into the header.
- ☐ Paired form fields misalign when one has a description → descriptions below the input, theme-wide.
- ☐ Profile cards read-only by default, with an Edit button; Sensitive tab as a compact grid, not a text document.
- ☐ Selects with an icon misalign their text once a value is chosen.
- ☐ Guardians editable from the student page → link to the guardian page, which gets edit forms.
- ☐ Admin tables too fluid → dense: striped, compact, sortable, filters and search above (DESIGN §4.5).
- ☐ "Day" → "Session" in staff copy; sessions shown as "Saturday 10:00–14:00".
- ☐ Breadcrumbs on every nested staff page (My classes › Level 1 › Ahmed).
- ☐ Classes list filterable by session and teacher; clear way back from a class.
- ☐ Settings: say the student ID prefix only affects IDs issued from now on.
- ☐ Resources: audience wording ("Students & guardians"); rows show who it's shared with and when. No separate "all" — staff always see everything.
- ☐ Attendance list: Students + Absent → one "Present 7 / 8" column.
- ☐ Attendance aggregate for the office (term view: date × class, teacher, present/total, register status). → new task 15.
- ☐ Staff as a proper table; deactivation with its date; deactivated staff hidden by default with a toggle; delete only for invites never accepted; staff detail page (classes, sessions with times, notes written, last sign-in). → new task 14.
- → Scheduling conflicts visible when assigning teachers (the clash check exists). → task 10.

## Fees

- ☐ Money shown as big figures (Fee · Paid · Balance), not only table cells → `Figures` strip.
- ☐ Guardian Payments: per-child fee/paid/balance above the list; filter by child.
- ☐ Student Fees: the balance is the headline; overpayments flagged ("In credit").
- ☐ Record payment: search matches the student ID; picking a child shows paid / fee / outstanding.
- ☐ Fees table: totals at the top; sortable by balance.
- → Applications drawer shows class capacity, siblings and the guardian's payment record. → task 2.

## Closer ties

- ☐ Student page shows siblings ("Also in this family" on the Guardians tab).
- ☐ Collect the guardian's gender; relationship options follow it (Mother / Father).
- ☐ Co-guardians: a parent adds another parent (invite by email, choose children or "all my children"); admin adds a guardian to a student or a child to a guardian. → new task 13.

## Teacher

- ☐ "You teach": "Class teacher" tag after the subjects.
- ☐ Bug: Class › Attendance offers "Today's register" on a non-lesson day.
- ☐ Teachers may take or correct registers for past lesson days this term (audited after the day).
- ☐ Student attendance as a table: date · session · status · note.
- ☐ Notes: add form at the top, one card per note.
- ☐ Homework/Resources add buttons on the right; homework shows Draft/Published; attachment in the create form; no class picker when already on the class.
- ☐ Student resources: choose the audience, not only "the family".
- ☐ Calendar shows nothing useful for teachers → week view of their own lessons with times; month calendar stays for families and students and carries events later.
- ✗ Filter a teacher's class list — a teacher has 1–4 classes.

## Family

- → Overview shows each child's balance; a Payments page with total, paid and the list. → task 2.
- ☐ "Add a child" at the end of the child pills.
- ☐ Address in the wizard is the guardian's own; if we have it, show it with "Change" rather than a blank form.
- ☐ Ethnicity list simplified to top-level categories.

## Student

- → Attendance page. → task 2.
