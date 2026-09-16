import type { PaymentMethod } from "./db/schema";

// Fees are derived, never stored (PLAN §5 "Fees"): a student's fee for a year is the fee on
// their current place, what they've paid is every payment against any of their places that
// year (a class move ends one enrolment and starts another), and the balance is the gap.

export type FeeStatus = "unpaid" | "part_paid" | "paid" | "waived";

export function feeStatus(feeCents: number, paidCents: number): FeeStatus {
  if (feeCents === 0) return "waived";
  if (paidCents >= feeCents) return "paid";
  if (paidCents > 0) return "part_paid";
  return "unpaid";
}

// Positive when the family still owes; negative when they've paid more than the fee.
export function balanceCents(feeCents: number, paidCents: number): number {
  return feeCents - paidCents;
}

type EnrolmentLike = {
  id: number;
  studentId: number;
  feeCents: number;
  status: "active" | "left";
  startDate: string;
};

type PaymentLike = { enrolmentId: number; amountCents: number };

export type FeeAccount<E extends EnrolmentLike> = {
  // The active place, or the most recent one for a student who has left.
  enrolment: E;
  feeCents: number;
  paidCents: number;
  balanceCents: number;
  status: FeeStatus;
};

// One account per student from the enrolments of a single year and their payments.
export function feeAccounts<E extends EnrolmentLike>(
  enrolments: E[],
  payments: PaymentLike[],
): FeeAccount<E>[] {
  const paidByEnrolment = new Map<number, number>();
  for (const p of payments) {
    paidByEnrolment.set(p.enrolmentId, (paidByEnrolment.get(p.enrolmentId) ?? 0) + p.amountCents);
  }
  const byStudent = new Map<number, E[]>();
  for (const e of enrolments) {
    byStudent.set(e.studentId, [...(byStudent.get(e.studentId) ?? []), e]);
  }
  return [...byStudent.values()].map((places) => {
    const current =
      places.find((e) => e.status === "active") ??
      places.reduce((a, b) => (b.startDate > a.startDate ? b : a));
    const paidCents = places.reduce((sum, e) => sum + (paidByEnrolment.get(e.id) ?? 0), 0);
    return {
      enrolment: current,
      feeCents: current.feeCents,
      paidCents,
      balanceCents: balanceCents(current.feeCents, paidCents),
      status: feeStatus(current.feeCents, paidCents),
    };
  });
}

// What is still owed across accounts, ignoring anyone in credit.
export function outstandingCents(accounts: { balanceCents: number }[]): number {
  return accounts.reduce((sum, a) => sum + Math.max(0, a.balanceCents), 0);
}

export const methodLabels: Record<PaymentMethod, string> = {
  cash: "Cash",
  bank_transfer: "Bank transfer",
  card: "Card",
};
