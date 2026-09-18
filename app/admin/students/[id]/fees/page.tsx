import {
  Card,
  Group,
  Stack,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
} from "@mantine/core";
import { AppLink } from "@/components/AppLink";
import { CardTitle } from "@/components/CardTitle";
import { MoneyText } from "@/components/MoneyText";
import tabular from "@/components/tabular.module.css";
import { Figures } from "@/components/Figures";
import { StatusBadge } from "@/components/StatusBadge";
import { feeAccountsForStudents, listFeesForStudent } from "@/lib/db/queries/fees";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { listSiblingsForAdmin } from "@/lib/db/queries/students";
import { formatEuros } from "@/lib/money";
import { todayIn } from "@/lib/time";
import { PaymentsTable } from "@/app/admin/fees/PaymentsTable";
import { RecordPaymentButton } from "@/app/admin/fees/RecordPaymentButton";
import { loadStudent } from "../load";

type Props = { params: Promise<{ id: string }> };

// One card per year the student has had a place: balance first, then the fee and what's
// been paid, then each payment. Under that, where the brothers and sisters stand this year,
// so a parent paying for one child can be asked about the others.
export default async function StudentFeesPage({ params }: Props) {
  const [student, { timezone }] = await Promise.all([loadStudent(params), getSchoolSettings()]);
  const [years, siblings] = await Promise.all([
    listFeesForStudent(student.id),
    listSiblingsForAdmin(student.id),
  ]);
  const today = todayIn(timezone);
  const thisYear = student.enrolment?.academicYearId;
  const siblingAccounts = thisYear
    ? await feeAccountsForStudents(
        thisYear,
        siblings.map((s) => s.id),
      )
    : new Map();
  const family = siblings.flatMap((s) => {
    const a = siblingAccounts.get(s.id);
    return a ? [{ ...s, account: a }] : [];
  });
  if (years.length === 0) {
    return (
      <Card>
        <CardTitle>Fees</CardTitle>
        <Text size="sm" c="dimmed">
          There is no fee until {student.firstName} has a place.
        </Text>
      </Card>
    );
  }
  return (
    <Stack gap="lg">
      {years.map((year) => {
        const current = student.enrolment?.id === year.enrolment.id;
        const target = current && {
          enrolmentId: year.enrolment.id,
          studentId: student.id,
          label: `${student.firstName} ${student.lastName}`,
          studentCode: student.studentId,
          feeCents: year.feeCents,
          paidCents: year.paidCents,
          guardians: student.guardians.map((g) => ({ id: g.id, name: g.name })),
        };
        const credit = year.balanceCents < 0;
        return (
          <Card key={year.enrolment.academicYearId}>
            <CardTitle
              context={
                <Group gap="sm">
                  <StatusBadge domain="fee" value={year.status} />
                  {target && <RecordPaymentButton targets={[target]} today={today} />}
                </Group>
              }
            >
              Fee for {year.enrolment.academicYearId}
            </CardTitle>
            <Figures
              items={[
                {
                  label: credit ? "In credit" : "Outstanding",
                  value: formatEuros(Math.abs(year.balanceCents)),
                  color: credit ? "tile" : year.balanceCents > 0 ? "saffron" : undefined,
                  hint: credit ? "Paid more than the fee" : undefined,
                },
                {
                  label: "Fee",
                  value: formatEuros(year.feeCents),
                  hint: year.enrolment.feeNote ?? undefined,
                },
                { label: "Paid", value: formatEuros(year.paidCents) },
              ]}
            />
            {year.payments.length > 0 && (
              <Stack gap="xs" mt="lg">
                <Text size="sm" fw={500}>
                  Payments
                </Text>
                <PaymentsTable
                  payments={year.payments}
                  target={target || undefined}
                  today={today}
                  timezone={timezone}
                />
              </Stack>
            )}
          </Card>
        );
      })}
      {family.length > 0 && (
        <Card>
          <CardTitle
            context={
              <Text size="sm" c="dimmed">
                {thisYear}
              </Text>
            }
          >
            Also in this family
          </CardTitle>
          <Table>
            <TableThead>
              <TableTr>
                <TableTh>Child</TableTh>
                <TableTh ta="end">Fee</TableTh>
                <TableTh ta="end">Paid</TableTh>
                <TableTh ta="end">Balance</TableTh>
                <TableTh>Status</TableTh>
              </TableTr>
            </TableThead>
            <TableTbody>
              {family.map((s) => (
                <TableTr key={s.id}>
                  <TableTd>
                    <AppLink href={`/admin/students/${s.id}/fees`} fw={500}>
                      {s.firstName} {s.lastName}
                    </AppLink>
                    <Text size="xs" c="dimmed">
                      {[s.className, s.sessionName].filter(Boolean).join(" · ")}
                    </Text>
                  </TableTd>
                  <TableTd ta="end" className={tabular.tabular}>
                    <MoneyText cents={s.account.feeCents} />
                  </TableTd>
                  <TableTd ta="end" className={tabular.tabular}>
                    <MoneyText cents={s.account.paidCents} />
                  </TableTd>
                  <TableTd ta="end" className={tabular.tabular}>
                    <MoneyText cents={Math.max(0, s.account.balanceCents)} />
                  </TableTd>
                  <TableTd>
                    <StatusBadge domain="fee" value={s.account.status} />
                  </TableTd>
                </TableTr>
              ))}
            </TableTbody>
          </Table>
        </Card>
      )}
    </Stack>
  );
}
