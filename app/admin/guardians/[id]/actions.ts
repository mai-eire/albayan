"use server";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/access";
import { action, ActionError } from "@/lib/actions";
import { audit, diff } from "@/lib/audit";
import {
  arabicProficiencies,
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

// The office invites a new guardian for one or more children (someone with that email
// already is just linked), or adds a child to a guardian — an application on the family's
// behalf, ready to approve from the inbox.
export const addGuardianToStudent = action(
  z.object({
    name: z.string().trim().min(2, "Enter their name").max(80),
    email: z.string().trim().toLowerCase().email("Enter a valid email address"),
    phone: optionalText(30),
    gender: z.enum(guardianGenders).nullable(),
    relationship: z.enum(relationships, { message: "Say who they are to the child" }),
    studentIds: z.array(z.number().int()).min(1, "Pick at least one child"),
  }),
  async (input, { user, db }) => {
    requireAdmin(user);
    const result = await addGuardianToChildren(db, { id: user.id, name: user.name }, input);
    for (const id of input.studentIds) revalidatePath(`/admin/students/${id}`);
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
    schoolYearGroup: optionalText(40),
    arabicProficiency: z.enum(arabicProficiencies),
    allergies: optionalText(500),
    medicalNotes: optionalText(1000),
    applicationNotes: optionalText(1000),
    relationship: z.enum(relationships, { message: "Say who the guardian is to the child" }),
    preferredSessionId: z.number().int({ message: "Choose a session" }),
    preferredClassId: z.number().int().nullable(),
    // The children's other guardians to put on this child too, with what they are to them.
    alsoGuardians: z
      .array(z.object({ id: z.number().int(), relationship: z.enum(relationships) }))
      .max(10)
      .default([]),
  }),
  async ({ guardianId, relationship, alsoGuardians, ...child }, { user, db }) => {
    requireAdmin(user);
    const guardian = await db.query.guardians.findFirst({ where: eq(guardians.id, guardianId) });
    if (!guardian) throw new ActionError("That guardian no longer exists.");
    const others = alsoGuardians.filter((g) => g.id !== guardianId);
    if (others.length) {
      const known = await db
        .select({ id: guardians.id })
        .from(guardians)
        .where(
          inArray(
            guardians.id,
            others.map((g) => g.id),
          ),
        );
      if (known.length !== others.length)
        throw new ActionError("One of the guardians no longer exists.");
    }
    const [student] = await db
      .insert(students)
      .values({
        ...child,
        status: "applied",
        appliedAt: new Date().toISOString(),
        createdByGuardianId: guardianId,
      })
      .returning({ id: students.id });
    await db.insert(studentGuardians).values([
      { studentId: student.id, guardianId, relationship, isPrimaryContact: true },
      ...others.map((g) => ({
        studentId: student.id,
        guardianId: g.id,
        relationship: g.relationship,
        isPrimaryContact: false,
      })),
    ]);
    await audit(db, {
      actorUserId: user.id,
      action: "application.create_by_admin",
      entityType: "student",
      entityId: student.id,
      changes: {
        guardianId,
        alsoGuardianIds: others.map((g) => g.id),
        firstName: child.firstName,
        lastName: child.lastName,
      },
    });
    revalidatePath(`/admin/guardians/${guardianId}`);
    revalidatePath("/admin/applications");
    return { studentId: student.id };
  },
);

// The office links a guardian who is already registered to more children — the other
// parent's existing account, say. Same outcome as inviting them, minus the invite.
export const linkExistingGuardian = action(
  z.object({
    guardianId: z.number().int(),
    relationship: z.enum(relationships, { message: "Say who they are to the children" }),
    studentIds: z.array(z.number().int()).min(1, "Pick at least one child"),
  }),
  async (input, { user, db }) => {
    requireAdmin(user);
    const [row] = await db
      .select({ guardian: guardians, user: users })
      .from(guardians)
      .innerJoin(users, eq(users.id, guardians.userId))
      .where(eq(guardians.id, input.guardianId));
    if (!row) throw new ActionError("That guardian no longer exists.");
    const result = await addGuardianToChildren(
      db,
      { id: user.id, name: user.name },
      {
        name: row.user.name,
        email: row.user.email,
        phone: row.user.phone,
        gender: row.guardian.gender,
        relationship: input.relationship,
        studentIds: input.studentIds,
      },
    );
    for (const id of input.studentIds) revalidatePath(`/admin/students/${id}`);
    revalidatePath(`/admin/guardians/${input.guardianId}`);
    revalidatePath("/admin/guardians");
    return result;
  },
);
