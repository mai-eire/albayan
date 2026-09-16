import { Stack } from "@mantine/core";
import { IconSun } from "@tabler/icons-react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { requireArea } from "@/lib/access";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { formatDate, formatHijri } from "@/lib/time";

export const metadata = { title: "Today" };

export default async function TeachToday() {
  const [user, { timezone }] = await Promise.all([requireArea("teach"), getSchoolSettings()]);
  const now = new Date();
  return (
    <Stack gap="lg" maw={960} mx="auto">
      <PageHeader
        eyebrow={`${formatDate(now, timezone)} · ${formatHijri(now, timezone)}`}
        title={`Good morning, ${user.name.split(" ")[0]}`}
      />
      <EmptyState icon={<IconSun size={20} stroke={1.75} />} message="No lessons today." />
    </Stack>
  );
}
