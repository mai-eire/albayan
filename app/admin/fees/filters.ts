import type { FeeAccountRow } from "@/lib/db/queries/fees";

// The list's filters live in the URL (shareable, survives refresh) and are shared by the
// page and its CSV export so both show the same rows.
export type FeeShow = "outstanding" | "paid" | "everyone";

export type FeeFilters = {
  sessionId?: number;
  classId?: number;
  // Still to pay · paid in full or in part · everyone with a place.
  show: FeeShow;
  // Student name, student ID or guardian name.
  q?: string;
};

export function parseFeeFilters(params: Record<string, string | undefined>): FeeFilters {
  return {
    sessionId: params.session ? Number(params.session) : undefined,
    classId: params.class ? Number(params.class) : undefined,
    show: params.show === "everyone" || params.show === "paid" ? params.show : "outstanding",
    q: params.q?.trim().toLowerCase() || undefined,
  };
}

export function applyFeeFilters(accounts: FeeAccountRow[], f: FeeFilters): FeeAccountRow[] {
  return accounts.filter(
    (a) =>
      (!f.sessionId || a.enrolment.sessionId === f.sessionId) &&
      (!f.classId || a.enrolment.classId === f.classId) &&
      (f.show === "everyone" || (f.show === "paid" ? a.paidCents > 0 : a.balanceCents > 0)) &&
      (!f.q ||
        `${a.enrolment.firstName} ${a.enrolment.lastName}`.toLowerCase().includes(f.q) ||
        (a.enrolment.studentCode ?? "").toLowerCase().includes(f.q) ||
        (a.enrolment.guardianName ?? "").toLowerCase().includes(f.q)),
  );
}
