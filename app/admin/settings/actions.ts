"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/access";
import { action, ActionError } from "@/lib/actions";
import { audit, diff } from "@/lib/audit";
import { schoolSettings } from "@/lib/db/schema";
import { logoTypes, maxLogoBytes } from "@/lib/logo";
import { deleteFile, fileFacts } from "@/lib/storage/bucket";

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use at most ${max} characters`)
    .transform((v) => v || null)
    .nullable();

const schema = z.object({
  name: z.string().trim().min(1, "Enter the school's name").max(80, "Use at most 80 characters"),
  timezone: z.string().refine(
    (tz) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    },
    { message: "Choose a timezone from the list" },
  ),
  studentIdPrefix: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2,5}$/, "2 to 5 letters, e.g. ALB"),
  bankAccountName: optional(80),
  bankIban: optional(34).transform((v) => v?.replace(/\s+/g, "").toUpperCase() ?? null),
  bankBic: optional(11).transform((v) => v?.toUpperCase() ?? null),
  absenceEmails: z.boolean(),
});

export type SettingsInput = z.input<typeof schema>;

// The reference server action: parse → access → write → audit.
export const updateSchoolSettings = action(schema, async (input, { user, db }) => {
  requireAdmin(user);
  const before = await db.query.schoolSettings.findFirst();
  if (before) {
    await db.update(schoolSettings).set(input);
  } else {
    await db.insert(schoolSettings).values({ id: 1, ...input });
  }
  await audit(db, {
    actorUserId: user.id,
    action: "school_settings.update",
    entityType: "school_settings",
    entityId: 1,
    changes: before ? diff(before, input) : { created: [null, input] },
  });
  revalidatePath("/admin/settings");
});

// The logo is saved on its own, not with the rest of the form: it arrives as an upload
// (through /api/files, like every other file) and the action only records the key. What
// was actually stored is checked here rather than trusted from the browser, and the old
// image is deleted so the bucket doesn't fill with replaced logos.
export const updateSchoolLogo = action(
  z.object({ storageKey: z.string().trim().max(200).nullable() }),
  async ({ storageKey }, { user, db }) => {
    requireAdmin(user);
    if (storageKey) {
      const facts = await fileFacts(storageKey);
      if (!facts) throw new ActionError("That upload didn't arrive. Try again.");
      if (!logoTypes.includes(facts.contentType)) {
        throw new ActionError("Use a PNG, JPEG, WebP or SVG image.");
      }
      if (facts.size > maxLogoBytes) throw new ActionError("Logos can be up to 2 MB.");
    }
    const before = await db.query.schoolSettings.findFirst();
    if (before) await db.update(schoolSettings).set({ logoKey: storageKey });
    else await db.insert(schoolSettings).values({ id: 1, name: "Al-Bayan", logoKey: storageKey });
    if (before?.logoKey && before.logoKey !== storageKey) await deleteFile(before.logoKey);
    await audit(db, {
      actorUserId: user.id,
      action: storageKey ? "school_settings.set_logo" : "school_settings.clear_logo",
      entityType: "school_settings",
      entityId: 1,
      changes: { logoKey: [before?.logoKey ?? null, storageKey] },
    });
    // It sits in every layout and on the sign-in pages.
    revalidatePath("/", "layout");
  },
);
