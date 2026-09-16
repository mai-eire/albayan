import { Card, Text } from "@mantine/core";
import { notFound } from "next/navigation";
import { CardTitle } from "@/components/CardTitle";
import { MoneyText } from "@/components/MoneyText";
import { PaymentsTable } from "@/app/admin/fees/PaymentsTable";
import { getCurrentYear } from "@/lib/db/queries/academics";
import { listFeeAccounts, listPaymentsForGuardian } from "@/lib/db/queries/fees";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { getGuardianForAdmin } from "@/lib/db/queries/students";
import { outstandingCents } from "@/lib/fees";
import { todayIn } from "@/lib/time";

type Props = { params: Promise<{ id: string }> };

// The family's payments across all their children, with what the family still owes this
// year. Corrections happen on the child's Fees tab, where the fee they belong to is.
export default async function GuardianPaymentsPage({ params }: Props) {
  const id = Number((await params).id);
  const [guardian, payments, year, { timezone }] = await Promise.all([
    getGuardianForAdmin(id),
    listPaymentsForGuardian(id),
    getCurrentYear(),
    getSchoolSettings(),
  ]);
  if (!guardian) notFound();
  const childIds = new Set(guardian.children.map((c) => c.id));
  const accounts = year
    ? (await listFeeAccounts(year.id)).filter((a) => childIds.has(a.enrolment.studentId))
    : [];
  const owed = outstandingCents(accounts);
  return (
    <Card>
      <CardTitle
        context={
          year &&
          accounts.length > 0 && (
            <Text size="sm" c={owed ? undefined : "dimmed"}>
              {owed ? (
                <>
                  <MoneyText cents={owed} fw={500} /> still to pay for {year.id}
                </>
              ) : (
                `Paid in full for ${year.id}`
              )}
            </Text>
          )
        }
      >
        Payments
      </CardTitle>
      {payments.length === 0 ? (
        <Text size="sm" c="dimmed">
          No payments recorded for this family yet.
        </Text>
      ) : (
        <PaymentsTable
          payments={payments}
          showChild
          today={todayIn(timezone)}
          timezone={timezone}
        />
      )}
    </Card>
  );
}
