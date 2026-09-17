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

`AppShell` with header 64px and a 240px sidebar on `sm+`; below `sm` the sidebar becomes a drawer behind a burger. Header: school mark + name on the start side; role switcher (multi-role users only), notifications bell with `Indicator color="saffron"`, avatar on the end side. Sidebar and header are surface-coloured; the main area is ground-coloured.

**Student area** replaces the sidebar with a bottom tab bar on phones (5 tabs: Home, Timetable, Homework, Resources, Calendar) and keeps the sidebar on desktop.

### 3.2 Page structure

Every page uses `components/PageHeader.tsx`:

```
[breadcrumbs: Students › Ibrahim Nasser   — every nested staff page]
[eyebrow: date / context, sm dimmed]
[h1 title]                                    [primary action] [secondary action]
```
Breadcrumbs are the trail *to* the page (the current page is the title); every staff page below a list has them so the way back is always visible. Family and student pages are one level deep and use the `ChildSwitcher` and tabs instead.
One primary (`filled`) action per page, at most two secondary (`light`). Anything else goes in a `Menu` "More" button.

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

Buttons say what happens: "Publish homework", "Submit register", "Record payment" — never "OK", "Submit", "Yes". Loading state via `loading` prop, never a separate spinner. Icons in buttons are `leftSection`, size 16. A button that navigates is `LinkButton` (a client wrapper, because Server Components cannot pass `component={Link}` to Mantine).

### 4.2 Badges and status

`Badge` `variant="light"` for status and tags, `variant="filled"` only for the "Now" marker and subject chips on dark backgrounds, `variant="outline"` for neutral context ("Saturday session"). Always via `StatusBadge` or `SubjectBadge` — never a hand-coloured badge. Text is a word in sentence case (the theme turns off Mantine's uppercase), not just a colour.

### 4.3 Cards

`Card withBorder radius="lg" padding="lg"` (theme default). A card has a `CardTitle` (h3) with optional right-side context (badge or subtle button). Cards are for grouping, not decoration: a page with one thing on it doesn't wrap it in a card — the content sits directly on the ground.

### 4.4 Stat tiles

`components/StatTile.tsx`: label (sm, dimmed) · value (display face, stat size, tabular) · hint (xs, dimmed). Optional colour accent only when the number itself is a status (e.g. "3 registers missing" in saffron). Admin dashboard only (§3.3).

`components/Figures.tsx`: the headline numbers of a page or card — label (sm, dimmed), figure (display face, h2 size, tabular), optional hint — in one row of two to four. Fee · Paid · Balance on a fees page; Present · Absent on an attendance summary. Colour only when the figure is a status (outstanding → saffron, in credit → tile). Figures live *inside* a card or under the header and are not tiles; they are how staff pages get a dashboard feel without a grid of cards.

### 4.5 Tables (staff only)

Staff tables are dense: the theme sets `striped`, `verticalSpacing="xs"`, `fz="sm"`, `highlightOnHover`. Header labels sentence case. First column is the entity (name, with the ID or code dimmed beneath), numeric columns right-aligned and tabular, actions in the last column right-aligned. Row-level state uses `StatusBadge` or a `SegmentedControl size="xs"` (as in the register). Filters and search sit in one row above the table, live in the URL and default to what the office asks most (students who are attending, fees still to pay). Columns worth sorting get a clickable header (`SortableTh`) with the current direction shown; totals go *above* the table as `Figures`, never in a footer. Sticky headers on long tables; pagination at 50 rows.

### 4.6 Lists (family & student)

`components/EntityList.tsx`: rounded rows on the ground colour inside a card (`bg` = ground, `radius="md"`, `p="sm"`), tappable, with a subject/status badge and a one-line title. No tables in the family or student areas.

### 4.7 Forms

Mantine form components with `@mantine/form`. Labels above fields, required marked with the Mantine asterisk, description *below the input* (set in the theme, so paired fields keep their inputs level), errors inline under the field. Field widths: `Group grow` for pairs, full width otherwise. Dates: `DateField` (a `DateInput` preset to `valueFormat="ddd D MMM YYYY"` that also parses typed "19 Sep 2026", "19/9/2026" and ISO). Money: `NumberInput` with `€` prefix, `decimalScale={2}`, backed by `lib/money.ts`. Selects use `allowDeselect={false}` when a value is required. Multi-step forms (registration wizard) use `Stepper` with a review step.

Sensitive fields (ethnicity, languages, reasons) are grouped under their own heading with the standard explanation copy (§7) and are always optional with "Prefer not to say".

### 4.8 Modals and confirmation

`Modal radius="lg"` with an h3 title; actions bottom-end, cancel (`default`) then primary. Destructive confirmations use `modals.openConfirmModal` with the consequence in the body ("This deletes the payment of €100 recorded on 3 Oct. This cannot be undone.") and a clay confirm button.

### 4.9 Feedback

- Success/error toasts: `@mantine/notifications` via `components/toast.ts` (`toast.success/error/warning`), top-end (Mantine only knows `top-right`; the RTL phase flips it), 4s, tile for success, clay for errors, saffron for warnings. Message states what happened: "Register submitted", "Payment recorded".
- Inline errors for form validation; toasts for server failures.
- Notices that stay on the page (an unverified email, a double-booked teacher): `Alert variant="light" color="saffron"` with a Tabler icon at 16, one sentence and, if there is something to do, one `light` button inside it. Never for success — that is a toast — and never more than one per page.
- Loading: `Skeleton` for page-level loads; `loading` on the button for actions. Never block the whole screen with an overlay.
- Empty states: `components/EmptyState.tsx` — Tabler icon in a light `ThemeIcon`, one sentence, one action. ("No homework due. Enjoy the weekend.")

### 4.10 Timeline and timetable

Lessons in a day render with Mantine `Timeline`, `bulletSize={26}`, past items in tile, current in saffron with a sun icon, future in gray. Weekly timetables render as a grid where each block's background is the subject tint (shade 0) and its border-inline-start is the subject colour (shade 6), 3px, so it works in both themes and in RTL.

`WeekTimetable` is that grid for a person's week: one column per day with lessons, each block showing time, class and room, linking to the class. Teachers get it as "My week"; the month calendar stays for term dates and events.

Month calendars (`MonthCalendar`) are a seven-column grid, Monday first: term days sit on the ground colour, lesson days on the tile tint with their label, events in plum, today ringed in saffron. On phones labels collapse to dots and stay in the day's `aria-label`.

### 4.11 Avatars

Initials on `tile.0`/`tile.8` for people; `gray` when the person is inactive or absent in the current context. Children in the family switcher get a distinct pastel from a fixed rotation so siblings are told apart at a glance.

---

## 5. Patterns by role

- **Admin:** dense, tables, filters at the top of lists, bulk actions in a bar that appears on selection. Sensitive information sits in a visually separate card titled "Sensitive information" with a lock icon.
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
- Standard sensitive-data explanation, used verbatim: *"Optional. Used only for anonymous diversity statistics. It has no effect on any admission or placement decision."*

---

## 8. Extending the design language

Before building anything not covered here:

1. **Check Mantine.** Prefer an existing component or variant over a custom one.
2. **Write the rule here first** — a new token, a new status mapping, a new shared component or pattern — in the section it belongs to. Keep it as short as the rules above.
3. **Implement it in the shared place:** tokens in `lib/theme.ts`, colour mappings in `lib/subjects.ts` / `StatusBadge`, components in `components/`.
4. **Use it from the page.** Pages compose shared components; they don't style.

A pull request that adds a hex value, a bare `style={{ fontSize }}`, a new colour meaning or a one-off component without touching this document is incomplete.

Shared component inventory (created as needed, listed here when they exist). Existing: `Shell` (app shell with the four navigation sets, role switcher, colour-scheme toggle in the header), `AuthPage`, `PageHeader` (with breadcrumbs), `CardTitle`, `StatTile` (links to its page), `Figures`, `SortableTh`, `StatusBadge`, `SubjectBadge`, `EmptyState`, `EntityList`, `ChildSwitcher`, `DirectionalIcon`, `MoneyText` (`lib/money.ts`), `DateText` (server-only; reads the school timezone), `SensitiveSection` (carries the standard sentence), `Field` (read-only label/value pair for profiles and review steps), `LinkTabs` (tabs that are routes), `ClassTimetable` (a class's day as a Timeline, §4.10), `WeekTimetable` (a week of lessons as tinted blocks), `LessonTimeline` (today's lessons with past/now/later states and inline actions), `ResourceForm`/`ShareResourceButton` (file or link with one target), `ResourceList` (files and links as rows), `NotesCard` (staff notes on a student with the add form), `HomeworkList` (homework rows for families and students), `MonthCalendar` + `CalendarPage` (`lib/calendar.ts` month builder), `NotificationList` + `NotificationsPage` (the bell's list), `FormError`, `LinkButton`, `AppLink` (both exist because Server Components can't pass `component={Link}` to Mantine), `toast`, `confirmDestructive`. In Server Components use Mantine's named parts (`TableThead`, `TableTr`…) rather than `Table.Thead`, which don't cross the boundary.
