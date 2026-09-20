import type { StaffRow } from "@/lib/db/queries/staff";

// Who to show: current staff by default, former teachers when asked; narrowed by where
// they teach. Applied in the browser and by the CSV export.
export type StaffFilters = {
  q?: string;
  showFormer: boolean;
  sessionId?: number;
  classId?: number;
  subjectId?: string;
};

export function parseStaffFilters(params: Record<string, string | undefined>): StaffFilters {
  return {
    q: params.q?.trim().toLowerCase() || undefined,
    showFormer: params.show === "all",
    sessionId: params.session ? Number(params.session) : undefined,
    classId: params.class ? Number(params.class) : undefined,
    subjectId: params.subject || undefined,
  };
}

export function applyStaffFilters(staff: StaffRow[], f: StaffFilters): StaffRow[] {
  return staff.filter((s) => {
    if (!f.showFormer && s.teacher && !s.teacher.isActive && !s.isAdmin) return false;
    if (f.q && !s.name.toLowerCase().includes(f.q) && !s.email.toLowerCase().includes(f.q))
      return false;
    if (!f.sessionId && !f.classId && !f.subjectId) return true;
    return s.classes.some(
      (c) =>
        (!f.sessionId || c.sessionId === f.sessionId) &&
        (!f.classId || c.id === f.classId) &&
        (!f.subjectId || c.subjectIds.includes(f.subjectId)),
    );
  });
}
