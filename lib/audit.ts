import type { Db } from "./db";
import { auditLog } from "./db/schema";

type Entry = {
  actorUserId: number | null;
  action: string;
  entityType: string;
  entityId: string | number;
  // Before/after for edits, the row for creates and deletes.
  changes?: Record<string, unknown>;
};

export async function audit(db: Db, entry: Entry) {
  await db.insert(auditLog).values({
    actorUserId: entry.actorUserId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: String(entry.entityId),
    changes: entry.changes ?? null,
  });
}

// { name: ["Old", "New"] } for the fields that actually changed.
export function diff<T extends Record<string, unknown>>(before: T, after: Partial<T>) {
  const changes: Record<string, [unknown, unknown]> = {};
  for (const key of Object.keys(after)) {
    if (before[key] !== after[key]) changes[key] = [before[key], after[key]];
  }
  return changes;
}
