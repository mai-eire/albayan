# UI library prototypes

Throwaway spikes to choose the component library. Each folder implements the **same screen** — the teacher's Today page — with the same palette and fonts, in that library's own idiom.

| Folder | Library |
|---|---|
| `ui-mantine/` | Mantine 8 (`@mantine/core`, `@mantine/dates`) |
| `ui-mui/` | Material UI 6 (`@mui/material`, `@mui/x-date-pickers`, `@mui/lab`) |
| `ui-shadcn/` | Tailwind 4 + shadcn/ui components (copied into `src/components/ui`) |

Run any of them: `cd prototypes/ui-<name> && npm install && npm run dev`.

Read `src/App.tsx` in each for the comparison; `src/data.ts` is identical across the three.

Delete this folder once the decision is recorded in `docs/PLAN.md`.
