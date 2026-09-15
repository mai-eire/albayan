import { SimpleGrid, Stack } from "@mantine/core";
import { PageHeader } from "@/components/PageHeader";
import { StatTile } from "@/components/StatTile";
import { countPendingApplications } from "@/lib/db/queries/admin";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboard() {
  const pending = await countPendingApplications();
  return (
    <Stack gap="lg" maw={960} mx="auto">
      <PageHeader eyebrow="Tuesday 16 September" title="Dashboard" />
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
