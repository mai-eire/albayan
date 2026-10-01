import {
  Card,
  Stack,
  Table,
  TableScrollContainer,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
} from "@mantine/core";
import { IconBuildingBank } from "@tabler/icons-react";
import { AppLink } from "@/components/AppLink";
import { CardTitle } from "@/components/CardTitle";
import { EmptyState } from "@/components/EmptyState";
import { Figures } from "@/components/Figures";
import { MoneyText } from "@/components/MoneyText";
import { PageHeader } from "@/components/PageHeader";
import { PaymentHistory } from "@/components/PaymentHistory";
import { StatusBadge } from "@/components/StatusBadge";
import { requireArea } from "@/lib/access";
import { feesForGuardian } from "@/lib/db/queries/family";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { listChildrenForGuardian } from "@/lib/db/queries/students";
import { formatEuros } from "@/lib/money";

export const metadata = { title: "Fees" };

// Where the family stands this year and every payment the office has recorded. Paying is
// arranged with the office, so there is nothing to do here but check the figures.
export default async function FamilyFeesPage() {
  const [user, { timezone, bankAccountName, bankIban, bankBic }] = await Promise.all([
    requireArea("family"),
    getSchoolSettings(),
  ]);
  const kids = user.guardian ? await listChildrenForGuardian(user.guardian.id) : [];
  const { year, children, payments } = user.guardian
    ? await feesForGuardian(
        user.guardian.id,
        kids.map((k) => k.id),
      )
    : { year: null, children: [], payments: [] };
  const owed = children.reduce((s, a) => s + Math.max(0, a.balanceCents), 0);
  const fee = children.reduce((s, a) => s + a.feeCents, 0);
  const paid = children.reduce((s, a) => s + a.paidCents, 0);
  return (
    <Stack gap="lg" maw={860} mx="auto">
      <PageHeader title="Fees" eyebrow={year ?? undefined} />
      {children.length === 0 ? (
        <EmptyState
          icon={<IconBuildingBank size={20} stroke={1.75} />}
          message="There is nothing to pay until one of your children has a place."
        />
      ) : (
        <Card>
          <CardTitle>Fees for {year}</CardTitle>
          <Figures
            items={[
              {
                label: "Still to pay",
                value: formatEuros(owed),
                color: owed ? "saffron" : undefined,
                hint: owed ? undefined : "Paid in full",
              },
              { label: "Fees", value: formatEuros(fee) },
              { label: "Paid", value: formatEuros(paid) },
            ]}
          />
          <TableScrollContainer minWidth={0} type="native">
            <Table mt="lg">
              <TableThead>
                <TableTr>
                  <TableTh>Child</TableTh>
                  <TableTh>Class</TableTh>
                  <TableTh ta="end">Fee</TableTh>
                  <TableTh ta="end">Paid</TableTh>
                  <TableTh ta="end">Still to pay</TableTh>
                  <TableTh>Status</TableTh>
                </TableTr>
              </TableThead>
              <TableTbody>
                {children.map(({ enrolment: e, ...a }) => (
                  <TableTr key={e.studentId}>
                    <TableTd>
                      <AppLink href={`/family/${e.studentId}/fees`} fw={500}>
                        {e.firstName}
                      </AppLink>
                    </TableTd>
                    <TableTd>
                      {e.className} · {e.sessionName}
                    </TableTd>
                    <TableTd ta="end">
                      <MoneyText cents={a.feeCents} />
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
            </Table>
          </TableScrollContainer>
        </Card>
      )}
      <Card>
        <CardTitle>Payments</CardTitle>
        {payments.length === 0 ? (
          <Text c="dimmed">Nothing recorded yet.</Text>
        ) : (
          <PaymentHistory payments={payments} showChild={kids.length > 1} timezone={timezone} />
        )}
      </Card>
      {bankIban && (
        <Text size="sm" c="dimmed">
          To pay by transfer: {bankAccountName} · {bankIban}
          {bankBic ? ` · ${bankBic}` : ""}. Anything else, ask the office — payments are recorded
          here once they have them.
        </Text>
      )}
    </Stack>
  );
}
