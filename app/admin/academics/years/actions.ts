"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/access";
import { yearIdFor } from "@/lib/academics";
import { action, ActionError } from "@/lib/actions";
import { audit, diff } from "@/lib/audit";
import type { Db } from "@/lib/db";
import { academicYears, terms } from "@/lib/db/schema";
import { eurosToCents } from "@/lib/money";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date");

const euros = z
  .string()
  .trim()
  .transform((v, ctx) => {
    try {
      const cents = eurosToCents(v || "0");
      if (cents < 0) throw new Error();
      return cents;
    } catch {
      ctx.addIssue({ code: "custom", message: "Enter an amount like 250 or 250.50" });
      return z.NEVER;
    }
  });

const yearSchema = z
  .object({ startDate: isoDate, endDate: isoDate, standardFee: euros, isCurrent: z.boolean() })
  .refine((v) => v.endDate > v.startDate, {
    path: ["endDate"],
    message: "The end date must be after the start",
  });

export type YearInput = z.input<typeof yearSchema>;

export const createYear = action(yearSchema, async (input, { user, db }) => {
  requireAdmin(user);
  const id = yearIdFor(input.startDate);
  if (await db.query.academicYears.findFirst({ where: eq(academicYears.id, id) })) {
    throw new ActionError(`${id} already exists.`);
  }
  if (input.isCurrent) await db.update(academicYears).set({ isCurrent: false });
  await db.insert(academicYears).values({
    id,
    startDate: input.startDate,
    endDate: input.endDate,
    standardFeeCents: input.standardFee,
    isCurrent: input.isCurrent,
  });
  await audit(db, {
    actorUserId: user.id,
    action: "academic_year.create",
    entityType: "academic_year",
    entityId: id,
    changes: { created: [null, input] },
  });
  revalidatePath("/admin/academics");
  return { id };
});

export const updateYear = action(
  yearSchema.safeExtend({ id: z.string() }),
  async ({ id, ...input }, { user, db }) => {
    requireAdmin(user);
    const before = await db.query.academicYears.findFirst({ where: eq(academicYears.id, id) });
    if (!before) throw new ActionError("That year no longer exists.");
    const values = {
      startDate: input.startDate,
      endDate: input.endDate,
      standardFeeCents: input.standardFee,
      isCurrent: input.isCurrent,
    };
    if (input.isCurrent)
      await db.update(academicYears).set({ isCurrent: false }).where(ne(academicYears.id, id));
    await db.update(academicYears).set(values).where(eq(academicYears.id, id));
    await audit(db, {
      actorUserId: user.id,
      action: "academic_year.update",
      entityType: "academic_year",
      entityId: id,
      changes: diff(before, values),
    });
    revalidatePath("/admin/academics");
    return;
  },
);

const termSchema = z
  .object({
    academicYearId: z.string(),
    name: z.string().trim().min(1, "Give the term a name").max(40),
    startDate: isoDate,
    endDate: isoDate,
  })
  .refine((v) => v.endDate > v.startDate, {
    path: ["endDate"],
    message: "The end date must be after the start",
  });

export type TermInput = z.input<typeof termSchema>;

async function termProblems(db: Db, input: z.output<typeof termSchema>, exceptId?: number) {
  const year = await db.query.academicYears.findFirst({
    where: eq(academicYears.id, input.academicYearId),
  });
  if (!year) return "That year no longer exists.";
  if (input.startDate < year.startDate || input.endDate > year.endDate)
    return `Terms must fall within ${year.id} (${year.startDate} to ${year.endDate}).`;
  const others = await db
    .select()
    .from(terms)
    .where(
      and(
        eq(terms.academicYearId, input.academicYearId),
        exceptId ? ne(terms.id, exceptId) : undefined,
      ),
    );
  const clash = others.find((t) => input.startDate <= t.endDate && input.endDate >= t.startDate);
  return clash ? `Overlaps ${clash.name} (${clash.startDate} to ${clash.endDate}).` : null;
}

export const createTerm = action(termSchema, async (input, { user, db }) => {
  requireAdmin(user);
  const problem = await termProblems(db, input);
  if (problem) throw new ActionError(problem);
  const [term] = await db.insert(terms).values(input).returning({ id: terms.id });
  await audit(db, {
    actorUserId: user.id,
    action: "term.create",
    entityType: "term",
    entityId: term.id,
    changes: { created: [null, input] },
  });
  revalidatePath("/admin/academics");
  return;
});

export const updateTerm = action(
  termSchema.safeExtend({ id: z.number() }),
  async ({ id, ...input }, { user, db }) => {
    requireAdmin(user);
    const before = await db.query.terms.findFirst({ where: eq(terms.id, id) });
    if (!before) throw new ActionError("That term no longer exists.");
    const problem = await termProblems(db, input, id);
    if (problem) throw new ActionError(problem);
    await db.update(terms).set(input).where(eq(terms.id, id));
    await audit(db, {
      actorUserId: user.id,
      action: "term.update",
      entityType: "term",
      entityId: id,
      changes: diff(before, input),
    });
    revalidatePath("/admin/academics");
    return;
  },
);

export const deleteTerm = action(z.object({ id: z.number() }), async ({ id }, { user, db }) => {
  requireAdmin(user);
  const before = await db.query.terms.findFirst({ where: eq(terms.id, id) });
  if (!before) return;
  await db.delete(terms).where(eq(terms.id, id));
  await audit(db, {
    actorUserId: user.id,
    action: "term.delete",
    entityType: "term",
    entityId: id,
    changes: { deleted: [before, null] },
  });
  revalidatePath("/admin/academics");
  return;
});
