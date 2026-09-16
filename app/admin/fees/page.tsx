import {
  Stack,
  Table,
  TableTbody,
  TableTd,
  TableTfoot,
  TableTh,
  TableThead,
  TableTr,
  Text,
} from "@mantine/core";
import { IconBuildingBank, IconDownload } from "@tabler/icons-react";
import { AppLink } from "@/components/AppLink";
import { EmptyState } from "@/components/EmptyState";
import { LinkButton } from "@/components/LinkButton";
import { MoneyText } from "@/components/MoneyText";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { listClasses, listSessions, listYears } from "@/lib/db/queries/academics";
import { listFeeAccounts, listPaymentTargets } from "@/lib/db/queries/fees";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { outstandingCents } from "@/lib/fees";
import { formatEuros } from "@/lib/money";
import { todayIn } from "@/lib/time";
import { FeesFilters } from "./FeesFilters";
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
        <Table>
          <TableThead>
            <TableTr>
              <TableTh>Student</TableTh>
              <TableTh>Class</TableTh>
              <TableTh>Guardian</TableTh>
              <TableTh ta="end">Fee</TableTh>
              <TableTh ta="end">Paid</TableTh>
              <TableTh ta="end">Balance</TableTh>
              <TableTh>Status</TableTh>
            </TableTr>
          </TableThead>
          <TableTbody>
            {rows.map(({ enrolment: e, ...a }) => (
              <TableTr key={e.studentId}>
                <TableTd>
                  <AppLink href={`/admin/students/${e.studentId}/fees`} fw={500}>
                    {e.firstName} {e.lastName}
                  </AppLink>
                  <Text size="sm" c="dimmed">
                    {e.studentCode}
                  </Text>
                </TableTd>
                <TableTd>
                  {e.className} · {e.sessionName}
                </TableTd>
                <TableTd>
                  {e.guardianId ? (
                    <AppLink href={`/admin/guardians/${e.guardianId}/payments`}>
                      {e.guardianName}
                    </AppLink>
                  ) : (
                    <Text component="span" c="dimmed">
                      —
                    </Text>
                  )}
                </TableTd>
                <TableTd ta="end">
                  <MoneyText cents={a.feeCents} />
                  {e.feeNote && (
                    <Text size="xs" c="dimmed">
                      {e.feeNote}
                    </Text>
                  )}
                </TableTd>
                <TableTd ta="end">
                  <MoneyText cents={a.paidCents} />
                </TableTd>
                <TableTd ta="end">
                  <MoneyText cents={a.balanceCents} fw={500} />
                </TableTd>
                <TableTd>
                  <StatusBadge domain="fee" value={a.status} />
                </TableTd>
              </TableTr>
            ))}
          </TableTbody>
          <TableTfoot>
            <TableTr>
              <TableTh>
                {rows.length} {rows.length === 1 ? "student" : "students"}
              </TableTh>
              <TableTh />
              <TableTh />
              <TableTh ta="end">
                <MoneyText cents={totals.fee} />
              </TableTh>
              <TableTh ta="end">
                <MoneyText cents={totals.paid} />
              </TableTh>
              <TableTh ta="end">
                <MoneyText cents={totals.balance} />
              </TableTh>
              <TableTh />
            </TableTr>
          </TableTfoot>
        </Table>
      )}
    </Stack>
  );
}
