# Mobile readiness

Live checklist for making the app work on a phone without changing how it looks on a desktop. The rules themselves live in [DESIGN.md §3.6](DESIGN.md); this file tracks the work. "Phone" means below Mantine's `xs` (576px) or `sm` (768px), as each rule says.

**Last updated:** 2026-10-01

## The root cause

Most of the reported symptoms were one bug. When anything on a page is wider than the screen — almost always a table — mobile browsers widen the whole layout to fit it, and every fixed element sizes itself to that wider layout: the burger drawer and the header became wider than the phone (so the page scrolled sideways), and modals centred themselves on the wide layout, off screen. At 390px every admin list, and most pages with a table, were wider than the screen.

The fix is to never let a page be wider than the screen, and **`e2e/pages.spec.ts` now enforces it**: after the usual checks, every page is resized to 390px and fails if it scrolls sideways, naming the element that sticks out. It cannot see content that a `Card` clips (Mantine cards are `overflow: hidden`), so a new wide element inside a card still needs a look at phone width.

## Done

- [x] **Every table scrolls inside its own box** — wrapped in `Table.ScrollContainer type="native" minWidth={0}`, so it never widens the page. On phones cells don't wrap (`globals.css`): one line per row, swipe sideways for the rest, instead of every cell squeezed into a column of single words. Desktop unchanged.
- [x] **Drawer, header and modals** — fixed by the above; checked the burger drawer and the "Invite a teacher or admin" modal at 390px.
- [x] **Paired fields stack on phones** — every `Group grow` (DESIGN §4.7) becomes a column below `xs`, from one rule in `globals.css`, so no form halves its inputs.
- [x] **Filter rows become a grid** — `components/FilterBar.tsx` replaces the `<Group wrap="wrap">` above the seven staff lists: one row on desktop as before; on a phone the search spans the width and the other filters sit two to a row.
- [x] **Tabs scroll instead of wrapping** below `sm` (`globals.css`), and `LinkTabs` scrolls the current tab into the middle. Tabs that fit look exactly as before.

## Next, by return on effort

1. **Fewer columns on the busiest tables** (Students, Families, Fees, Staff, Applications). Scrolling makes every column reachable; hiding the secondary ones on a phone (`visibleFrom="sm"` on the `Th` and its `Td`s) puts the useful ones on the first screen. About five lines per table. Needs a decision per table on which columns matter on a phone — the office's call.
2. **Long forms in modals** (homework, calendar entry, payment, add a child) — usable now, but a phone-height modal with a long form may read better full screen below `xs` (`fullScreen` from `useMediaQuery`). Look at each first; only change the ones that are cramped.
3. **Family and student pages on a real phone** — they were built for phones (DESIGN §3.4) and none of them overflowed once tables were fixed, but nobody has walked them on a device yet.
4. **The filter count** ("54 shown") sits at the end of the last grid row on phones; fine, but worth a look once column hiding is in.

## Decided against

- **Cards instead of tables for staff lists.** Staff tables are dense on purpose (DESIGN §4.5) and are mostly used at a desk; a second, card-shaped rendering of each list would double the code for every column change. Scrolling plus fewer columns gets most of the benefit. Family and student lists are already cards (`EntityList`).
- **A dropdown or prev/next arrows for tabs.** Sideways scrolling with the current tab centred is what phones already do everywhere, costs no extra component, and only shows when the tabs don't fit.
