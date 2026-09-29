import { and, asc, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  classes,
  eventTargets,
  events,
  schoolSessions,
  type EventAudience,
  type EventType,
} from "@/lib/db/schema";

// The school calendar. One table, two families of entry (lib/events.ts): the dates the
// school announces and the activities a family may choose. Everyone reads the same rows;
// what changes per viewer is which of them are theirs and whether drafts are included.

export type EventRow = {
  id: number;
  title: string;
  description: string | null;
  type: EventType;
  startAt: string;
  endAt: string;
  location: string | null;
  isPublished: boolean;
  feeCents: number | null;
  audience: EventAudience;
  // Named targets, for the office's list and the family's "who it is for" line.
  sessionIds: number[];
  classIds: number[];
  targetNames: string[];
};

type Range = { from: string; to: string };

async function withTargets(rows: (typeof events.$inferSelect)[]): Promise<EventRow[]> {
  if (!rows.length) return [];
  const d = await db();
  const targets = await d
    .select({
      eventId: eventTargets.eventId,
      sessionId: eventTargets.sessionId,
      classId: eventTargets.classId,
      sessionName: schoolSessions.name,
      className: classes.name,
    })
    .from(eventTargets)
    .leftJoin(schoolSessions, eq(schoolSessions.id, eventTargets.sessionId))
    .leftJoin(classes, eq(classes.id, eventTargets.classId))
    .where(
      inArray(
        eventTargets.eventId,
        rows.map((r) => r.id),
      ),
    );
  return rows.map((row) => {
    const mine = targets.filter((t) => t.eventId === row.id);
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      type: row.type,
      startAt: row.startAt,
      endAt: row.endAt,
      location: row.location,
      isPublished: row.isPublished,
      feeCents: row.feeCents,
      audience: row.audience,
      sessionIds: mine.flatMap((t) => (t.sessionId === null ? [] : [t.sessionId])),
      classIds: mine.flatMap((t) => (t.classId === null ? [] : [t.classId])),
      targetNames: mine.flatMap((t) => {
        const name = t.sessionName ?? t.className;
        return name === null ? [] : [name];
      }),
    };
  });
}

// Everything in a date range, drafts included: the office's calendar and list.
export async function listEventsForAdmin(range: Range): Promise<EventRow[]> {
  const d = await db();
  const rows = await d
    .select()
    .from(events)
    .where(and(gte(events.endAt, range.from), lte(events.startAt, `${range.to}T99`)))
    .orderBy(asc(events.startAt));
  return withTargets(rows);
}

export type ViewerScope = {
  sessionIds: number[];
  classIds: number[];
  // Set only for teachers: staff meetings are theirs too.
  staff?: boolean;
};

// What this viewer's calendar shows: published entries for the whole school, plus any aimed
// at a session or class of theirs. A Sunday family never sees a Saturday trip. A staff-only
// entry is neither, so it never reaches a family or a student; a teacher asks for those
// through their scope, and the office reads everything through listEventsForAdmin.
export async function listEventsForViewer(range: Range, scope: ViewerScope): Promise<EventRow[]> {
  const d = await db();
  const mine = d
    .select({ id: eventTargets.eventId })
    .from(eventTargets)
    .where(
      or(
        scope.sessionIds.length ? inArray(eventTargets.sessionId, scope.sessionIds) : sql`0 = 1`,
        scope.classIds.length ? inArray(eventTargets.classId, scope.classIds) : sql`0 = 1`,
      ),
    );
  const rows = await d
    .select()
    .from(events)
    .where(
      and(
        eq(events.isPublished, true),
        gte(events.endAt, range.from),
        lte(events.startAt, `${range.to}T99`),
        or(
          eq(events.audience, "whole_school"),
          inArray(events.id, mine),
          scope.staff ? eq(events.audience, "staff") : undefined,
        ),
      ),
    )
    .orderBy(asc(events.startAt));
  return withTargets(rows);
}

export async function getEvent(id: number): Promise<EventRow | null> {
  const row = await (await db()).query.events.findFirst({ where: eq(events.id, id) });
  return row ? ((await withTargets([row]))[0] ?? null) : null;
}
