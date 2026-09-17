"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/access";
import { action, ActionError } from "@/lib/actions";
import { audit, diff } from "@/lib/audit";
import { guardianGenders, guardians, registrationReasons, users } from "@/lib/db/schema";
import { routingKey } from "@/lib/demographics";
import { optionalText } from "@/lib/fields";

// The office corrects a guardian's details on their behalf. Contact edits are audited
// like the guardian's own; sensitive edits especially so.

export const updateGuardianContact = action(
  z.object({
    id: z.number().int(),
    name: z.string().trim().min(2, "Enter their name").max(80),
    phone: optionalText(30),
    gender: z.enum(guardianGenders).nullable(),
    emergencyContactName: optionalText(80),
    emergencyContactPhone: optionalText(30),
    emergencyContactRelationship: optionalText(40),
  }),
  async ({ id, name, phone, ...rest }, { user, db }) => {
    requireAdmin(user);
    const [row] = await db
      .select({ guardian: guardians, user: users })
      .from(guardians)
      .innerJoin(users, eq(users.id, guardians.userId))
      .where(eq(guardians.id, id));
    if (!row) throw new ActionError("That guardian no longer exists.");
    const changed = { ...diff(row.user, { name, phone }), ...diff(row.guardian, rest) };
    if (Object.keys(changed).length === 0) return;
    await db.update(users).set({ name, phone }).where(eq(users.id, row.user.id));
    await db.update(guardians).set(rest).where(eq(guardians.id, id));
    await audit(db, {
      actorUserId: user.id,
      action: "guardian.update_contact",
      entityType: "guardian",
      entityId: id,
      changes: changed,
    });
    revalidatePath(`/admin/guardians/${id}`);
    revalidatePath("/admin/students");
  },
);

export const updateGuardianSensitive = action(
  z.object({
    id: z.number().int(),
    addressLine1: optionalText(120),
    addressLine2: optionalText(120),
    city: optionalText(60),
    postalCode: optionalText(12),
    ethnicity: optionalText(60),
    spokenLanguages: z.array(z.string().trim().min(1).max(40)).max(10),
    registrationReasons: z.array(z.enum(registrationReasons)),
    registrationReasonOther: optionalText(200),
  }),
  async ({ id, ...input }, { user, db }) => {
    requireAdmin(user);
    const before = await db.query.guardians.findFirst({ where: eq(guardians.id, id) });
    if (!before) throw new ActionError("That guardian no longer exists.");
    const details = {
      ...input,
      postalCode: input.postalCode?.toUpperCase() ?? null,
      area: input.postalCode ? routingKey(input.postalCode) : null,
      registrationReasonOther: input.registrationReasons.includes("other")
        ? input.registrationReasonOther
        : null,
    };
    const flat = (g: typeof details | typeof before) => ({
      ...g,
      spokenLanguages: JSON.stringify(g.spokenLanguages),
      registrationReasons: JSON.stringify(g.registrationReasons),
    });
    const changed = diff(flat(before), flat(details));
    if (Object.keys(changed).length === 0) return;
    await db.update(guardians).set(details).where(eq(guardians.id, id));
    await audit(db, {
      actorUserId: user.id,
      action: "guardian.update_sensitive",
      entityType: "guardian",
      entityId: id,
      changes: changed,
    });
    revalidatePath(`/admin/guardians/${id}`);
    revalidatePath("/admin/students");
  },
);
