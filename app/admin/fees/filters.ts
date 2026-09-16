import type { FeeAccountRow } from "@/lib/db/queries/fees";

// The list's filters live in the URL (shareable, survives refresh) and are shared by the
// page and its CSV export so both show the same rows.
export type FeeFilters = {
  sessionId?: number;
  classId?: number;
  show: "outstanding" | "everyone";
};

export function parseFeeFilters(params: Record<string, string | undefined>): FeeFilters {
  return {
    sessionId: params.session ? Number(params.session) : undefined,
    classId: params.class ? Number(params.class) : undefined,
    show: params.show === "everyone" ? "everyone" : "outstanding",
  };
}

export function applyFeeFilters(accounts: FeeAccountRow[], f: FeeFilters): FeeAccountRow[] {
  return accounts.filter(
    (a) =>
      (!f.sessionId || a.enrolment.sessionId === f.sessionId) &&
      (!f.classId || a.enrolment.classId === f.classId) &&
      (f.show === "everyone" || a.balanceCents > 0),
  );
}
