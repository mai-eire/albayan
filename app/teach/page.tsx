import { Stack } from "@mantine/core";
import { IconSun } from "@tabler/icons-react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { requireArea } from "@/lib/access";

export const metadata = { title: "Today" };

export default async function TeachToday() {
  const user = await requireArea("teach");
  return (
    <Stack gap="lg" maw={960} mx="auto">
      <PageHeader
        eyebrow="Tuesday 16 September"
        title={`Good morning, ${user.name.split(" ")[0]}`}
      />
      <EmptyState icon={<IconSun size={20} stroke={1.75} />} message="No lessons today." />
    </Stack>
  );
}
