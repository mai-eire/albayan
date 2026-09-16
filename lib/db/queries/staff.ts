import { asc, eq, isNotNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { teachers, users } from "@/lib/db/schema";

export type StaffRow = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  isAdmin: boolean;
  status: "active" | "invited" | "disabled";
  teacher: { id: number; isActive: boolean } | null;
};

// Everyone with an admin flag or a teacher row, whatever else they also are.
export async function listStaff(): Promise<StaffRow[]> {
  const d = await db();
  const rows = await d
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      isAdmin: users.isAdmin,
      status: users.status,
      teacherId: teachers.id,
      teacherActive: teachers.isActive,
    })
    .from(users)
    .leftJoin(teachers, eq(teachers.userId, users.id))
    .where(or(eq(users.isAdmin, true), isNotNull(teachers.id)))
    .orderBy(asc(users.name));
  return rows.map(({ teacherId, teacherActive, ...r }) => ({
    ...r,
    teacher: teacherId === null ? null : { id: teacherId, isActive: teacherActive ?? true },
  }));
}
