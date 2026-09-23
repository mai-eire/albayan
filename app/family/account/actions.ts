"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { optionalText } from "@/lib/fields";
import { requireGuardian } from "@/lib/access";
import { action } from "@/lib/actions";
import { audit, diff } from "@/lib/audit";
import { guardianGenders, guardians, registrationReasons, users } from "@/lib/db/schema";
import { routingKey } from "@/lib/demographics";

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  phone: z.string().trim().min(6, "Enter a phone number we can reach you on").max(30),
  gender: z.enum(guardianGenders).nullable(),
  emailNotifications: z.boolean(),
  addressLine1: optionalText(120),
  addressLine2: optionalText(120),
  city: optionalText(60),
  postalCode: optionalText(12),
  emergencyContactName: optionalText(80),
  emergencyContactPhone: optionalText(30),
  emergencyContactRelationship: optionalText(40),
  countryOfOrigin: optionalText(60),
  spokenLanguages: z.array(z.string().trim().min(1).max(40)).max(10),
  registrationReasons: z.array(z.enum(registrationReasons)),
  registrationReasonOther: optionalText(200),
});

export type AccountInput = z.input<typeof schema>;

// A guardian's own details. Sensitive fields are theirs to change; edits are audited so
// the office can see when they moved.
export const updateAccount = action(schema, async (input, { user, db }) => {
  const guardian = requireGuardian(user);
  const { name, phone, emailNotifications, ...rest } = input;
  const details = {
    ...rest,
    postalCode: rest.postalCode?.toUpperCase() ?? null,
    area: rest.postalCode ? routingKey(rest.postalCode) : null,
    registrationReasonOther: rest.registrationReasons.includes("other")
      ? rest.registrationReasonOther
      : null,
  };
  const before = await db.query.guardians.findFirst({ where: eq(guardians.id, guardian.id) });
  await db.update(users).set({ name, phone, emailNotifications }).where(eq(users.id, user.id));
  await db.update(guardians).set(details).where(eq(guardians.id, guardian.id));
  const changed = before
    ? diff(
        {
          ...before,
          spokenLanguages: JSON.stringify(before.spokenLanguages),
          registrationReasons: JSON.stringify(before.registrationReasons),
        },
        {
          ...details,
          spokenLanguages: JSON.stringify(details.spokenLanguages),
          registrationReasons: JSON.stringify(details.registrationReasons),
        },
      )
    : {};
  if (Object.keys(changed).length) {
    await audit(db, {
      actorUserId: user.id,
      action: "guardian.update_self",
      entityType: "guardian",
      entityId: guardian.id,
      changes: changed,
    });
  }
  revalidatePath("/family");
});
