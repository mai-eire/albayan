import { clock } from "@/lib/clock";
import { Stack } from "@mantine/core";
import { IconBuildingBank } from "@tabler/icons-react";
import { EmptyState } from "@/components/EmptyState";
import { ExportButton } from "@/components/ExportButton";
import { LinkButton } from "@/components/LinkButton";
import { PageHeader } from "@/components/PageHeader";
import { listClasses, listSessions, listYears } from "@/lib/db/queries/academics";
import { countFamilies, listFeeAccounts, listPaymentTargets } from "@/lib/db/queries/fees";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { outstandingCents } from "@/lib/fees";
import { formatEuros } from "@/lib/money";
import { todayIn } from "@/lib/time";
import { FeesList } from "./FeesList";
import { RecordPaymentButton } from "./RecordPaymentButton";

export const metadata = { title: "Fees" };

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function FeesPage({ searchParams }: Props) {
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
        <PageHeader title="Fees" />
        <EmptyState
          icon={<IconBuildingBank size={20} stroke={1.75} />}
          message="Fees follow the academic year. Set one up under Academics first."
          action={<LinkButton href="/admin/academics/years">Go to Academics</LinkButton>}
        />
      </Stack>
    );
  }
  const [accounts, targets, sessions, classes] = await Promise.all([
    listFeeAccounts(year.id),
    listPaymentTargets(year.id),
    listSessions(year.id),
    listClasses(year.id),
  ]);
  const owing = accounts.filter((a) => a.balanceCents > 0);
  const families = await countFamilies(owing);
  const today = todayIn(timezone, await clock());

  return (
    <Stack gap="lg" maw={1180}>
      <PageHeader
        title="Fees"
        eyebrow={
          accounts.length === 0
            ? `Nobody has a place in ${year.id} yet`
            : owing.length
              ? `${formatEuros(outstandingCents(owing))} still to come from ${families} ${families === 1 ? "family" : "families"} · ${year.id}`
              : `Everyone has paid for ${year.id}`
        }
        actions={
          <>
            {accounts.length > 0 && <ExportButton href={`/admin/fees/export?year=${year.id}`} />}
            <RecordPaymentButton targets={targets} today={today} />
          </>
        }
      />
      <FeesList
        accounts={accounts}
        years={years}
        year={year.id}
        sessions={sessions}
        classes={classes.map((c) => ({
          id: c.id,
          name: c.name,
          sessionId: c.sessionId,
          sessionName: c.sessionName,
        }))}
      />
    </Stack>
  );
}
