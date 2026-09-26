# Al-Bayan Design Language

The single source of truth for how the application looks, feels and speaks. Every screen and component follows it; when it lacks something, **extend this document first**, then implement. Implementation lives in `lib/theme.ts` (Mantine theme) and `components/` (shared components). Nothing visual is decided ad hoc inside a page.

Audience: anyone building UI here (people and AI). Keep it concrete; when a rule needs an example, the example is the rule.

The library prototypes (git `4b6f3f8`) settled the *library and tokens* only. Their layout was too dense — stat tiles, a timeline, a register, a homework list and quick actions on one screen — and is **not** the reference for page design. The reference is §3 below.

---

## 1. Principles

1. **Calm, warm, clear.** A community school, not a corporate dashboard and not a children's game. Colour and roundness give warmth; whitespace and hierarchy give calm.
2. **Less on the page.** A page answers one question. If a second question needs answering, that's a second page, a tab, or a tap away — not another card. Whitespace is a feature; a half-empty screen is fine, a full one is a smell.
3. **One thing to do.** Every page has one obvious primary action. Parents and students should never wonder where to click.
4. **State is visible.** Attendance, fees, homework due — encode state in colour *and* words, in the same place every time.
5. **Same object, same shape.** A student, a lesson, a subject, a fee looks the same wherever it appears.
6. **Phone first for families and students, desktop first for staff.** Both work everywhere, but each role's primary device drives its layout.
7. **Nothing decorative that isn't informative.** No gradients, no illustration for its own sake, no animation without purpose.

---

## 2. Tokens

All tokens are defined in `lib/theme.ts` and referenced by name. **Raw hex values, pixel font sizes and one-off spacing never appear in a component.**

### 2.1 Colour

Ten-shade Mantine tuples; shade 6 is the "filled" shade, 0–1 are tints for light variants and backgrounds.

| Token | Shade 6 | Role | Use for | Never for |
|---|---|---|---|---|
| `tile` (primary) | `#146c60` | Brand / primary action / positive | Primary buttons, active nav, links, "present", "paid", success | Subject colour of anything but Arabic |
| `saffron` | `#d99a2b` | Attention | "Now" marker, "late", "part-paid", unread dots, warnings | Large filled areas, body text |
| `clay` | `#c44536` | Critical | "absent", "unpaid", destructive actions, errors, allergy flags | Anything not a problem |
| `lapis` | `#2b4fb4` | Subject: Quran | Quran badges, timetable blocks, homework tags | Semantic meaning |
| `plum` | `#7b4b94` | Subject: Islamic Studies | As above | Semantic meaning |
| `gray` (Mantine) | — | Neutral | Borders, dimmed text, disabled, "excused", break periods | — |

Fixed neutrals (light theme): ink `#14282c` (text, `theme.black`), ground `#f4f8f6` (page), surface `#ffffff` (cards, header, sidebar), line = `gray.3`. Dark theme uses Mantine's `dark` tuple; components must reference `var(--mantine-color-body)`, `var(--mantine-color-default-border)` etc., never the light hex. Surface is Mantine's body colour; the ground is our one extra variable, `var(--app-ground)` (dark: `dark.8`), set in `lib/theme.ts` and used by the shell's main area and `EntityList` rows.

Subject colours are assigned once, in `lib/subjects.ts` (`subjectColor(subjectId)`), with a fallback rotation for subjects added later. A subject's colour is the same on every screen.

Status colours are assigned once, in `components/StatusBadge.tsx`:

| Domain | Value → colour |
|---|---|
| Attendance | present → tile · late → saffron · absent → clay · excused → gray |
| Fee balance | paid → tile · part-paid → saffron · unpaid → clay · waived (fee is €0) → gray. There is no "overdue": a fee is outstanding or it is not. |
| Application | applied → saffron · active → tile · declined → clay · inactive → gray |
| Homework | due later → gray · due today/tomorrow → saffron · overdue → clay |
| Record | active → tile · inactive → gray (subjects, teachers, sessions) |
| Account | active → tile · invited → saffron (waiting to set a password) · disabled → gray |
| Register | taken → tile · not taken → saffron |
| Publication | draft → saffron · published → tile (homework, events) |

### 2.2 Typography

| Role | Face | Mantine mapping |
|---|---|---|
| Display / headings / big numbers | **Bricolage Grotesque** 700–800, letter-spacing −0.02em on h1 | `theme.headings.fontFamily` |
| Body / UI | **Figtree** 400–600 | `theme.fontFamily` |
| Numbers in tables | Figtree with `font-variant-numeric: tabular-nums` | `className={classes.tabular}` or `ff="monospace"` never |

Scale (Mantine `headings.sizes` / `fontSizes`):

| Level | Size | Use |
|---|---|---|
| h1 | 2rem / 800 | Page title, one per page |
| h2 | 1.5rem / 800 | Section within a page |
| h3 | 1.2rem / 700 | Card title |
| h4 | 1rem / 700 | Sub-group inside a card |
| stat | 2.25rem / 800, display face (`var(--app-font-size-stat)`) | Big numbers in stat tiles |
| md | 1rem | Body |
| sm | 0.875rem | Secondary text, table cells |
| xs | 0.75rem | Hints, badges, eyebrow labels (uppercase, `letter-spacing: 0.04em`) |

Running text max width ~65ch (`maw={640}`). Headings `text-wrap: balance`. Arabic strings inside English UI (names, surah titles) get `dir="auto"`.

Fonts load through `next/font/google` with `display: swap` and system fallbacks. Arabic counterparts (IBM Plex Sans Arabic) are added in the RTL phase, not before.

### 2.3 Spacing, radius, elevation

- Spacing: Mantine scale only — `xs 10 · sm 12 · md 16 · lg 20 · xl 32`. Page padding `lg`; gaps between cards `md`; inside cards `lg`; between form fields `md`.
- Radius: `defaultRadius: md (8px)` for controls and badges; cards `lg (16px)`; avatars, pills and segmented controls `xl`; modals `lg`.
- Elevation: **surfaces sit on the ground with a 1px border, not a shadow.** Only floating things get a shadow: modals, popovers, menus, notifications (`shadow="md"`). Never `shadow` on a card.
- Borders: `withBorder` cards, `gray.3` in light, `dark.4` in dark — always via the theme, never a hex.

### 2.4 Iconography

Tabler icons only (`@tabler/icons-react`), stroke 1.75. Sizes: 18 in navigation, 16 inside buttons and badges, 20 in `ThemeIcon` tiles, 12 inside small badges. Icons accompany text; an icon-only button has an `aria-label` and a tooltip. Directional icons (chevrons, arrows) come from `components/DirectionalIcon.tsx` so they mirror in RTL.

### 2.5 Motion

Mantine defaults (150ms ease). No entrance animations, no parallax, no skeleton shimmer beyond Mantine's. Respect `prefers-reduced-motion` (Mantine handles it; custom CSS must too).

---

## 3. Layout

### 3.1 App shell

`AppShell` with header 64px and a 240px sidebar on `sm+`; below `sm` the sidebar becomes a drawer behind a burger. A sidebar item may hold **sub-items** (Academics › Years & terms · Subjects · Sessions · Classes): the parent only opens the group, each sub-item is the page, and the group opens itself whenever one of them is current. Sub-items are for a set of setup pages that belong together; nothing else nests. A nav item whose page has work waiting carries the number in brackets — "Applications (6)" — and drops the brackets at zero; the count comes from the area's layout, so every page shows the same figure. Header: school mark + name on the start side; role switcher (multi-role users only), notifications bell with `Indicator color="saffron"`, avatar on the end side. The **bell opens a popover** (`NotificationBell`) rather than navigating: the newest unread by title, each with what it is about, then "Mark all as read" and "See all notifications". Opening one from there marks it read and follows its link, the same as on the page. Sidebar and header are surface-coloured; the main area is ground-coloured.

**Student area** replaces the sidebar with a bottom tab bar on phones — the first four nav items (Home, Timetable, Homework, Resources) and a fifth **More** tab that opens the same drawer the other areas reach with the burger, holding everything else (Attendance, Calendar, School rules, My details). Five tabs is the limit; a sixth nav item goes behind More rather than shrinking the bar. Desktop keeps the sidebar with every item.

### 3.2 Page structure

Every page uses `components/PageHeader.tsx`:

```
[breadcrumbs: Students › Ibrahim Nasser   — every nested staff page]
[eyebrow: date / context, sm dimmed]
[h1 title] [status badge] [aside]             [primary action] [secondary action]
```
Breadcrumbs are the trail *to* the page (the current page is the title); every staff page below a list has them so the way back is always visible. They are links and look like links — anchor colour, a leading ‹ chevron — never dimmed text, or nobody knows they go back. **The trail follows the URL**: a register at `/teacher/attendance/4?date=…` reads "‹ Attendance", not the class it was opened from. A page that belongs to something else as well gets a **`related`** link instead — a subtle button with a ↗ at the start of the actions ("Level 4's attendance") — so the way *sideways* is visible without borrowing a trail. Family and student pages are one level deep and use the `ChildSwitcher` and tabs instead.

The optional **subtitle** is one dimmed line under the title for the page's standing summary ("Autumn term · 3 registers not taken"). It stays in the same place whatever view the page is showing; a page whose controls switch views (attendance by day / this term) keeps title, subtitle and controls where they are and only swaps the table.
The entity's status badge sits beside the name (`badge`), not among the actions, and is **centred on the title** rather than sat on its baseline — a pill beside a 2rem heading reads as hanging off it otherwise. A short fact about the entity that belongs on the title line — "Class teacher Maryam Ahmed", linked — is the `aside`: sm dimmed text on the title's baseline, wrapping under it on a phone. A class's own teacher reads "**You** are the class teacher". One primary (`filled`) action per page, at most two secondary (`light`). Anything else goes in a `Menu` "More" button.

Content column `maw={960} mx="auto"` — narrower than a typical dashboard on purpose; wide tables (admin lists) may use `maw={1180}`. **Single column is the default.** A side column is allowed only on staff *detail* pages where the side content is about the same entity (a student profile with guardians beside it), never for a grab-bag of widgets.

### 3.3 Page budget

- At most **three content blocks** on a page (a block = a card, a table, a list, or a form). Need more? Split into tabs or pages.
- A block holds **one kind of thing**. A card with lessons does not also hold homework.
- Stat tiles appear only on the admin dashboard, at most three, and only for numbers the admin acts on (registers missing, applications pending, fees outstanding). Nowhere else.
- No "quick actions" panels. Actions live where their object is: "Take register" on the lesson, "Add homework" on the class, "Record payment" on the fee. A page's primary action sits in the `PageHeader`.
- Above the fold on a phone: the page title and the first block. Nothing else.

Worked example — teacher Today page: eyebrow with the date, "Good morning, Maryam", then **one** block: today's lessons as a timeline, each lesson row carrying its own inline actions (Take register · Add homework). Homework due today is a single line under the lessons, linking to the homework page. That's the whole page.

### 3.4 Density

Staff screens (admin, teacher) may use tables and `size="sm"` controls. Family and student screens use lists and cards, `size="md"` controls, and 44px minimum touch targets on primary actions.

### 3.5 Sign-in pages

Login, password reset, invite and change-password share one layout: no shell, the school mark and name centred at the top, then a single bordered card `maw={420}` on the ground colour holding the form, its one primary action and a short helper line. Links out of the form ("Forgotten your password?", "Back to sign in") are `Anchor size="sm"` under the card. Errors from the server show inline above the button in a `clay` light `Alert`, never a toast — the person is looking at the form.

---

## 4. Components

Use Mantine components with the variants below. Shared, opinionated wrappers live in `components/` and are preferred over re-composing Mantine each time.

### 4.1 Buttons

| Intent | Variant | Rule |
|---|---|---|
| Primary action | `filled` (tile) | One per view or dialog |
| Secondary | `light` | Up to two |
| Tertiary / cancel | `default` | Cancel, back, "Save draft" |
| Inline / quiet | `subtle` | Inside cards and table rows |
| Destructive | `filled` or `light` with `color="clay"` | Always behind a confirm modal |

In dark mode the `light` variant is the colour's shade 4 at 18% over the surface (28% on hover) with shade-2 text, set for every palette colour in `lib/theme.ts` — Mantine's default (the darkest shade, darkened again) reads as a disabled button. A pressed toggle (the Today filter) is `light`; unpressed it is `default`.

Buttons say what happens: "Publish homework", "Submit register", "Record payment" — never "OK", "Submit", "Yes". Loading state via `loading` prop, never a separate spinner. Icons in buttons are `leftSection`, size 16. A button that navigates is `LinkButton` (a client wrapper, because Server Components cannot pass `component={Link}` to Mantine).

### 4.2 Badges and status

`Badge` `variant="light"` for status and tags, `variant="filled"` only for the "Now" marker and subject chips on dark backgrounds, `variant="outline"` for neutral context ("Saturday session"). Always via `StatusBadge` or `SubjectBadge` — never a hand-coloured badge. Text is a word in sentence case (the theme turns off Mantine's uppercase), not just a colour.

### 4.3 Cards

`Card withBorder radius="lg" padding="lg"` (theme default). A card has a `CardTitle` (h3) with optional right-side context (badge or subtle button). Cards are for grouping, not decoration: a page with one thing on it doesn't wrap it in a card — the content sits directly on the ground.

### 4.4 Stat tiles

`components/StatTile.tsx`: label (sm, dimmed) · value (display face, stat size, tabular) · optional "out of" after the value ("€5,000 / €10,000", the second figure at h3 size and dimmed) · hint (xs, dimmed). Optional colour accent only when the number itself is a status (e.g. "3 registers missing" in saffron). Admin dashboard only (§3.3).

`components/Figures.tsx`: the headline numbers of a page or card — label (sm, dimmed), figure (display face, h2 size, tabular), optional hint — in one row of two to four, each with an optional `aside` after the figure — a share "(63%)" or an "out of" — at h3 size and dimmed. Fee · Paid (63%) · Outstanding (37%) on a fees page; Present · Absent on an attendance summary. Colour only when the figure is a status (outstanding → saffron, in credit → tile). Figures live *inside* a card or under the header and are not tiles; they are how staff pages get a dashboard feel without a grid of cards. Above a filtered list a figure may be a button (`onClick`) that narrows the list to the rows it counts — "Paid" shows who has paid; the current one is underlined.

### 4.5 Tables (staff only)

Staff tables are dense: the theme sets `verticalSpacing="xs"`, `fz="sm"`, `highlightOnHover`. **No stripes** — the row under the pointer is what should stand out, so the hover tint carries the emphasis on its own (`gray.2` in light, a shade darker than Mantine's default, set in `globals.css`). Header labels sentence case. First column is the entity (name, with the ID or code dimmed beneath), numeric columns right-aligned and tabular, actions in the last column right-aligned. Row-level state uses `StatusBadge` or a `SegmentedControl size="xs"` (as in the register). Filters and search sit in one row above the table, live in the URL and default to what the office asks most (students who are attending, fees still to pay). Columns worth sorting get a clickable header (`SortableTh`) with the current direction shown; totals go *above* the table as `Figures`, never in a footer. Sticky headers on long tables; pagination at 50 rows.

Filtering happens in the browser: the page loads the whole list once and a client component narrows it (`useUrlFilters` writes the filters to the URL with `replaceState`, so the view is still shareable and survives a refresh, but changing a filter never goes back to the server). Only a filter that needs different data — the academic year — navigates. A count of what is shown sits at the end of the filter row, dimmed. Lists the office takes elsewhere have an `ExportButton` ("Export CSV") in the header; the export applies the same URL filters, so what you see is what you get. Places in a class read "6 / 15" through `Places` wherever a class's size appears — lists, tab counts, card titles, for the office and for teachers: saffron when full, clay with a warning icon before the number and a tooltip when over. A column of people links to each of them ("Guardians" on the students list), not just the first. A row that leads somewhere is a `LinkRow`: the whole row is clickable, with a real link in the first cell for keyboard users. Dates in a sortable column read `2026-09-12 (Sat)` so they order as they read; a register not yet taken shows `? / 12`, keeping the column's shape (an empty class has nothing to count and says "no students"). A shortcut that sets a filter to a value — "Today" on a dated list (`TodayButton`) — is a page action in the header (or the card title on a tab), never a button among the filters; the filter row holds only filters and the count.

### 4.6 Lists (family & student)

`components/EntityList.tsx`: rounded rows on the ground colour inside a card (`bg` = ground, `radius="md"`, `p="sm"`), tappable, with a subject/status badge and a one-line title. No tables in the family or student areas.

### 4.7 Forms

Mantine form components with `@mantine/form`. Labels above fields, required marked with the Mantine asterisk, description *below the input* (set in the theme, so paired fields keep their inputs level), errors inline under the field. A server-side "check the highlighted fields" line (`FormError`) clears as soon as any value changes (`onValuesChange`), so it never outlives the mistake. Field widths: `Group grow` for pairs, full width otherwise. Dates: `DateField` (a `DateInput` preset to `valueFormat="ddd D MMM YYYY"` with the placeholder `dd/mm/yyyy`, parsing typed "19/09/2026", "19 Sep 2026" and ISO). Money: `NumberInput` with `€` prefix, `decimalScale={2}`, backed by `lib/money.ts`. Selects use `allowDeselect={false}` when a value is required. Multi-step forms (registration wizard) use `Stepper` with a review step.

Sensitive fields (country of origin, languages, reasons) are grouped under their own heading with the standard explanation copy (§7) and are always optional with "Prefer not to say".

Calendars show Saturday and Sunday — the school's days — in tile (shade 6, dark shade 3, semibold) rather than Mantine's red, and ring today (`globals.css`, `highlightToday` on `DateField`).

**Rich text** is for long-lived school text the office writes once and everyone reads (the rules), never for a form field. It is Mantine's `RichTextEditor` (TipTap) with one toolbar — H2 · H3 · bold · italic · bullet list · numbered list · link — and the same extension list on the server (`lib/rules.ts`), which re-generates the HTML through the schema on save and on render, so pasted documents keep headings, lists and links and nothing else. Read pages render it inside `Typography`.

**Optional extras** in a form (a file or link to go with homework) sit in a collapsed section under a plain "+ Attach a file or link" toggle, not on a second step, so the form has one footer: Cancel · Save as draft · Publish.

### 4.8 Modals and confirmation

`Modal radius="lg"` with an h3 title; actions bottom-end, cancel (`default`) then primary. Destructive confirmations use `modals.openConfirmModal` with the consequence in the body ("This deletes the payment of €100 recorded on 3 Oct. This cannot be undone.") and a clay confirm button.

A modal that places or moves a child ends with a **`ReviewCard`**: a tile-tinted card titled with the verb ("Offering", "Moving to") holding the facts of what is about to happen, so the office checks before it confirms. A choice with facts to weigh (which class) is a drop-down whose search box lives inside the list (`ClassPicker`, on `Combobox`), never a text input holding the chosen value. Only one per modal, only for the outcome; warnings stay `Alert`s above the buttons.

### 4.9 Feedback

- Success/error toasts: `@mantine/notifications` via `components/toast.ts` (`toast.success/error/warning`), top-end (Mantine only knows `top-right`; the RTL phase flips it), 4s, tile for success, clay for errors, saffron for warnings. Message states what happened: "Register submitted", "Payment recorded".
- Inline errors for form validation; toasts for server failures.
- Notices that stay on the page (an unverified email, a double-booked teacher): `Alert variant="light" color="saffron"` with a Tabler icon at 16, one sentence and, if there is something to do, one `light` button inside it. Never for success — that is a toast — and never more than one per page.
- Loading: `Skeleton` for page-level loads; `loading` on the button for actions. Never block the whole screen with an overlay.
- A notification is its own block, not a row in a divided list: 1px border, `md` radius, on the ground colour, with `xs` between them. Unread carries a 3px `saffron` `border-inline-start` and a 7% saffron wash — a wash, not a highlighter, so six unread still read as a list. The same block in the bell's popover, minus the body (`NotificationRow`, `compact`).
- Notifications carry **what they are about** when they are about one thing: the subject as its `SubjectBadge` and the child by first name, dimmed, beside the title — a parent of three should not have to read the sentence to know which child it concerns. Never a badge for the child; the name is enough and a row can already carry a subject badge.
- Empty states: `components/EmptyState.tsx` — Tabler icon in a light `ThemeIcon`, one sentence, one action. ("No homework due. Enjoy the weekend.")

### 4.10 Timeline and timetable

A teacher's day (Today) is derived, not stored: every session running on that weekday, its periods timed from the session start; for each class of the session the teacher has a subject in, the periods of that subject become their lessons, plus the session's staff-only slots if they teach in it at all, sorted by time. Lessons in a day render with Mantine `Timeline`, `bulletSize={26}`, past items in tile, current in saffron with a sun icon, future in gray; bullets take the surface colour (dark: `dark.6`), never white, so in dark mode they read as coloured rings. Weekly timetables render as a grid where each block's background is the subject tint (shade 0 in light; in dark a mix of the subject colour into `dark.6`, so it is still that colour and not a grey box) and its border-inline-start is the subject colour (shade 6 light, shade 4 dark), 3px, so it works in both themes and in RTL. A **staff-only slot** (a meeting) is a gray block or item carrying its title and "staff only"; families and students never see one, and their day starts at the first slot they do see.

`WeekTimetable` is that grid for a person's week: one column per day with lessons, each block showing time, class and room, linking to the class. Teachers get it as "My week"; the month calendar stays for term dates and events.

Month calendars (`MonthCalendar`) are a seven-column grid, Monday first: term days sit on the ground colour, lesson days on the tile tint with their label, events in plum, today ringed in saffron. On phones labels collapse to dots and stay in the day's `aria-label`.

### 4.11 Avatars

Initials on `tile.0`/`tile.8` for people; `gray` when the person is inactive or absent in the current context. Children in the family switcher get a distinct pastel from a fixed rotation so siblings are told apart at a glance.

### 4.12 Tab marks

An entity whose history matters keeps a read-only card of it — `ApplicationCard` for what a family asked for and what the office decided — shown to each audience with only what that audience may see. A tab may carry a **count** after its label ("Students 12", dimmed) and/or a small **mark** (`LinkTabs` `mark`) that tells the state of what is inside before it is opened: a check (tile) for good, a half circle (saffron) for partial, a cross (clay) for bad, each with a tooltip and `aria-label` in words. Shape and colour together, never colour alone. A fourth kind, **warning** (triangle, saffron), is something to do rather than a state: registers not taken on a class's Attendance tab ("3 of 15 registers not taken", `registersStanding` — the same words as the register status), for the office and the teacher alike. Used for fee status on a student's Fees tab and a guardian's Payments tab (`feeTabMark` in `lib/fees.ts`); a new use needs a line here.

---

## 5. Patterns by role

- **Admin:** dense, tables, filters at the top of lists, bulk actions in a bar that appears on selection. Sensitive information sits in a visually separate card titled "Sensitive information" with a lock icon. Guardians are listed as **families** (guardians who share a child, `lib/families.ts`), one row per family; each guardian keeps their own page. Choosing a class for a child (approval, moving) shows what the office weighs up — teacher, places taken of capacity, applications waiting — and a full class asks for a tick before it is overfilled.
- **Teacher:** the *Today* page is the home and shows only today's lessons with their inline actions (§3.3 example). Class pages are tabbed — Students · Attendance · Homework · Resources — one block per tab. Notes and resources are added from the student or class they belong to, not from a global launcher.
- **Family:** `ChildSwitcher` pills under the header on every page, hidden with one child. The child's overview is a short vertical list of "what's next" items (next lesson, homework due, unread note, balance) — a list, not a grid of cards — each linking to its tab. Never show internal vocabulary (enrolment, session id).
- **Student:** at most five navigation items, one column, big type, `size="md"` or `lg` controls, greetings by first name, due dates in relative words ("tomorrow", "in 3 days").

---

## 6. Accessibility and adaptability

- WCAG AA contrast for text on every token pairing used; light-variant badges use shade 8 text on shade 0 background.
- Visible focus ring (Mantine default), keyboard-operable everything, `aria-label` on icon-only buttons.
- Colour never carries meaning alone; a word or icon accompanies it.
- Dark theme: every component reads colours from theme tokens or Mantine CSS variables; test both themes on any new component — add it to the `/dev/ui` gallery (dev only) and check it there in light and dark, desktop and phone width. Colour scheme follows the OS by default with a toggle in the account menu.
- RTL readiness: only logical properties and Mantine's `ps/pe/ms/me` props; no `left`/`right` in CSS or `pl`/`pr` props; `DirectionalIcon` for arrows. The Arabic phase adds `DirectionProvider`, translations and Arabic fonts — no layout rewrites.
- Reduced motion respected.

---

## 7. Voice and copy

- Plain English, second person, sentence case everywhere (titles, buttons, labels).
- Name things the way families do: "your child", "Saturday class", "fee for 2026–27" — never "enrolment", "session", "academic year id".
- Buttons are verbs describing the outcome. Toasts confirm in the past tense.
- Errors say what went wrong and what to do: "We couldn't save the register — check your connection and try again."
- Dates: "Saturday 19 September" (weekday first, no ordinal); Hijri date shown on calendars and the Today page as a secondary line. Times 24h "10:00".
- Money: "€250" and "€250.50", never "250.00 EUR".
- Nothing is never a dash. An empty cell or field says what is missing in a dimmed word — "no teacher", "not placed", "none yet", "no preference" — through `Nothing` (`components/Nothing.tsx`); a count that is zero is "0". Dashes stay in prose ("Good news — …"), never as a value.
- Standard sensitive-data explanation, used verbatim: *"Optional. Used only for anonymous diversity statistics. It has no effect on any admission or placement decision."*

---

## 8. Extending the design language

Before building anything not covered here:

1. **Check Mantine.** Prefer an existing component or variant over a custom one.
2. **Write the rule here first** — a new token, a new status mapping, a new shared component or pattern — in the section it belongs to. Keep it as short as the rules above.
3. **Implement it in the shared place:** tokens in `lib/theme.ts`, colour mappings in `lib/subjects.ts` / `StatusBadge`, components in `components/`.
4. **Use it from the page.** Pages compose shared components; they don't style.

A pull request that adds a hex value, a bare `style={{ fontSize }}`, a new colour meaning or a one-off component without touching this document is incomplete.

Shared component inventory (created as needed, listed here when they exist). Existing: `Shell` (app shell with the four navigation sets and sub-items, role switcher, colour-scheme toggle in the header), `AuthPage`, `PageHeader` (with breadcrumbs and subtitle), `CardTitle`, `StatTile` (links to its page), `Figures`, `SortableTh`, `LinkRow`, `useUrlFilters`, `ExportButton`, `LinkTabs` (with marks), `ReviewCard`, `FamilyTable`, `ClassFilter`, `SchoolRules`, `MoveStudentModal` and `OfferPlaceModal` (admin, on `ClassPicker`), `StatusBadge`, `SubjectBadge`, `EmptyState`, `EntityList`, `ChildSwitcher`, `DirectionalIcon`, `MoneyText` (`lib/money.ts`), `DateText` (server-only; reads the school timezone), `SensitiveSection` (carries the standard sentence), `Field` (read-only label/value pair for profiles and review steps), `ClassTimetable` (a class's day as a Timeline, §4.10), `WeekTimetable` (a week of lessons as tinted blocks), `LessonTimeline` (today's lessons with past/now/later states and inline actions), `ResourceForm`/`ShareResourceButton` (file or link with one target), `ResourceList` (files and links as rows), `NotesCard` (staff notes on a student with the add form), `HomeworkList` (homework rows for families and students), `MonthCalendar` + `CalendarPage` (`lib/calendar.ts` month builder), `NotificationList` + `NotificationsPage` (the bell's list), `FormError`, `LinkButton`, `AppLink` (both exist because Server Components can't pass `component={Link}` to Mantine), `toast`, `confirmDestructive`. In Server Components use Mantine's named parts (`TableThead`, `TableTr`…) rather than `Table.Thead`, and `LinkButton`/`AppLink` rather than `component={Link}` — neither crosses the boundary. The `albayan/server-boundary` lint rule enforces both.
