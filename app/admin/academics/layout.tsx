import { Stack } from "@mantine/core";
import { AcademicsTabs } from "./AcademicsTabs";

// Years & terms · Subjects · Sessions · Classes — set up once a year, top to bottom.
export default function AcademicsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Stack gap="lg" maw={1180} mx="auto">
      <AcademicsTabs />
      {children}
    </Stack>
  );
}
