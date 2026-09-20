# Review feedback 3 — admin walkthrough continued, 2026-09-18

Salah's notes after the second pass, one line each, with what happened to them. Status: ☑ done · ☐ open · → folded into a phase task · ✗ not doing (reason) · ? needs a decision.

## General

- ☑ Students and applications tables were narrower than families and staff — every admin list is `maw={1180}` now.
- ☑ Timetable blocks were washed out in dark mode: the tint is now a real shade of the subject colour (`--mantine-color-<c>-light` is a 10% overlay in dark) with a stronger border, and the time/text read on it in both schemes.
- ☑ Dark-mode console errors: the scheme toggle rendered the icon for the server's guess and then the client's, so hydration failed and React re-rendered the tree (that is where the `<script>` warning came from). The toggle now renders the same on both sides and picks the icon by CSS on the resolved scheme.

## Families

- ☑ Stays "Families", grouped.
- ☑ "Invite a guardian" on the Families page: name, email, phone, gender, and optionally "link to an existing guardian's children" (pick one; all of their children ticked, untick to leave some out). With no one picked, they get an invite and register children themselves.
- ☑ Every class filter in the app labels its options "Level 1 · Saturday" — the plain names looked like duplicates.
- ☑ Family name is derived (not stored): two guardians → `male_surname-female_surname` (genders unknown: primary contact first; both the same surname → `first-surname` of the first, so "Begum-Begum" never appears); one guardian → `first-surname`; more than two → the first two. **Open item:** a real family record (guardians and children as members, a name of its own) would be cleaner; noted in PHASE-3 under decisions to make later.

## Guardian page

- ☑ Tabs: Details · Sensitive · Payments, matching the student page.
- ☑ "Also in this family": the other guardians of this guardian's children, with what they are to which child.
- ☑ "Add a child": when the children already have another guardian, "also a child of …" is ticked by default for each; unticking leaves them off. (The family's own wizard still adds under the parent registering; do the same there if you want it.)

## Staff

- ☑ Admin edits a staff member's name and phone from the Overview tab (email is their login and stays read-only); audited.

## Academics › Session › Schedule

- ☑ A "Staff only…" slot kind with a title (staff meeting, briefing). It sits in the session's timeline like any other slot; teachers see it on Today, My week and the class page in gray; families and students never do — their day starts at the first slot they can see.

## Applications

- ☑ One **Offer a place** modal used from the inbox, the class's Applications tab and the student page: the child's details with their preferred session and class, the family table (every sibling, applied or enrolled: guardians, session, class, status, fee status), the same class picker as "move to" with each class's teacher, places and waiting list and a link to the class page, fee and note, an amber review card for the offer, a warning when the offered class or session is not the one asked for, with an optional explanation that goes into the email, the notification and the family's child page. The action reads "Offer a place".
- ☑ The family table is on the move modal too, and both modals link to the chosen class.
- ☑ The inbox table shows the preferred class (it did when set; it now says "any class" when only the session was named).

## Attendance

- ☑ Term view hides the date picker; day view shows it.
- ☑ Session reads "Saturday (10:00–14:00)".
- ☑ Excused counts as not present: Present = recorded − absent − excused.
- ☑ The register lists each student as a link to their page (office view only; the teacher view keeps names).
- ☑ The "/" in Present lines up: both sides have a fixed width.
- ☑ Date column sorts either way.
- ☑ "Register: Any · Not taken · Taken" filter; the dashboard tile links to the not-taken list.

## Fees

- ☑ The figures are links: Students/Outstanding → still to pay, Fees → everyone, Paid → a new "Paid or part paid" filter.
- ☑ Search box matching the student, their ID or a guardian's name.

## Resources

- ☑ Date on the end side of each row; audience as an outline badge.

## Other

- ☑ School rules: a text box in Settings; shown as "School rules" for families (nav item), teachers (nav item) and students (a card on Home → `/student/rules`, since the phone bar is at its five tabs).

## For later (added to PHASE-3 "Later")

- Daily schedule override (first day of term, exams, trip day).
- Unsaved-changes warning when leaving a page.
- A stored family record (see Families above).
