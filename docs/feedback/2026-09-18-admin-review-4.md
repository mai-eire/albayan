# Review feedback 5 — admin, final pass, 2026-09-18

Salah's notes after the fourth pass. Status: ☑ done · ☐ open · ✗ not doing (reason).

## Bugs

- ☐ Accepting an application showed the class two bigger until a refresh. **Not reproduced** — see the note at the bottom; a double-click guard is in anyway.
- ☑ "Check the highlighted fields" stayed after the fields were fixed: forms now clear that line as soon as anything changes (Add a child, Add a parent, Invite a guardian, Offer a place, Link a guardian).
- ☑ The office's "Add a child" now asks the same as the family wizard: name, date of birth, gender, school year, Arabic level, allergies, medical needs, anything else, preferred session and class.
- ☑ A class's Applications tab listed children who had only named the session; it now lists only those who asked for that class.

## UX

- ☑ Date fields accept typed dates and say so: placeholder `dd/mm/yyyy`, and "19/09/2026", "19 Sep 2026" or "2026-09-19" all work.
- ☑ Over capacity shows in the classes list (count in clay with "over capacity") and as a warning on the class's page.
- ☑ "All" in the students status filter.
- ☑ The class's Students tab reads "Students 6 / 15" (tab and card title).
- ☑ Present · Late · Absent counts on the roster are tile · saffron · clay.

## Minor changes (later the same day)

- ☑ Classes list: places read "16 / 15" in clay with a warning icon before the number and a tooltip; a full class reads in saffron (`Places`).
- ☑ Applications column shows 0.
- ☑ Offer a place starts on the class the family named, when they named one.
- ✗ Auto-inserting "/" while typing a date: Mantine's `DateInput` owns the text as you type, so masking it means re-implementing its input handling — skipped as you allowed. Typing "19092026" doesn't parse, but "19/9/26" and "19 9 2026"-style entries do.
- ☑ No more dashes for nothing: every empty cell or field says what is missing in a dimmed word (`Nothing`), and the rule is in DESIGN §7.

## The "+2" after an offer

Tried three ways on the seeded e2e database, reading the count before and after without a reload: offering from the inbox (the picker's "6 of 15", then the next child's picker), from the child's own page (then the class page reached by links), and from the class's Applications tab (the tab counts and the roster). Every one went 6 → 7 everywhere. The only path to a double increment I can see is the button being pressed twice before the first press disabled it, which would also have created two sign-ins for the child; the offer and move forms now ignore a second press while the first is in flight. If it happens again: which page you offered from, and where you read the number, will pin it down.
