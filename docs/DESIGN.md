# Al-Bayan Design Language

The single source of truth for how the application looks, feels and speaks. Every screen and component follows it; when it lacks something, **extend this document first**, then implement. Implementation lives in `lib/theme.ts` (Mantine theme) and `components/` (shared components). Nothing visual is decided ad hoc inside a page.

Audience: anyone building UI here (people and AI). Keep it concrete; when a rule needs an example, the example is the rule.

---

## 1. Principles

1. **Calm, warm, clear.** A community school, not a corporate dashboard and not a children's game. Colour and roundness give warmth; whitespace and hierarchy give calm.
2. **One thing to do.** Every page has one obvious primary action. Parents and students should never wonder where to click.
3. **State is visible.** Attendance, fees, homework due — encode state in colour *and* words, in the same place every time.
4. **Same object, same shape.** A student, a lesson, a subject, a fee looks the same wherever it appears.
5. **Phone first for families and students, desktop first for staff.** Both work everywhere, but each role's primary device drives its layout.
6. **Nothing decorative that isn't informative.** No gradients, no illustration for its own sake, no animation without purpose.

---

## 2. Tokens

All tokens are defined in `lib/theme.ts` and referenced by name. **Raw hex values, pixel font sizes and one-off spacing never appear in a component.**

### 2.1 Colour

Ten-shade Mantine tuples; shade 6 is the "filled" shade, 0–1 are tints for light variants and backgrounds.

| Token | Shade 6 | Role | Use for | Never for |
|---|---|---|---|---|
| `tile` (primary) | `#146c60` | Brand / primary action / positive | Primary buttons, active nav, links, "present", "paid", success | Subject colour of anything but Arabic |
| `saffron` | `#d99a2b` | Attention | "Now" marker, "late", "part-paid", unread dots, warnings | Large filled areas, body text |
| `clay` | `#c44536` | Critical | "absent", "overdue", destructive actions, errors, allergy flags | Anything not a problem |
| `lapis` | `#2b4fb4` | Subject: Quran | Quran badges, timetable blocks, homework tags | Semantic meaning |
| `plum` | `#7b4b94` | Subject: Islamic Studies | As above | Semantic meaning |
| `gray` (Mantine) | — | Neutral | Borders, dimmed text, disabled, "excused", break periods | — |

Fixed neutrals (light theme): ink `#14282c` (text, `theme.black`), ground `#f4f8f6` (page), surface `#ffffff` (cards, header, sidebar), line = `gray.3`. Dark theme uses Mantine's `dark` tuple; components must reference `var(--mantine-color-body)`, `var(--mantine-color-default-border)` etc., never the light hex.

Subject colours are assigned once, in `lib/subjects.ts` (`subjectColor(subjectId)`), with a fallback rotation for subjects added later. A subject's colour is the same on every screen.

Status colours are assigned once, in `components/StatusBadge.tsx`:

| Domain | Value → colour |
|---|---|
| Attendance | present → tile · late → saffron · absent → clay · excused → gray |
| Fee balance | paid → tile · part-paid → saffron · unpaid/overdue → clay · waived → gray |
| Application | applied → saffron · active → tile · declined → clay · inactive → gray |
| Homework | due later → gray · due today/tomorrow → saffron · overdue → clay |

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
| stat | 2.25rem / 800, display face | Big numbers in stat tiles |
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
[eyebrow: date / breadcrumb / context, sm dimmed]
[h1 title]                                    [primary action] [secondary action]
```
One primary (`filled`) action per page, at most two secondary (`light`). Anything else goes in a `Menu` "More" button.

Content column `maw={1180} mx="auto"`. Two-column layouts are `2fr 1fr` on `md+` (`SimpleGrid cols={{ base: 1, md: 3 }}` with the main column spanning 2) and stack on smaller screens. Stat tiles: 3 across on `sm+`, 1 on phones. Never more than 4 stat tiles.

### 3.3 Density

Staff screens (admin, teacher) may use tables and `size="sm"` controls. Family and student screens use lists and cards, `size="md"` controls, and 44px minimum touch targets on primary actions.

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

Buttons say what happens: "Publish homework", "Submit register", "Record payment" — never "OK", "Submit", "Yes". Loading state via `loading` prop, never a separate spinner. Icons in buttons are `leftSection`, size 16.

### 4.2 Badges and status

`Badge` `variant="light"` for status and tags, `variant="filled"` only for the "Now" marker and subject chips on dark backgrounds, `variant="outline"` for neutral context ("Saturday session"). Always via `StatusBadge` or `SubjectBadge` — never a hand-coloured badge. Text is a word, not just a colour.

### 4.3 Cards

`Card withBorder radius="lg" padding="lg"` (theme default). A card has a `CardTitle` (h3) with optional right-side context (badge or subtle button). Cards are for grouping, not decoration: a page with one thing on it doesn't wrap it in a card.

### 4.4 Stat tiles

`components/StatTile.tsx`: label (sm, dimmed) · value (display face, stat size, tabular) · hint (xs, dimmed). Optional colour accent only when the number itself is a status (e.g. "3 registers missing" in saffron).

### 4.5 Tables (staff only)

`Table verticalSpacing="sm" highlightOnHover`, header labels sentence case. First column is the entity (avatar + name), numeric columns right-aligned and tabular, actions in the last column right-aligned. Row-level state uses `StatusBadge` or a `SegmentedControl size="xs"` (as in the register). Long tables get sticky headers and a search input above; pagination at 50 rows.

### 4.6 Lists (family & student)

`components/EntityList.tsx`: rounded rows on the ground colour inside a card (`bg` = ground, `radius="md"`, `p="sm"`), tappable, with a subject/status badge and a one-line title. No tables in the family or student areas.

### 4.7 Forms

Mantine form components with `@mantine/form`. Labels above fields, required marked with the Mantine asterisk, description below the label, errors inline under the field. Field widths: `Group grow` for pairs, full width otherwise. Dates: `DateInput valueFormat="ddd D MMM YYYY"`. Money: `NumberInput` with `€` prefix, `decimalScale={2}`, backed by `lib/money.ts`. Selects use `allowDeselect={false}` when a value is required. Multi-step forms (registration wizard) use `Stepper` with a review step.

Sensitive fields (ethnicity, languages, reasons) are grouped under their own heading with the standard explanation copy (§7) and are always optional with "Prefer not to say".

### 4.8 Modals and confirmation

`Modal radius="lg"` with an h3 title; actions bottom-end, cancel (`default`) then primary. Destructive confirmations use `modals.openConfirmModal` with the consequence in the body ("This deletes the payment of €100 recorded on 3 Oct. This cannot be undone.") and a clay confirm button.

### 4.9 Feedback

- Success/error toasts: `@mantine/notifications`, top-end, 4s, tile for success, clay for errors, saffron for warnings. Message states what happened: "Register submitted", "Payment recorded".
- Inline errors for form validation; toasts for server failures.
- Loading: `Skeleton` for page-level loads; `loading` on the button for actions. Never block the whole screen with an overlay.
- Empty states: `components/EmptyState.tsx` — Tabler icon in a light `ThemeIcon`, one sentence, one action. ("No homework due. Enjoy the weekend.")

### 4.10 Timeline and timetable

Lessons in a day render with Mantine `Timeline`, `bulletSize={26}`, past items in tile, current in saffron with a sun icon, future in gray. Weekly timetables render as a grid where each block's background is the subject tint (shade 0) and its border-inline-start is the subject colour (shade 6), 3px, so it works in both themes and in RTL.

### 4.11 Avatars

Initials on `tile.0`/`tile.8` for people; `gray` when the person is inactive or absent in the current context. Children in the family switcher get a distinct pastel from a fixed rotation so siblings are told apart at a glance.

---

## 5. Patterns by role

- **Admin:** dense, tables, filters at the top of lists, bulk actions in a bar that appears on selection. Sensitive information sits in a visually separate card titled "Sensitive information" with a lock icon.
- **Teacher:** the *Today* page is the home; four quick-action tiles (register, homework, note, resource) appear on Today and on every class page in the same order with the same colours (tile, lapis, plum, saffron).
- **Family:** `ChildSwitcher` pills under the header on every page, hidden with one child; each child's overview is a grid of small cards that each link to one tab. Never show internal vocabulary (enrolment, session id).
- **Student:** at most five navigation items, one column, big type, `size="md"` or `lg` controls, greetings by first name, due dates in relative words ("tomorrow", "in 3 days").

---

## 6. Accessibility and adaptability

- WCAG AA contrast for text on every token pairing used; light-variant badges use shade 8 text on shade 0 background.
- Visible focus ring (Mantine default), keyboard-operable everything, `aria-label` on icon-only buttons.
- Colour never carries meaning alone; a word or icon accompanies it.
- Dark theme: every component reads colours from theme tokens or Mantine CSS variables; test both themes on any new component. Colour scheme follows the OS by default with a toggle in account settings.
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

Shared component inventory (created as needed, listed here when they exist): `PageHeader`, `StatTile`, `StatusBadge`, `SubjectBadge`, `EntityList`, `EmptyState`, `ChildSwitcher`, `DirectionalIcon`, `MoneyText`, `DateText`, `SensitiveSection`, `QuickActions`.
