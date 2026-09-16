"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/access";
import { subjectIdFor } from "@/lib/academics";
import { action, ActionError } from "@/lib/actions";
import { audit } from "@/lib/audit";
import { subjects } from "@/lib/db/schema";

const name = z
  .string()
  .trim()
  .min(2, "Give the subject a name")
  .max(40, "Use at most 40 characters");

export const createSubject = action(z.object({ name }), async (input, { user, db }) => {
  requireAdmin(user);
  const id = subjectIdFor(input.name);
  if (!id) throw new ActionError("Use letters or numbers in the name.");
  if (await db.query.subjects.findFirst({ where: eq(subjects.id, id) })) {
    throw new ActionError(`A subject with the code "${id}" already exists.`);
  }
  await db.insert(subjects).values({ id, name: input.name });
  await audit(db, {
    actorUserId: user.id,
    action: "subject.create",
    entityType: "subject",
    entityId: id,
    changes: { created: [null, input] },
  });
  revalidatePath("/admin/academics");
});

export const renameSubject = action(
  z.object({ id: z.string(), name }),
  async (input, { user, db }) => {
    requireAdmin(user);
    const before = await db.query.subjects.findFirst({ where: eq(subjects.id, input.id) });
    if (!before) throw new ActionError("That subject no longer exists.");
    await db.update(subjects).set({ name: input.name }).where(eq(subjects.id, input.id));
    await audit(db, {
      actorUserId: user.id,
      action: "subject.rename",
      entityType: "subject",
      entityId: input.id,
      changes: { name: [before.name, input.name] },
    });
    revalidatePath("/admin/academics");
  },
);

export const setSubjectActive = action(
  z.object({ id: z.string(), isActive: z.boolean() }),
  async (input, { user, db }) => {
    requireAdmin(user);
    await db.update(subjects).set({ isActive: input.isActive }).where(eq(subjects.id, input.id));
    await audit(db, {
      actorUserId: user.id,
      action: input.isActive ? "subject.activate" : "subject.deactivate",
      entityType: "subject",
      entityId: input.id,
    });
    revalidatePath("/admin/academics");
  },
);
