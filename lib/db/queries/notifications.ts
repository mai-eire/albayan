import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";

export type NotificationRow = typeof notifications.$inferSelect;

export async function listNotifications(userId: number, limit = 50): Promise<NotificationRow[]> {
  return (await db())
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt), desc(notifications.id))
    .limit(limit);
}
