import { and, count, eq, isNull } from "drizzle-orm";
import { after } from "next/server";
import type { Db } from "./db";
import { notifications, users } from "./db/schema";

type Notification = {
  userId: number;
  // A short machine label for the event: "application.approved", "homework.published"…
  type: string;
  title: string;
  body?: string;
  href?: string;
  // Sends the matching email. Runs after the response, and only if the person wants email.
  email?: () => Promise<void>;
};

// Every notification is an in-app row; the email is optional and gated by the person's
// preference (users.emailNotifications). Called from the server action that caused it.
export async function notify(db: Db, n: Notification) {
  await db.insert(notifications).values({
    userId: n.userId,
    type: n.type,
    title: n.title,
    body: n.body ?? null,
    href: n.href ?? null,
  });
  if (!n.email) return;
  const user = await db.query.users.findFirst({
    columns: { emailNotifications: true, status: true },
    where: eq(users.id, n.userId),
  });
  if (!user?.emailNotifications || user.status === "disabled") return;
  afterResponse(n.email);
}

// Next's after() hands the work to the Worker's waitUntil; outside a request (tests,
// scripts) there is no response to wait for, so it just runs.
function afterResponse(work: () => Promise<void>) {
  try {
    after(work);
  } catch {
    void work();
  }
}

export async function countUnread(db: Db, userId: number): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return row?.n ?? 0;
}
