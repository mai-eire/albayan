"use server";

import { clock } from "@/lib/clock";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireGuardian } from "@/lib/access";
import { action, ActionError } from "@/lib/actions";
import { ageOn } from "@/lib/age";
import { audit } from "@/lib/audit";
import { classes, guardians, schoolSessions, studentGuardians, students } from "@/lib/db/schema";
import { routingKey } from "@/lib/demographics";
import { todayIn } from "@/lib/time";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { applicationSchema } from "./schema";

// Updates the guardian's own details (they change rarely and the wizard is where they are
// asked), then files the child as an applied student linked to this guardian.
export const submitApplication = action(applicationSchema, async (input, { user, db }) => {
  const guardian = requireGuardian(user);
  if (!user.emailVerified) throw new ActionError("Confirm your email address first.");

  const { timezone } = await getSchoolSettings();
  const today = todayIn(timezone, await clock());
  const age = ageOn(input.dateOfBirth, today);
  if (input.dateOfBirth > today || age > 18) {
    throw new ActionError("Check the date of birth — we take children up to 18.");
  }

  const session = await db.query.schoolSessions.findFirst({
    where: and(eq(schoolSessions.id, input.preferredSessionId), eq(schoolSessions.isActive, true)),
  });
  if (!session) throw new ActionError("That day is no longer available. Choose another.");
  if (input.preferredClassId !== null) {
    const cls = await db.query.classes.findFirst({
      where: and(eq(classes.id, input.preferredClassId), eq(classes.sessionId, session.id)),
    });
    if (!cls) throw new ActionError("That class isn't on the day you chose.");
  }

  await db
    .update(guardians)
    .set({
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2,
      city: input.city,
      postalCode: input.postalCode.toUpperCase(),
      area: routingKey(input.postalCode),
      emergencyContactName: input.emergencyContactName,
      emergencyContactPhone: input.emergencyContactPhone,
      emergencyContactRelationship: input.emergencyContactRelationship,
      spokenLanguages: input.spokenLanguages,
      ethnicity: input.guardianEthnicity,
      registrationReasons: input.registrationReasons,
      registrationReasonOther: input.registrationReasons.includes("other")
        ? input.registrationReasonOther
        : null,
    })
    .where(eq(guardians.id, guardian.id));

  const [student] = await db
    .insert(students)
    .values({
      firstName: input.firstName,
      lastName: input.lastName,
      gender: input.gender,
      dateOfBirth: input.dateOfBirth,
      ethnicity: input.childEthnicity,
      schoolYearGroup: input.schoolYearGroup,
      arabicProficiency: input.arabicProficiency,
      allergies: input.allergies,
      medicalNotes: input.medicalNotes,
      applicationNotes: input.applicationNotes,
      status: "applied",
      preferredSessionId: session.id,
      preferredClassId: input.preferredClassId,
      appliedAt: new Date().toISOString(),
      createdByGuardianId: guardian.id,
    })
    .returning({ id: students.id });
  await db.insert(studentGuardians).values({
    studentId: student.id,
    guardianId: guardian.id,
    relationship: input.relationship,
    isPrimaryContact: true,
  });
  await audit(db, {
    actorUserId: user.id,
    action: "student.apply",
    entityType: "student",
    entityId: student.id,
    changes: { created: [null, { firstName: input.firstName, preferredSessionId: session.id }] },
  });
  revalidatePath("/family");
  // The nav carries the pending count, so the whole area is revalidated.
  revalidatePath("/admin", "layout");
  return { id: student.id };
});
