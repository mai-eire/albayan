import { clock } from "@/lib/clock";
import { notFound } from "next/navigation";
import { getCurrentYear } from "@/lib/db/queries/academics";
import {
  listFeeAccounts,
  listPaymentsForGuardian,
  listPaymentTargets,
} from "@/lib/db/queries/fees";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { getGuardianForAdmin } from "@/lib/db/queries/students";
import { todayIn } from "@/lib/time";
import { FamilyPayments } from "./FamilyPayments";

type Props = { params: Promise<{ id: string }> };

// Corrections happen on the child's Fees tab, where the fee they belong to is.
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
  const [accounts, targets] = year
    ? await Promise.all([
        listFeeAccounts(year.id).then((rows) =>
          rows.filter((a) => childIds.has(a.enrolment.studentId)),
        ),
        // Only this family's children, so the modal opens on the right people.
        listPaymentTargets(year.id).then((rows) => rows.filter((t) => childIds.has(t.studentId))),
      ])
    : [[], []];
  const today = todayIn(timezone, await clock());
  return (
    <FamilyPayments
      year={year?.id ?? null}
      accounts={accounts}
      targets={targets}
      payments={payments}
      today={today}
      timezone={timezone}
    />
  );
}
