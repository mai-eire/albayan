import { Stack } from "@mantine/core";
import { IconBook } from "@tabler/icons-react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { requireArea } from "@/lib/access";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { formatDate, formatHijri } from "@/lib/time";

export const metadata = { title: "Home" };

export default async function StudentHome() {
  const [user, { timezone }] = await Promise.all([requireArea("student"), getSchoolSettings()]);
  const now = new Date();
  return (
    <Stack gap="lg" maw={960} mx="auto">
      <PageHeader
        eyebrow={`${formatDate(now, timezone)} · ${formatHijri(now, timezone)}`}
        title={`Hi, ${user.student?.firstName ?? user.name.split(" ")[0]}`}
      />
      <EmptyState
        icon={<IconBook size={20} stroke={1.75} />}
        message="Nothing due. Enjoy your day."
      />
    </Stack>
  );
}
