import { Stack } from "@mantine/core";
import { IconSun } from "@tabler/icons-react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";

export const metadata = { title: "Today" };

export default function TeachToday() {
  return (
    <Stack gap="lg" maw={960} mx="auto">
      <PageHeader eyebrow="Tuesday 16 September" title="Good morning, Maryam" />
      <EmptyState icon={<IconSun size={20} stroke={1.75} />} message="No lessons today." />
    </Stack>
  );
}
