import type { StudentListRow } from "@/lib/db/queries/students";
import { studentStatuses } from "@/lib/db/schema";

// The list's filters live in the URL and are applied in the browser (useUrlFilters) and by
// the CSV export, so both show the same rows.
export type StudentFilters = {
  status: (typeof studentStatuses)[number] | "all";
  sessionId?: number;
  classId?: number;
  q?: string;
};

export const studentStatusOptions = [
  { value: "all", label: "All" },
  { value: "active", label: "Attending" },
  { value: "applied", label: "Applied" },
  { value: "inactive", label: "Left" },
  { value: "declined", label: "Declined" },
];

export function parseStudentFilters(params: Record<string, string | undefined>): StudentFilters {
  return {
    status:
      params.status === "all"
        ? "all"
        : (studentStatuses.find((s) => s === params.status) ?? "active"),
    sessionId: params.session ? Number(params.session) : undefined,
    classId: params.class ? Number(params.class) : undefined,
    q: params.q?.trim().toLowerCase() || undefined,
  };
}

export function applyStudentFilters(rows: StudentListRow[], f: StudentFilters): StudentListRow[] {
  return rows.filter(
    (s) =>
      (f.status === "all" || s.status === f.status) &&
      (!f.sessionId || s.sessionId === f.sessionId) &&
      (!f.classId || s.classId === f.classId) &&
      (!f.q ||
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(f.q) ||
        (s.studentId ?? "").toLowerCase().includes(f.q) ||
        (s.guardianName ?? "").toLowerCase().includes(f.q)),
  );
}
