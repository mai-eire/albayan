"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { action } from "@/lib/actions";
import { notifications } from "@/lib/db/schema";

// Only ever the signed-in person's own rows.
export const markNotificationRead = action(
  z.object({ id: z.number().int() }),
  async (input, { user, db }) => {
    await db
      .update(notifications)
      .set({ readAt: new Date().toISOString() })
      .where(
        and(
          eq(notifications.id, input.id),
          eq(notifications.userId, user.id),
          isNull(notifications.readAt),
        ),
      );
    revalidatePath("/", "layout");
  },
);

export const markAllNotificationsRead = action(z.object({}), async (_input, { user, db }) => {
  await db
    .update(notifications)
    .set({ readAt: new Date().toISOString() })
    .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
  revalidatePath("/", "layout");
});
