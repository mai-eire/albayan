import { SimpleGrid, Stack } from "@mantine/core";
import { PageHeader } from "@/components/PageHeader";
import { StatTile } from "@/components/StatTile";
import { getCurrentYear } from "@/lib/db/queries/academics";
import { countPendingApplications } from "@/lib/db/queries/admin";
import { listRegistersForDate } from "@/lib/db/queries/attendance";
import { feesOutstanding } from "@/lib/db/queries/fees";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { formatEuros } from "@/lib/money";
import { dayOfWeekIn, formatDate, todayIn } from "@/lib/time";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboard() {
  const [pending, { timezone }, year] = await Promise.all([
    countPendingApplications(),
    getSchoolSettings(),
    getCurrentYear(),
  ]);
  const [registers, fees] = year
    ? await Promise.all([
        listRegistersForDate(year.id, todayIn(timezone), dayOfWeekIn(timezone)),
        feesOutstanding(year.id),
      ])
    : [[], { totalCents: 0, families: 0 }];
  const missing = registers.filter((r) => r.studentCount > 0 && r.recordedCount < r.studentCount);
  return (
    <Stack gap="lg" maw={960} mx="auto">
      <PageHeader eyebrow={formatDate(new Date(), timezone)} title="Dashboard" />
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <StatTile
          label="Registers missing"
          value={missing.length}
          hint={
            registers.length === 0
              ? "No classes today"
              : missing.length
                ? missing.map((r) => r.className).join(", ")
                : "All in"
          }
          color={missing.length ? "saffron" : undefined}
        />
        <StatTile
          label="Applications pending"
          value={pending}
          hint={pending ? "Waiting for review" : "Nothing to review"}
          color={pending ? "saffron" : undefined}
        />
        <StatTile
          label="Fees outstanding"
          value={formatEuros(fees.totalCents)}
          hint={
            fees.families
              ? `${fees.families} ${fees.families === 1 ? "family" : "families"} still to pay`
              : "Everyone has paid"
          }
          color={fees.families ? "saffron" : undefined}
        />
      </SimpleGrid>
    </Stack>
  );
}
