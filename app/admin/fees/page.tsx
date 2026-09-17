import { Card, Stack } from "@mantine/core";
import { IconBuildingBank, IconDownload } from "@tabler/icons-react";
import { EmptyState } from "@/components/EmptyState";
import { LinkButton } from "@/components/LinkButton";
import { Figures } from "@/components/Figures";
import { PageHeader } from "@/components/PageHeader";
import { listClasses, listSessions, listYears } from "@/lib/db/queries/academics";
import { listFeeAccounts, listPaymentTargets } from "@/lib/db/queries/fees";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { outstandingCents } from "@/lib/fees";
import { formatEuros } from "@/lib/money";
import { todayIn } from "@/lib/time";
import { FeesFilters } from "./FeesFilters";
import { FeesTable } from "./FeesTable";
import { applyFeeFilters, parseFeeFilters } from "./filters";
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
  const filters = parseFeeFilters(params);
  const rows = applyFeeFilters(accounts, filters);
  const owing = accounts.filter((a) => a.balanceCents > 0);
  const families = new Set(owing.map((a) => a.enrolment.guardianId ?? `s${a.enrolment.studentId}`));
  const totals = {
    fee: rows.reduce((s, a) => s + a.feeCents, 0),
    paid: rows.reduce((s, a) => s + a.paidCents, 0),
    balance: outstandingCents(rows),
  };
  const query = new URLSearchParams(
    Object.entries({ ...params, year: year.id }).filter((e): e is [string, string] =>
      Boolean(e[1]),
    ),
  );

  return (
    <Stack gap="lg" maw={1180}>
      <PageHeader
        title="Fees"
        eyebrow={
          accounts.length === 0
            ? `Nobody has a place in ${year.id} yet`
            : owing.length
              ? `${formatEuros(outstandingCents(owing))} still to come from ${families.size} ${families.size === 1 ? "family" : "families"} · ${year.id}`
              : `Everyone has paid for ${year.id}`
        }
        actions={
          <>
            {rows.length > 0 && (
              <LinkButton
                variant="light"
                href={`/admin/fees/export?${query}`}
                leftSection={<IconDownload size={16} stroke={1.75} />}
              >
                Export CSV
              </LinkButton>
            )}
            <RecordPaymentButton targets={targets} today={todayIn(timezone)} />
          </>
        }
      />
      <FeesFilters
        years={years}
        year={year.id}
        sessions={sessions}
        classes={classes.map((c) => ({ id: c.id, name: c.name, sessionId: c.sessionId }))}
      />
      {rows.length === 0 ? (
        <EmptyState
          icon={<IconBuildingBank size={20} stroke={1.75} />}
          message={
            accounts.length === 0
              ? "Approving an application gives a child a place and a fee."
              : filters.show === "outstanding"
                ? "Everyone here has paid."
                : "Nobody matches these filters."
          }
        />
      ) : (
        <>
          <Card>
            <Figures
              items={[
                {
                  label: "Students",
                  value: rows.length,
                  hint: filters.show === "outstanding" ? "still to pay" : "with a place",
                },
                { label: "Fees", value: formatEuros(totals.fee) },
                { label: "Paid", value: formatEuros(totals.paid) },
                {
                  label: "Outstanding",
                  value: formatEuros(totals.balance),
                  color: totals.balance ? "saffron" : undefined,
                },
              ]}
            />
          </Card>
          <FeesTable rows={rows} />
        </>
      )}
    </Stack>
  );
}
