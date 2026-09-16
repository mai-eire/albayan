import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { guardians, schoolSessions, studentGuardians, students } from "@/lib/db/schema";

// Per-viewer queries (CLAUDE.md "Privacy is structural"): each function selects only what
// its viewer may see. Admin and teacher shapes arrive in tasks 10 and 11.

export type ChildSummary = {
  id: number;
  firstName: string;
  lastName: string;
  status: (typeof students.$inferSelect)["status"];
  preferredSessionName: string | null;
};

export async function listChildrenForGuardian(guardianId: number): Promise<ChildSummary[]> {
  const d = await db();
  return d
    .select({
      id: students.id,
      firstName: students.firstName,
      lastName: students.lastName,
      status: students.status,
      preferredSessionName: schoolSessions.name,
    })
    .from(studentGuardians)
    .innerJoin(students, eq(students.id, studentGuardians.studentId))
    .leftJoin(schoolSessions, eq(schoolSessions.id, students.preferredSessionId))
    .where(eq(studentGuardians.guardianId, guardianId))
    .orderBy(asc(students.dateOfBirth));
}

// The guardian's own row, for pre-filling the application wizard and the account page.
export async function getGuardianSelf(guardianId: number) {
  return (await db()).query.guardians.findFirst({ where: eq(guardians.id, guardianId) });
}
