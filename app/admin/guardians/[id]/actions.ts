"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/access";
import { action, ActionError } from "@/lib/actions";
import { audit, diff } from "@/lib/audit";
import {
  genders,
  guardianGenders,
  guardians,
  registrationReasons,
  relationships,
  studentGuardians,
  students,
  users,
} from "@/lib/db/schema";
import { routingKey } from "@/lib/demographics";
import { optionalText } from "@/lib/fields";
import { addGuardianToChildren } from "@/lib/guardians";

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

// The office adds a guardian to one student, or a child to a guardian (an application on
// the family's behalf, ready to approve from the inbox).
export const addGuardianToStudent = action(
  z.object({
    name: z.string().trim().min(2, "Enter their name").max(80),
    email: z.string().trim().toLowerCase().email("Enter a valid email address"),
    phone: optionalText(30),
    gender: z.enum(guardianGenders).nullable(),
    relationship: z.enum(relationships, { message: "Say who they are to the child" }),
    studentIds: z.array(z.number().int()).length(1),
  }),
  async (input, { user, db }) => {
    requireAdmin(user);
    const result = await addGuardianToChildren(db, { id: user.id, name: user.name }, input);
    revalidatePath(`/admin/students/${input.studentIds[0]}`);
    revalidatePath("/admin/guardians");
    return result;
  },
);

export const addChildForGuardian = action(
  z.object({
    guardianId: z.number().int(),
    firstName: z.string().trim().min(1, "Enter their first name").max(60),
    lastName: z.string().trim().min(1, "Enter their surname").max(60),
    gender: z.enum(genders, { message: "Choose" }),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter their date of birth"),
    relationship: z.enum(relationships, { message: "Say who the guardian is to the child" }),
    preferredSessionId: z.number().int({ message: "Choose a session" }),
  }),
  async ({ guardianId, relationship, ...child }, { user, db }) => {
    requireAdmin(user);
    const guardian = await db.query.guardians.findFirst({ where: eq(guardians.id, guardianId) });
    if (!guardian) throw new ActionError("That guardian no longer exists.");
    const [student] = await db
      .insert(students)
      .values({
        ...child,
        status: "applied",
        appliedAt: new Date().toISOString(),
        createdByGuardianId: guardianId,
      })
      .returning({ id: students.id });
    await db.insert(studentGuardians).values({
      studentId: student.id,
      guardianId,
      relationship,
      isPrimaryContact: true,
    });
    await audit(db, {
      actorUserId: user.id,
      action: "application.create_by_admin",
      entityType: "student",
      entityId: student.id,
      changes: { guardianId, firstName: child.firstName, lastName: child.lastName },
    });
    revalidatePath(`/admin/guardians/${guardianId}`);
    revalidatePath("/admin/applications");
    return { studentId: student.id };
  },
);
