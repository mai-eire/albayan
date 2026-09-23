import { Card, Stack, Text } from "@mantine/core";
import { CardTitle } from "@/components/CardTitle";
import { Figures } from "@/components/Figures";
import { LinkButton } from "@/components/LinkButton";
import { PaymentHistory } from "@/components/PaymentHistory";
import { StatusBadge } from "@/components/StatusBadge";
import { feeForChild } from "@/lib/db/queries/family";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { formatEuros } from "@/lib/money";
import { loadChild } from "../load";

type Props = { params: Promise<{ id: string }> };

// The same figures the office sees for this child, with the payments recorded against the
// fee. Everything to do with paying lives on the family's Fees page, so this one links there.
export default async function ChildFeesPage({ params }: Props) {
  const [child, { timezone }] = await Promise.all([loadChild(params), getSchoolSettings()]);
  const year = await feeForChild(child.id);
  if (!year) {
    return (
      <Card>
        <CardTitle>Fees</CardTitle>
        <Text c="dimmed">There is no fee until {child.firstName} has a place.</Text>
      </Card>
    );
  }
  const credit = year.balanceCents < 0;
  return (
    <Stack gap="lg">
      <Card>
        <CardTitle
          context={
            <LinkButton href="/family/fees" variant="subtle" size="xs">
              See all your fees
            </LinkButton>
          }
        >
          Fee for {year.enrolment.academicYearId}
          <Text component="span" fw={400} ms="xs">
            <StatusBadge domain="fee" value={year.status} />
          </Text>
        </CardTitle>
        <Figures
          items={[
            {
              label: credit ? "In credit" : "Still to pay",
              value: formatEuros(Math.abs(year.balanceCents)),
              color: credit ? "tile" : year.balanceCents > 0 ? "saffron" : undefined,
              hint: credit ? "You have paid more than the fee" : undefined,
            },
            {
              label: "Fee",
              value: formatEuros(year.feeCents),
              hint: year.enrolment.feeNote ?? undefined,
            },
            { label: "Paid", value: formatEuros(year.paidCents) },
          ]}
        />
      </Card>
      <Card>
        <CardTitle>Payments</CardTitle>
        {year.payments.length === 0 ? (
          <Text c="dimmed">Nothing recorded yet.</Text>
        ) : (
          <PaymentHistory payments={year.payments} timezone={timezone} />
        )}
      </Card>
    </Stack>
  );
}
