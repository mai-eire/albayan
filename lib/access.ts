import { and, eq, inArray, or } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "./db";
import {
  classes,
  enrolments,
  studentGuardians,
  students,
  teachingAssignments,
  type ResourceAudience,
} from "./db/schema";
import { getCurrentUser, type Area, type CurrentUser } from "./current-user";

// The whole authorisation layer. Roles are derived (CurrentUser); the rules below are pure
// functions over a user and the facts about the object, so they are tested without a DB.
// The loaders at the bottom are the only DB access.

export class AccessDenied extends Error {
  constructor(message = "You don't have access to that.") {
    super(message);
    this.name = "AccessDenied";
  }
}

// ---- Route guards (redirect) --------------------------------------------------------

export async function requireUser(next?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  if (user.mustChangePassword) redirect("/change-password");
  return user;
}

// Used by the area layouts: a teacher opening /admin lands on their own area instead.
export async function requireArea(area: Area): Promise<CurrentUser> {
  const user = await requireUser(`/${area}`);
  if (!user.areas.includes(area)) redirect(user.areas[0] ? `/${user.areas[0]}` : "/");
  return user;
}

// ---- Role requirements (throw) — for server actions and queries ---------------------

export function requireAdmin(user: CurrentUser): CurrentUser {
  if (!user.isAdmin) throw new AccessDenied();
  return user;
}

export function requireTeacher(user: CurrentUser): NonNullable<CurrentUser["teacher"]> {
  if (!user.teacher?.isActive) throw new AccessDenied();
  return user.teacher;
}

export function requireGuardian(user: CurrentUser): NonNullable<CurrentUser["guardian"]> {
  if (!user.guardian) throw new AccessDenied();
  return user.guardian;
}

export function requireStudent(user: CurrentUser): NonNullable<CurrentUser["student"]> {
  if (!user.student) throw new AccessDenied();
  return user.student;
}

// ---- Object rules ------------------------------------------------------------------

export type ClassFacts = {
  id: number;
  classTeacherId: number | null;
  assignments: { subjectId: string; teacherId: number }[];
};

export type StudentFacts = {
  id: number;
  userId: number | null;
  guardianIds: number[];
  // The class of the one active enrolment, if any. Ended enrolments grant nothing.
  activeClass: ClassFacts | null;
};

// Class teacher or has any teaching assignment in the class.
export function teachesClass(user: CurrentUser, cls: ClassFacts): boolean {
  const teacher = user.teacher;
  if (!teacher?.isActive) return false;
  return (
    cls.classTeacherId === teacher.id || cls.assignments.some((a) => a.teacherId === teacher.id)
  );
}

// Has the (class, subject) assignment. Being class teacher is not enough on its own.
export function teachesSubjectIn(user: CurrentUser, cls: ClassFacts, subjectId: string): boolean {
  const teacher = user.teacher;
  if (!teacher?.isActive) return false;
  return cls.assignments.some((a) => a.subjectId === subjectId && a.teacherId === teacher.id);
}

export function isGuardianOf(
  user: CurrentUser,
  student: Pick<StudentFacts, "guardianIds">,
): boolean {
  return user.guardian !== null && student.guardianIds.includes(user.guardian.id);
}

export function isSelf(user: CurrentUser, student: Pick<StudentFacts, "userId">): boolean {
  return student.userId !== null && student.userId === user.id;
}

// admin | guardian of | teaches the student's active class | the student themself.
// What each of them may see is decided by the per-viewer query, not here.
export function canViewStudent(user: CurrentUser, student: StudentFacts): boolean {
  if (user.isAdmin) return true;
  if (isGuardianOf(user, student)) return true;
  if (isSelf(user, student)) return true;
  return student.activeClass !== null && teachesClass(user, student.activeClass);
}

// Registers: a teacher of the class may take or correct any register up to today — a missed
// Saturday can be filled in on Monday. Changes after the day are audited (decision 2026-09-17,
// docs/FEEDBACK.md); the future is nobody's.
export function canEditRegister(
  user: CurrentUser,
  cls: ClassFacts,
  date: string,
  today: string,
): boolean {
  if (date > today) return false;
  if (user.isAdmin) return true;
  return teachesClass(user, cls);
}

// A resource's target, with a homework target already resolved to its class.
export type ResourceFacts = {
  audience: ResourceAudience;
  isSchoolWide: boolean;
  classId: number | null;
  studentId: number | null;
};

// What a viewer is connected to: classes they teach, their children's classes or their
// own; students they may see (their children, themselves, their classes' students).
export type ResourceViewer = { classIds: number[]; studentIds: number[] };

export function isStaff(user: CurrentUser): boolean {
  return user.isAdmin || Boolean(user.teacher?.isActive);
}

// Audience first (staff-only, guardians-only), then the target: school-wide is for
// everyone the audience allows; a class or student resource needs a connection to it.
export function canViewResource(
  user: CurrentUser,
  resource: ResourceFacts,
  viewer: ResourceViewer,
): boolean {
  const staff = isStaff(user);
  if (resource.audience === "staff_only" && !staff) return false;
  if (resource.audience === "guardians_only" && !staff && !user.guardian) return false;
  if (user.isAdmin || resource.isSchoolWide) return true;
  if (resource.classId !== null) return viewer.classIds.includes(resource.classId);
  if (resource.studentId !== null) return viewer.studentIds.includes(resource.studentId);
  return false;
}

// ---- Loaders -----------------------------------------------------------------------

export async function loadClassFacts(classId: number): Promise<ClassFacts | null> {
  const d = await db();
  const cls = await d.query.classes.findFirst({
    columns: { id: true, classTeacherId: true },
    where: eq(classes.id, classId),
  });
  if (!cls) return null;
  const assignments = await d
    .select({ subjectId: teachingAssignments.subjectId, teacherId: teachingAssignments.teacherId })
    .from(teachingAssignments)
    .where(eq(teachingAssignments.classId, classId));
  return { ...cls, assignments };
}

export async function loadStudentFacts(studentId: number): Promise<StudentFacts | null> {
  const d = await db();
  const student = await d.query.students.findFirst({
    columns: { id: true, userId: true },
    where: (s, { eq }) => eq(s.id, studentId),
  });
  if (!student) return null;
  const [guardianRows, enrolment] = await Promise.all([
    d
      .select({ guardianId: studentGuardians.guardianId })
      .from(studentGuardians)
      .where(eq(studentGuardians.studentId, studentId)),
    d.query.enrolments.findFirst({
      columns: { classId: true },
      where: and(eq(enrolments.studentId, studentId), eq(enrolments.status, "active")),
    }),
  ]);
  return {
    id: student.id,
    userId: student.userId,
    guardianIds: guardianRows.map((g) => g.guardianId),
    activeClass: enrolment ? await loadClassFacts(enrolment.classId) : null,
  };
}

export async function loadResourceViewer(user: CurrentUser): Promise<ResourceViewer> {
  const d = await db();
  const classIds = new Set<number>();
  const studentIds = new Set<number>();
  if (user.teacher?.isActive) {
    const taught = await d
      .select({ id: classes.id })
      .from(classes)
      .where(
        or(
          eq(classes.classTeacherId, user.teacher.id),
          inArray(
            classes.id,
            d
              .select({ id: teachingAssignments.classId })
              .from(teachingAssignments)
              .where(eq(teachingAssignments.teacherId, user.teacher.id)),
          ),
        ),
      );
    for (const c of taught) classIds.add(c.id);
  }
  if (user.guardian) {
    const kids = await d
      .select({ id: studentGuardians.studentId })
      .from(studentGuardians)
      .where(eq(studentGuardians.guardianId, user.guardian.id));
    for (const k of kids) studentIds.add(k.id);
  }
  if (user.student) studentIds.add(user.student.id);
  const own = [...studentIds];
  if (own.length) {
    const placed = await d
      .select({ classId: enrolments.classId })
      .from(enrolments)
      .where(and(inArray(enrolments.studentId, own), eq(enrolments.status, "active")));
    for (const p of placed) classIds.add(p.classId);
  }
  if (classIds.size && user.teacher?.isActive) {
    const pupils = await d
      .select({ id: students.id })
      .from(enrolments)
      .innerJoin(students, eq(students.id, enrolments.studentId))
      .where(and(inArray(enrolments.classId, [...classIds]), eq(enrolments.status, "active")));
    for (const p of pupils) studentIds.add(p.id);
  }
  return { classIds: [...classIds], studentIds: [...studentIds] };
}
