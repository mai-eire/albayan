import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { cache } from "react";
import { auth } from "./auth";
import { db } from "./db";
import { guardians, students, teachers, users } from "./db/schema";

export type Area = "admin" | "teacher" | "family" | "student";

export type CurrentUser = {
  id: number;
  name: string;
  email: string;
  isAdmin: boolean;
  phone: string | null;
  emailVerified: boolean;
  emailNotifications: boolean;
  mustChangePassword: boolean;
  guardian: { id: number } | null;
  teacher: { id: number; isActive: boolean } | null;
  student: { id: number; studentId: string | null; firstName: string } | null;
  // Areas this user can enter, in landing order. Derived, never stored.
  areas: Area[];
};

export function areasFor(user: Omit<CurrentUser, "areas">): Area[] {
  const areas: Area[] = [];
  if (user.isAdmin) areas.push("admin");
  if (user.teacher?.isActive) areas.push("teacher");
  if (user.guardian) areas.push("family");
  if (user.student) areas.push("student");
  return areas;
}

// The signed-in user with their role rows, loaded once per request.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await (await auth()).api.getSession({ headers: await headers() });
  if (!session) return null;
  const id = Number(session.user.id);
  const d = await db();
  const [user, guardian, teacher, student] = await Promise.all([
    d.query.users.findFirst({
      columns: {
        id: true,
        name: true,
        email: true,
        isAdmin: true,
        phone: true,
        emailVerified: true,
        emailNotifications: true,
        mustChangePassword: true,
        status: true,
      },
      where: eq(users.id, id),
    }),
    d.query.guardians.findFirst({ columns: { id: true }, where: eq(guardians.userId, id) }),
    d.query.teachers.findFirst({
      columns: { id: true, isActive: true },
      where: eq(teachers.userId, id),
    }),
    d.query.students.findFirst({
      columns: { id: true, studentId: true, firstName: true },
      where: eq(students.userId, id),
    }),
  ]);
  if (!user || user.status === "disabled") return null;
  const base = {
    id: user.id,
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin,
    phone: user.phone,
    emailVerified: user.emailVerified,
    emailNotifications: user.emailNotifications,
    mustChangePassword: user.mustChangePassword,
    guardian: guardian ?? null,
    teacher: teacher ?? null,
    student: student ?? null,
  };
  return { ...base, areas: areasFor(base) };
});
