import { clock } from "@/lib/clock";
import { Card, SimpleGrid, Stack, Text } from "@mantine/core";
import { AppLink } from "@/components/AppLink";
import { CardTitle } from "@/components/CardTitle";
import { CountChart } from "@/components/CountChart";
import { PageHeader } from "@/components/PageHeader";
import { StatTile } from "@/components/StatTile";
import { currentPeriod, getCurrentYear } from "@/lib/db/queries/academics";
import { countPendingApplications } from "@/lib/db/queries/admin";
import { listRegistersForTerm } from "@/lib/db/queries/attendance";
import { feesOutstanding } from "@/lib/db/queries/fees";
import { reportData } from "@/lib/db/queries/reports";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { formatEuros } from "@/lib/money";
import { headlineReports, reports } from "@/lib/reports";
import { formatDate, todayIn } from "@/lib/time";

export const metadata = { title: "Dashboard" };

// Monday of the week containing `date`.
function weekStart(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

export default async function AdminDashboard() {
  const [pending, { timezone }, year] = await Promise.all([
    countPendingApplications(),
    getSchoolSettings(),
    getCurrentYear(),
  ]);
  const now = await clock();
  const today = todayIn(timezone, now);
  const period = year ? await currentPeriod(today) : null;
  const [registers, fees, demographics] = year
    ? await Promise.all([
        period
          ? listRegistersForTerm(year.id, period.from, period.to < today ? period.to : today)
          : [],
        feesOutstanding(year.id),
        reportData(year.id),
      ])
    : [[], { totalCents: 0, feesCents: 0, families: 0 }, { children: [], sessions: [] }];
  // Every register due so far this term that isn't complete, and how many of those are recent.
  const missing = registers.filter((r) => r.studentCount > 0 && r.recordedCount < r.studentCount);
  const thisWeek = missing.filter((r) => r.date >= weekStart(today)).length;
  // Two of the eight reports, as they are on the reports page; the rest are a click away.
  const headlines = reports(demographics, today).filter((r) => headlineReports.includes(r.id));
  return (
    <Stack gap="lg" maw={960} mx="auto">
      <PageHeader eyebrow={formatDate(now, timezone)} title="Dashboard" />
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <StatTile
          label="Registers missing"
          value={missing.length}
          hint={
            !period
              ? "No term running"
              : registers.length === 0
                ? "No lessons yet this term"
                : missing.length
                  ? `${thisWeek} this week · ${period.label} so far`
                  : `All in · ${period.label} so far`
          }
          color={missing.length ? "saffron" : undefined}
          href={missing.length ? "/admin/attendance?register=missing" : "/admin/attendance"}
        />
        <StatTile
          label="Applications pending"
          value={pending}
          hint={pending ? "Waiting for review" : "Nothing to review"}
          color={pending ? "saffron" : undefined}
          href="/admin/applications"
        />
        <StatTile
          label="Fees outstanding"
          value={formatEuros(fees.totalCents)}
          outOf={formatEuros(fees.feesCents)}
          hint={
            fees.families
              ? `${fees.families} ${fees.families === 1 ? "family" : "families"} still to pay`
              : "Everyone has paid"
          }
          color={fees.families ? "saffron" : undefined}
          href="/admin/fees"
        />
      </SimpleGrid>
      {demographics.children.length > 0 && (
        <Card>
          <CardTitle context={<AppLink href="/admin/reports">All reports</AppLink>}>
            The school this year
          </CardTitle>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
            {headlines.map((chart) => (
              <div key={chart.id}>
                <Text size="sm" c="dimmed" mb="xs">
                  {chart.title}
                </Text>
                <CountChart data={chart.data} shape={chart.shape} />
              </div>
            ))}
          </SimpleGrid>
        </Card>
      )}
    </Stack>
  );
}
