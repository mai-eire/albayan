"use server";

import { and, eq, like } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/access";
import { action, ActionError } from "@/lib/actions";
import { appUrl } from "@/lib/app-url";
import { audit } from "@/lib/audit";
import { auth } from "@/lib/auth";
import type { Db } from "@/lib/db";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { teachers, users, verifications } from "@/lib/db/schema";
import { sendInvite } from "@/lib/email";
import { createInvite } from "@/lib/invites";
import { todayIn } from "@/lib/time";

const inviteSchema = z
  .object({
    name: z.string().trim().min(2, "Enter their name").max(80),
    email: z.string().trim().toLowerCase().email("Enter a valid email address"),
    phone: z.string().trim().max(30).optional(),
    teacher: z.boolean(),
    admin: z.boolean(),
  })
  .refine((v) => v.teacher || v.admin, { path: ["teacher"], message: "Pick at least one role" });

export type InviteInput = z.input<typeof inviteSchema>;

const roleLabel = (teacher: boolean, admin: boolean) =>
  teacher && admin ? "teacher and admin" : admin ? "admin" : "teacher";

async function emailInvite(
  db: Db,
  user: { id: number; name: string; email: string },
  role: string,
) {
  const token = await createInvite(await auth(), user.id);
  const [url, { name }] = await Promise.all([appUrl(`/invite/${token}`), getSchoolSettings()]);
  await sendInvite({ email: user.email, name: user.name }, url, role, name);
}

// A new person gets a user row with no password and an invite link. Someone who already
// has an account (a parent becoming a teacher, say) just gains the role — no email, since
// they already sign in. Returns what happened so the form can say it.
export const inviteStaff = action(inviteSchema, async (input, { user, db }) => {
  requireAdmin(user);
  const role = roleLabel(input.teacher, input.admin);
  const existing = await db.query.users.findFirst({
    columns: { id: true, name: true, email: true, isAdmin: true, status: true },
    where: eq(users.email, input.email),
  });
  const existingTeacher = existing
    ? await db.query.teachers.findFirst({ where: eq(teachers.userId, existing.id) })
    : null;

  if (existing) {
    if (input.admin && existing.isAdmin && (!input.teacher || existingTeacher)) {
      throw new ActionError(`${existing.name} is already ${role}.`);
    }
    if (input.teacher && existingTeacher && !input.admin) {
      throw new ActionError(`${existing.name} is already a teacher.`);
    }
    if (input.teacher && !existingTeacher)
      await db.insert(teachers).values({ userId: existing.id });
    if (input.admin && !existing.isAdmin) {
      await db.update(users).set({ isAdmin: true }).where(eq(users.id, existing.id));
    }
    await audit(db, {
      actorUserId: user.id,
      action: "staff.add_role",
      entityType: "user",
      entityId: existing.id,
      changes: { role: [null, role] },
    });
    const invited = existing.status === "invited";
    if (invited) await emailInvite(db, existing, role);
    revalidatePath("/admin/staff");
    return { outcome: invited ? "resent" : "added", name: existing.name } as const;
  }

  const [created] = await db
    .insert(users)
    .values({
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      isAdmin: input.admin,
      status: "invited",
    })
    .returning({ id: users.id, name: users.name, email: users.email });
  if (input.teacher) await db.insert(teachers).values({ userId: created.id });
  await audit(db, {
    actorUserId: user.id,
    action: "staff.invite",
    entityType: "user",
    entityId: created.id,
    changes: { created: [null, { name: input.name, email: input.email, role }] },
  });
  await emailInvite(db, created, role);
  revalidatePath("/admin/staff");
  return { outcome: "invited", name: created.name } as const;
});

export const resendInvite = action(z.object({ userId: z.number().int() }), async (input, ctx) => {
  requireAdmin(ctx.user);
  const target = await ctx.db.query.users.findFirst({
    columns: { id: true, name: true, email: true, isAdmin: true, status: true },
    where: eq(users.id, input.userId),
  });
  if (!target || target.status !== "invited") {
    throw new ActionError("That person has already set up their account.");
  }
  const teacher = await ctx.db.query.teachers.findFirst({ where: eq(teachers.userId, target.id) });
  await emailInvite(ctx.db, target, roleLabel(!!teacher, target.isAdmin));
  await audit(ctx.db, {
    actorUserId: ctx.user.id,
    action: "staff.resend_invite",
    entityType: "user",
    entityId: target.id,
  });
});

export const setTeacherActive = action(
  z.object({ teacherId: z.number().int(), isActive: z.boolean() }),
  async (input, { user, db }) => {
    requireAdmin(user);
    const { timezone } = await getSchoolSettings();
    const deactivatedAt = input.isActive ? null : todayIn(timezone);
    await db
      .update(teachers)
      .set({ isActive: input.isActive, deactivatedAt })
      .where(eq(teachers.id, input.teacherId));
    await audit(db, {
      actorUserId: user.id,
      action: input.isActive ? "teacher.activate" : "teacher.deactivate",
      entityType: "teacher",
      entityId: input.teacherId,
      changes: { deactivatedAt },
    });
    revalidatePath("/admin/staff");
  },
);

// An invite nobody accepted leaves nothing behind, so it can go. Anyone who has signed in
// stays (their registers and notes point at them) and is deactivated instead.
export const deleteInvite = action(
  z.object({ userId: z.number().int() }),
  async (input, { user, db }) => {
    requireAdmin(user);
    const target = await db.query.users.findFirst({
      columns: { id: true, name: true, email: true, status: true },
      where: eq(users.id, input.userId),
    });
    if (!target || target.status !== "invited") {
      throw new ActionError("That person has already set up their account.");
    }
    await db.delete(teachers).where(eq(teachers.userId, target.id));
    await db
      .delete(verifications)
      .where(
        and(like(verifications.identifier, "invite:%"), eq(verifications.value, String(target.id))),
      );
    await db.delete(users).where(eq(users.id, target.id));
    await audit(db, {
      actorUserId: user.id,
      action: "staff.delete_invite",
      entityType: "user",
      entityId: target.id,
      changes: { name: target.name, email: target.email },
    });
    revalidatePath("/admin/staff");
  },
);

export const setAdmin = action(
  z.object({ userId: z.number().int(), isAdmin: z.boolean() }),
  async (input, { user, db }) => {
    requireAdmin(user);
    // Only another admin can revoke, so the school always keeps at least one.
    if (!input.isAdmin && input.userId === user.id) {
      throw new ActionError("You can't remove your own admin access.");
    }
    await db.update(users).set({ isAdmin: input.isAdmin }).where(eq(users.id, input.userId));
    await audit(db, {
      actorUserId: user.id,
      action: input.isAdmin ? "admin.grant" : "admin.revoke",
      entityType: "user",
      entityId: input.userId,
    });
    revalidatePath("/admin/staff");
  },
);
