import { and, asc, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
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

export type ApplicationStatus = "applied" | "accepted" | "declined";

// Admin-only: everything the office needs to place a child. Never passed to teachers.
export type Application = {
  id: number;
  firstName: string;
  lastName: string;
  gender: (typeof students.$inferSelect)["gender"];
  dateOfBirth: string;
  schoolYearGroup: string | null;
  isHomeschooled: boolean;
  arabicProficiency: (typeof students.$inferSelect)["arabicProficiency"];
  allergies: string | null;
  medicalNotes: string | null;
  applicationNotes: string | null;
  appliedAt: string;
  // Where it got to, and when — an accepted application keeps the place it was given.
  status: ApplicationStatus;
  decidedAt: string | null;
  declinedReason: string | null;
  offerNote: string | null;
  placedClassId: number | null;
  placedClassName: string | null;
  placedSessionName: string | null;
  applicationYearId: string | null;
  preferredSessionId: number | null;
  preferredSessionName: string | null;
  // The level asked for, by name; with no session asked for it means "that level, any day".
  preferredClassName: string | null;
  guardian: { id: number; name: string; email: string; phone: string | null; relationship: string };
  // Brothers and sisters already attending, so the office can keep families together.
  siblings: string[];
};

// Every application — waiting, accepted or declined — or just the ones asked for (a
// class's, one student's). The office filters the list in the browser.
export async function listApplications(
  filter: { onlyIds?: number[]; yearId?: string } = {},
): Promise<Application[]> {
  const { onlyIds, yearId } = filter;
  const d = await db();
  if (onlyIds && onlyIds.length === 0) return [];
  const placedClass = alias(classes, "placed_class");
  const placedSession = alias(schoolSessions, "placed_session");
  const rows = await d
    .select({
      student: students,
      preferredSessionName: schoolSessions.name,
      placedClassId: placedClass.id,
      placedClassName: placedClass.name,
      placedSessionName: placedSession.name,
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
    .leftJoin(
      enrolments,
      and(eq(enrolments.studentId, students.id), eq(enrolments.status, "active")),
    )
    .leftJoin(placedClass, eq(placedClass.id, enrolments.classId))
    .leftJoin(placedSession, eq(placedSession.id, placedClass.sessionId))
    .where(
      and(
        inArray(students.status, ["applied", "active", "declined"]),
        onlyIds ? inArray(students.id, onlyIds) : undefined,
        yearId ? eq(students.applicationYearId, yearId) : undefined,
      ),
    )
    .orderBy(desc(students.appliedAt));
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
    isHomeschooled: r.student.isHomeschooled,
    arabicProficiency: r.student.arabicProficiency,
    allergies: r.student.allergies,
    medicalNotes: r.student.medicalNotes,
    applicationNotes: r.student.applicationNotes,
    appliedAt: r.student.appliedAt,
    status:
      r.student.status === "applied"
        ? ("applied" as const)
        : r.student.status === "declined"
          ? ("declined" as const)
          : ("accepted" as const),
    decidedAt:
      r.student.status === "declined" ? r.student.declinedAt : (r.student.approvedAt ?? null),
    declinedReason: r.student.declinedReason,
    offerNote: r.student.offerNote,
    placedClassId: r.placedClassId,
    placedClassName: r.placedClassName,
    placedSessionName: r.placedSessionName,
    applicationYearId: r.student.applicationYearId,
    preferredSessionId: r.student.preferredSessionId,
    preferredSessionName: r.preferredSessionName,
    preferredClassName: r.student.preferredClassName,
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

export type ClassApplication = {
  id: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  appliedAt: string;
  guardianName: string;
};

// Children waiting for a decision who asked for this class — its level by name, on its day
// or on no day in particular. The office sees who is queuing before moving anyone in or out.
export async function listApplicationsForClass(classId: number): Promise<ClassApplication[]> {
  const d = await db();
  const [cls] = await d
    .select({ name: classes.name, sessionId: classes.sessionId })
    .from(classes)
    .where(eq(classes.id, classId));
  if (!cls) return [];
  return d
    .select({
      id: students.id,
      firstName: students.firstName,
      lastName: students.lastName,
      dateOfBirth: students.dateOfBirth,
      appliedAt: students.appliedAt,
      guardianName: users.name,
    })
    .from(students)
    .innerJoin(
      studentGuardians,
      and(eq(studentGuardians.studentId, students.id), eq(studentGuardians.isPrimaryContact, true)),
    )
    .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
    .innerJoin(users, eq(users.id, guardians.userId))
    .where(
      and(
        eq(students.status, "applied"),
        eq(students.preferredClassName, cls.name),
        or(isNull(students.preferredSessionId), eq(students.preferredSessionId, cls.sessionId)),
      ),
    )
    .orderBy(asc(students.appliedAt));
}
