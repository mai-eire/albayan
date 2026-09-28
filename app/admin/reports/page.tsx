import { Card, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconChartBar } from "@tabler/icons-react";
import { CardTitle } from "@/components/CardTitle";
import { CountChart } from "@/components/CountChart";
import { EmptyState } from "@/components/EmptyState";
import { ExportButton } from "@/components/ExportButton";
import { LinkButton } from "@/components/LinkButton";
import { PageHeader } from "@/components/PageHeader";
import { clock } from "@/lib/clock";
import { listYears } from "@/lib/db/queries/academics";
import { reportData } from "@/lib/db/queries/reports";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { reports } from "@/lib/reports";
import { todayIn } from "@/lib/time";
import { YearPicker } from "../academics/YearPicker";

export const metadata = { title: "Reports" };

type Props = { searchParams: Promise<Record<string, string | undefined>> };

// The school's own picture of itself: counts of the children who have a place this year,
// nothing per child. The figures the school is asked for by funders and the mosque.
export default async function ReportsPage({ searchParams }: Props) {
  const [params, years, { timezone }] = await Promise.all([
    searchParams,
    listYears(),
    getSchoolSettings(),
  ]);
  const year =
    years.find((y) => y.id === params.year) ?? years.find((y) => y.isCurrent) ?? years[0];
  if (!year) {
    return (
      <Stack gap="lg" maw={1180}>
        <PageHeader title="Reports" />
        <EmptyState
          icon={<IconChartBar size={20} stroke={1.75} />}
          message="Reports count the children in a year. Set up an academic year under Academics first."
          action={<LinkButton href="/admin/academics/years">Go to Academics</LinkButton>}
        />
      </Stack>
    );
  }
  const data = await reportData(year.id);
  const today = todayIn(timezone, await clock());
  const charts = reports(data, today);
  const children = data.children.length;
  return (
    <Stack gap="lg" maw={1180}>
      <PageHeader
        title="Reports"
        eyebrow={
          children
            ? `${children} ${children === 1 ? "child" : "children"} with a place in ${year.id}`
            : `Nobody has a place in ${year.id} yet`
        }
        subtitle="Counts only — no child can be picked out of these figures."
        actions={
          <>
            <YearPicker years={years} value={year.id} />
            {children > 0 && <ExportButton href={`/admin/reports/export?year=${year.id}`} />}
          </>
        }
      />
      {children === 0 ? (
        <EmptyState
          icon={<IconChartBar size={20} stroke={1.75} />}
          message="Once children have places for the year, their ages, languages and where they come from are counted here."
        />
      ) : (
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          {charts.map((chart) => (
            <Card key={chart.id}>
              <CardTitle>{chart.title}</CardTitle>
              {chart.hint && (
                <Text size="sm" c="dimmed" mt={-8} mb="md">
                  {chart.hint}
                </Text>
              )}
              <CountChart data={chart.data} shape={chart.shape} />
            </Card>
          ))}
        </SimpleGrid>
      )}
    </Stack>
  );
}
