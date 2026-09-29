"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/access";
import { action, ActionError } from "@/lib/actions";
import { audit } from "@/lib/audit";
import type { Db } from "@/lib/db";
import { eventAudiences, eventTargets, events, eventTypes } from "@/lib/db/schema";
import { atFrom } from "@/lib/events";
import { optionalText } from "@/lib/fields";
import { eurosField } from "@/lib/money";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date");
const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a time like 10:00")
  .nullable();

const schema = z
  .object({
    id: z.number().int().optional(),
    title: z.string().trim().min(2, "Give it a name").max(120),
    type: z.enum(eventTypes, { message: "Choose what it is" }),
    description: optionalText(2000),
    startDate: date,
    endDate: date,
    startTime: time,
    endTime: time,
    location: optionalText(120),
    audience: z.enum(eventAudiences),
    // Only read when the audience is a session or a class.
    sessionIds: z.array(z.number().int()),
    classIds: z.array(z.number().int()),
    fee: eurosField.nullable(),
    publish: z.boolean(),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: "The last day can't be before the first",
    path: ["endDate"],
  })
  .refine((v) => v.audience !== "selected_sessions" || v.sessionIds.length > 0, {
    message: "Choose at least one day",
    path: ["sessionIds"],
  })
  .refine((v) => v.audience !== "selected_classes" || v.classIds.length > 0, {
    message: "Choose at least one class",
    path: ["classIds"],
  });

export type EventInput = z.input<typeof schema>;

// Targets are replaced wholesale: the form always says who the entry is for in full.
async function setTargets(db: Db, eventId: number, input: z.output<typeof schema>) {
  await db.delete(eventTargets).where(eq(eventTargets.eventId, eventId));
  const rows =
    input.audience === "selected_sessions"
      ? input.sessionIds.map((sessionId) => ({ eventId, sessionId, classId: null }))
      : input.audience === "selected_classes"
        ? input.classIds.map((classId) => ({ eventId, sessionId: null, classId }))
        : [];
  if (rows.length) await db.insert(eventTargets).values(rows);
}

export const saveEvent = action(schema, async (input, { user, db }) => {
  requireAdmin(user);
  const row = {
    title: input.title,
    type: input.type,
    description: input.description,
    startAt: atFrom(input.startDate, input.startTime),
    endAt: atFrom(input.endDate, input.endTime ?? input.startTime),
    location: input.location,
    audience: input.audience,
    feeCents: input.fee,
    isPublished: input.publish,
  };
  if (input.id) {
    const existing = await db.query.events.findFirst({ where: eq(events.id, input.id) });
    if (!existing) throw new ActionError("That entry no longer exists.");
    await db.update(events).set(row).where(eq(events.id, input.id));
    await setTargets(db, input.id, input);
    await audit(db, {
      actorUserId: user.id,
      action: "event.update",
      entityType: "event",
      entityId: input.id,
      changes: row,
    });
    refresh();
    return { id: input.id };
  }
  const [created] = await db
    .insert(events)
    .values({ ...row, createdByUserId: user.id })
    .returning({ id: events.id });
  await setTargets(db, created.id, input);
  await audit(db, {
    actorUserId: user.id,
    action: "event.create",
    entityType: "event",
    entityId: created.id,
    changes: row,
  });
  refresh();
  return { id: created.id };
});

export const deleteEvent = action(
  z.object({ id: z.number().int() }),
  async ({ id }, { user, db }) => {
    requireAdmin(user);
    const existing = await db.query.events.findFirst({ where: eq(events.id, id) });
    if (!existing) throw new ActionError("That entry no longer exists.");
    await db.delete(events).where(eq(events.id, id));
    await audit(db, {
      actorUserId: user.id,
      action: "event.delete",
      entityType: "event",
      entityId: id,
      changes: { title: existing.title, startAt: existing.startAt },
    });
    refresh();
  },
);

// Everyone's calendar reads the same rows, so they all go stale together.
function refresh() {
  revalidatePath("/admin/calendar");
  revalidatePath("/family/calendar");
  revalidatePath("/student/calendar");
  revalidatePath("/teacher/timetable");
}
