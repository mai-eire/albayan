import { count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { students } from "@/lib/db/schema";

export async function countPendingApplications(): Promise<number> {
  const [row] = await (
    await db()
  )
    .select({ n: count() })
    .from(students)
    .where(eq(students.status, "applied"));
  return row?.n ?? 0;
}
