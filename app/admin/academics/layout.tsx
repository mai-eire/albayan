import { Stack } from "@mantine/core";

// Years & terms · Subjects · Sessions · Classes are sub-items in the sidebar; each page
// stands on its own with its own breadcrumbs.
export default function AcademicsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Stack gap="lg" maw={1180}>
      {children}
    </Stack>
  );
}
