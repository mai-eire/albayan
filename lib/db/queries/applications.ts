import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  classes,
  guardians,
  schoolSessions,
  studentGuardians,
  students,
  users,
} from "@/lib/db/schema";

// Admin-only: everything the office needs to place a child. Never passed to teachers.
export type Application = {
  id: number;
  firstName: string;
  lastName: string;
  gender: (typeof students.$inferSelect)["gender"];
  dateOfBirth: string;
  schoolYearGroup: string | null;
  arabicProficiency: (typeof students.$inferSelect)["arabicProficiency"];
  allergies: string | null;
  medicalNotes: string | null;
  applicationNotes: string | null;
  appliedAt: string;
  preferredSessionId: number | null;
  preferredSessionName: string | null;
  preferredClassId: number | null;
  preferredClassName: string | null;
  guardian: { id: number; name: string; email: string; phone: string | null; relationship: string };
  // Brothers and sisters already attending, so the office can keep families together.
  siblings: string[];
};

export async function listApplications(): Promise<Application[]> {
  const d = await db();
  const rows = await d
    .select({
      student: students,
      preferredSessionName: schoolSessions.name,
      preferredClassName: classes.name,
      guardianId: guardians.id,
      guardianName: users.name,
      guardianEmail: users.email,
      guardianPhone: users.phone,
      relationship: studentGuardians.relationship,
    })
    .from(students)
    .innerJoin(
      studentGuardians,
      and(eq(studentGuardians.studentId, students.id), eq(studentGuardians.isPrimaryContact, true)),
    )
    .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
    .innerJoin(users, eq(users.id, guardians.userId))
    .leftJoin(schoolSessions, eq(schoolSessions.id, students.preferredSessionId))
    .leftJoin(classes, eq(classes.id, students.preferredClassId))
    .where(eq(students.status, "applied"))
    .orderBy(asc(students.appliedAt));
  if (!rows.length) return [];

  const guardianIds = [...new Set(rows.map((r) => r.guardianId))];
  const attending = await d
    .select({ guardianId: studentGuardians.guardianId, firstName: students.firstName })
    .from(studentGuardians)
    .innerJoin(students, eq(students.id, studentGuardians.studentId))
    .where(and(inArray(studentGuardians.guardianId, guardianIds), eq(students.status, "active")));

  return rows.map((r) => ({
    id: r.student.id,
    firstName: r.student.firstName,
    lastName: r.student.lastName,
    gender: r.student.gender,
    dateOfBirth: r.student.dateOfBirth,
    schoolYearGroup: r.student.schoolYearGroup,
    arabicProficiency: r.student.arabicProficiency,
    allergies: r.student.allergies,
    medicalNotes: r.student.medicalNotes,
    applicationNotes: r.student.applicationNotes,
    appliedAt: r.student.appliedAt,
    preferredSessionId: r.student.preferredSessionId,
    preferredSessionName: r.preferredSessionName,
    preferredClassId: r.student.preferredClassId,
    preferredClassName: r.preferredClassName,
    guardian: {
      id: r.guardianId,
      name: r.guardianName,
      email: r.guardianEmail,
      phone: r.guardianPhone,
      relationship: r.relationship,
    },
    siblings: attending.filter((a) => a.guardianId === r.guardianId).map((a) => a.firstName),
  }));
}
