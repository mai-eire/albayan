import { Card, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import { CardTitle } from "@/components/CardTitle";
import { Field } from "@/components/Field";
import { MoneyText } from "@/components/MoneyText";
import { StatusBadge } from "@/components/StatusBadge";
import { listFeesForStudent } from "@/lib/db/queries/fees";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { todayIn } from "@/lib/time";
import { PaymentsTable } from "@/app/admin/fees/PaymentsTable";
import { RecordPaymentButton } from "@/app/admin/fees/RecordPaymentButton";
import { loadStudent } from "../load";

type Props = { params: Promise<{ id: string }> };

// One card per year the student has had a place: the fee, what's been paid, and each payment.
export default async function StudentFeesPage({ params }: Props) {
  const [student, { timezone }] = await Promise.all([loadStudent(params), getSchoolSettings()]);
  const years = await listFeesForStudent(student.id);
  const today = todayIn(timezone);
  const target = student.enrolment && {
    enrolmentId: student.enrolment.id,
    studentId: student.id,
    label: `${student.firstName} ${student.lastName}`,
    guardians: student.guardians.map((g) => ({ id: g.id, name: g.name })),
  };
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
        const current = target && target.enrolmentId === year.enrolment.id;
        return (
          <Card key={year.enrolment.academicYearId}>
            <CardTitle
              context={
                <Group gap="sm">
                  <StatusBadge domain="fee" value={year.status} />
                  {current && <RecordPaymentButton targets={[target]} today={today} />}
                </Group>
              }
            >
              Fee for {year.enrolment.academicYearId}
            </CardTitle>
            <SimpleGrid cols={{ base: 3 }} spacing="md" mb={year.payments.length ? "md" : 0}>
              <Field
                label="Fee"
                value={
                  <>
                    <MoneyText cents={year.feeCents} />
                    {year.enrolment.feeNote && (
                      <Text size="sm" c="dimmed" component="span">
                        {" "}
                        · {year.enrolment.feeNote}
                      </Text>
                    )}
                  </>
                }
              />
              <Field label="Paid" value={<MoneyText cents={year.paidCents} />} />
              <Field label="Balance" value={<MoneyText cents={year.balanceCents} fw={500} />} />
            </SimpleGrid>
            {year.payments.length > 0 && (
              <PaymentsTable
                payments={year.payments}
                target={current ? target : undefined}
                today={today}
                timezone={timezone}
              />
            )}
          </Card>
        );
      })}
    </Stack>
  );
}
