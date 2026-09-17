import { Card, Group, Stack, Text } from "@mantine/core";
import { CardTitle } from "@/components/CardTitle";
import { Figures } from "@/components/Figures";
import { StatusBadge } from "@/components/StatusBadge";
import { listFeesForStudent } from "@/lib/db/queries/fees";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { formatEuros } from "@/lib/money";
import { todayIn } from "@/lib/time";
import { PaymentsTable } from "@/app/admin/fees/PaymentsTable";
import { RecordPaymentButton } from "@/app/admin/fees/RecordPaymentButton";
import { loadStudent } from "../load";

type Props = { params: Promise<{ id: string }> };

// One card per year the student has had a place: balance first, then the fee and what's
// been paid, then each payment.
export default async function StudentFeesPage({ params }: Props) {
  const [student, { timezone }] = await Promise.all([loadStudent(params), getSchoolSettings()]);
  const years = await listFeesForStudent(student.id);
  const today = todayIn(timezone);
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
    </Stack>
  );
}
