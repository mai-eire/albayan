import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications, students, subjects } from "@/lib/db/schema";

// The stored row plus the names behind its two references, so the list can show a subject
// badge and say which child it is about without a second query.
export type NotificationRow = typeof notifications.$inferSelect & {
  subjectName: string | null;
  studentName: string | null;
};

const columns = {
  id: notifications.id,
  userId: notifications.userId,
  type: notifications.type,
  title: notifications.title,
  body: notifications.body,
  href: notifications.href,
  subjectId: notifications.subjectId,
  subjectName: subjects.name,
  studentId: notifications.studentId,
  studentName: students.firstName,
  readAt: notifications.readAt,
  createdAt: notifications.createdAt,
  updatedAt: notifications.updatedAt,
};

export async function listNotifications(userId: number, limit = 50): Promise<NotificationRow[]> {
  return (await db())
    .select(columns)
    .from(notifications)
    .leftJoin(subjects, eq(subjects.id, notifications.subjectId))
    .leftJoin(students, eq(students.id, notifications.studentId))
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt), desc(notifications.id))
    .limit(limit);
}

// What the bell's popover shows: the newest unread, titles only.
export async function listUnreadNotifications(
  userId: number,
  limit = 6,
): Promise<NotificationRow[]> {
  return (await db())
    .select(columns)
    .from(notifications)
    .leftJoin(subjects, eq(subjects.id, notifications.subjectId))
    .leftJoin(students, eq(students.id, notifications.studentId))
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
    .orderBy(desc(notifications.createdAt), desc(notifications.id))
    .limit(limit);
}
