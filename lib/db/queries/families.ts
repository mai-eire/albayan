import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  classes,
  enrolments,
  guardians,
  schoolSessions,
  studentGuardians,
  students,
  users,
} from "@/lib/db/schema";
import type { FeeStatus } from "@/lib/fees";
import { feeAccountsForStudents } from "./fees";

// One line per brother or sister for the "Also in this family" table on the offer and
// move modals: who looks after them, where they are, and whether their fee is paid.
export type FamilyMember = {
  id: number;
  firstName: string;
  lastName: string;
  status: (typeof students.$inferSelect)["status"];
  guardianNames: string[];
  sessionName: string | null;
  className: string | null;
  feeStatus: FeeStatus | null;
};

// The family of each student given (their siblings through any shared guardian, not
// themselves), in a few batched queries however many students are asked about.
export async function familyOverviewFor(
  studentIds: number[],
  academicYearId: string | null,
): Promise<Map<number, FamilyMember[]>> {
  const out = new Map<number, FamilyMember[]>();
  if (!studentIds.length) return out;
  const d = await db();
  const links = await d
    .select({ studentId: studentGuardians.studentId, guardianId: studentGuardians.guardianId })
    .from(studentGuardians)
    .where(inArray(studentGuardians.studentId, studentIds));
  const guardianIds = [...new Set(links.map((l) => l.guardianId))];
  if (!guardianIds.length) return out;
  const allLinks = await d
    .select({
      studentId: studentGuardians.studentId,
      guardianId: studentGuardians.guardianId,
      guardianName: users.name,
    })
    .from(studentGuardians)
    .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
    .innerJoin(users, eq(users.id, guardians.userId))
    .where(inArray(studentGuardians.guardianId, guardianIds));
  const memberIds = [...new Set(allLinks.map((l) => l.studentId))];
  const [rows, fees] = await Promise.all([
    d
      .select({
        id: students.id,
        firstName: students.firstName,
        lastName: students.lastName,
        status: students.status,
        dateOfBirth: students.dateOfBirth,
        sessionName: schoolSessions.name,
        className: classes.name,
      })
      .from(students)
      .leftJoin(
        enrolments,
        and(eq(enrolments.studentId, students.id), eq(enrolments.status, "active")),
      )
      .leftJoin(classes, eq(classes.id, enrolments.classId))
      .leftJoin(schoolSessions, eq(schoolSessions.id, classes.sessionId))
      .where(inArray(students.id, memberIds))
      .orderBy(asc(students.dateOfBirth)),
    academicYearId ? feeAccountsForStudents(academicYearId, memberIds) : new Map(),
  ]);
  // Every guardian of every member, so a sibling's other parent shows too.
  const memberLinks = await d
    .select({ studentId: studentGuardians.studentId, guardianName: users.name })
    .from(studentGuardians)
    .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
    .innerJoin(users, eq(users.id, guardians.userId))
    .where(inArray(studentGuardians.studentId, memberIds))
    .orderBy(asc(studentGuardians.isPrimaryContact));
  const member = (id: number): FamilyMember | null => {
    const r = rows.find((row) => row.id === id);
    if (!r) return null;
    const { dateOfBirth: _dob, ...rest } = r;
    void _dob;
    return {
      ...rest,
      guardianNames: memberLinks
        .filter((l) => l.studentId === id)
        .map((l) => l.guardianName)
        .reverse(),
      feeStatus: fees.get(id)?.status ?? null,
    };
  };
  for (const studentId of studentIds) {
    const mine = links.filter((l) => l.studentId === studentId).map((l) => l.guardianId);
    const siblingIds = [
      ...new Set(
        allLinks
          .filter((l) => mine.includes(l.guardianId) && l.studentId !== studentId)
          .map((l) => l.studentId),
      ),
    ];
    out.set(
      studentId,
      rows.filter((r) => siblingIds.includes(r.id)).flatMap((r) => member(r.id) ?? []),
    );
  }
  return out;
}
