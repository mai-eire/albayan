import { SimpleGrid, Stack } from "@mantine/core";
import { PageHeader } from "@/components/PageHeader";
import { StatTile } from "@/components/StatTile";
import { countPendingApplications } from "@/lib/db/queries/admin";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { formatDate } from "@/lib/time";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboard() {
  const [pending, { timezone }] = await Promise.all([
    countPendingApplications(),
    getSchoolSettings(),
  ]);
  return (
    <Stack gap="lg" maw={960} mx="auto">
      <PageHeader eyebrow={formatDate(new Date(), timezone)} title="Dashboard" />
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <StatTile label="Registers missing" value={0} hint="No sessions today" />
        <StatTile
          label="Applications pending"
          value={pending}
          hint={pending ? "Waiting for review" : "Nothing to review"}
          color={pending ? "saffron" : undefined}
        />
        <StatTile label="Fees overdue" value={0} hint="All up to date" />
      </SimpleGrid>
    </Stack>
  );
}
