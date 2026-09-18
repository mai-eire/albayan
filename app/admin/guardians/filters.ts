import type { GuardianChild, GuardianListRow } from "@/lib/db/queries/students";
import { groupFamilies, type Family } from "@/lib/families";

export type FamilyRow = Family<GuardianListRow, GuardianChild>;

// Which families to show: by name, email or phone of a guardian, a child's name, or where
// the children are (session, class, teacher). Applied in the browser and by the CSV export.
export type FamilyFilters = {
  q?: string;
  sessionId?: number;
  classId?: number;
  teacherId?: number;
  // Only families with a child still waiting for a decision.
  applied?: boolean;
};

export type ClassOption = {
  id: number;
  name: string;
  sessionId: number;
  sessionName: string;
  teacherIds: number[];
};

export function parseFamilyFilters(params: Record<string, string | undefined>): FamilyFilters {
  return {
    q: params.q?.trim().toLowerCase() || undefined,
    sessionId: params.session ? Number(params.session) : undefined,
    classId: params.class ? Number(params.class) : undefined,
    teacherId: params.teacher ? Number(params.teacher) : undefined,
    applied: params.applied === "1",
  };
}

export function familiesFrom(guardians: GuardianListRow[]): FamilyRow[] {
  return groupFamilies<GuardianChild, GuardianListRow>(guardians);
}

export function applyFamilyFilters(
  families: FamilyRow[],
  f: FamilyFilters,
  classes: ClassOption[],
): FamilyRow[] {
  const taughtBy = f.teacherId
    ? new Set(classes.filter((c) => c.teacherIds.includes(f.teacherId!)).map((c) => c.id))
    : null;
  return families.filter((family) => {
    const kids = family.children.filter(
      (c) =>
        (!f.sessionId || c.sessionId === f.sessionId) &&
        (!f.classId || c.classId === f.classId) &&
        (!taughtBy || (c.classId !== null && taughtBy.has(c.classId))),
    );
    if ((f.sessionId || f.classId || taughtBy) && kids.length === 0) return false;
    if (f.applied && !family.children.some((c) => c.status === "applied")) return false;
    if (!f.q) return true;
    return (
      family.guardians.some(
        (g) =>
          g.name.toLowerCase().includes(f.q!) ||
          g.email.toLowerCase().includes(f.q!) ||
          (g.phone ?? "").replace(/\s/g, "").includes(f.q!.replace(/\s/g, "")),
      ) || family.children.some((c) => `${c.firstName} ${c.lastName}`.toLowerCase().includes(f.q!))
    );
  });
}
