import { and, eq, inArray } from "drizzle-orm";
import { ActionError } from "./actions";
import { appUrl } from "./app-url";
import { audit } from "./audit";
import { auth } from "./auth";
import type { Db } from "./db";
import { getSchoolSettings } from "./db/queries/settings";
import {
  guardians,
  studentGuardians,
  students,
  users,
  type GuardianGender,
  type Relationship,
} from "./db/schema";
import { sendGuardianInvite } from "./email";
import { createInvite } from "./invites";
import { notify } from "./notify";

export type CoGuardianInput = {
  name: string;
  email: string;
  phone: string | null;
  gender: GuardianGender | null;
  relationship: Relationship;
  studentIds: number[];
};

// Links a person to children as their guardian — from a parent's account or the office.
// Someone new gets a user with no password and an invite email; someone who already has an
// account just gains the children and is told. Guardians link per child, so blended
// families work. Returns what happened so the form can say it.
export async function addGuardianToChildren(
  db: Db,
  actor: { id: number; name: string },
  input: CoGuardianInput,
) {
  const kids = await db
    .select({ id: students.id, firstName: students.firstName })
    .from(students)
    .where(inArray(students.id, input.studentIds.length ? input.studentIds : [-1]));
  if (kids.length !== input.studentIds.length) throw new ActionError("Pick at least one child.");

  const existing = await db.query.users.findFirst({
    columns: { id: true, name: true, email: true, status: true },
    where: eq(users.email, input.email),
  });
  let guardianId: number;
  let user: { id: number; name: string; email: string; status: string };
  if (existing) {
    user = existing;
    const row = await db.query.guardians.findFirst({ where: eq(guardians.userId, existing.id) });
    if (row) guardianId = row.id;
    else {
      const [created] = await db
        .insert(guardians)
        .values({ userId: existing.id, gender: input.gender })
        .returning({ id: guardians.id });
      guardianId = created.id;
    }
  } else {
    const [createdUser] = await db
      .insert(users)
      .values({ name: input.name, email: input.email, phone: input.phone, status: "invited" })
      .returning({ id: users.id, name: users.name, email: users.email, status: users.status });
    user = createdUser;
    const [created] = await db
      .insert(guardians)
      .values({ userId: createdUser.id, gender: input.gender })
      .returning({ id: guardians.id });
    guardianId = created.id;
  }

  const already = await db
    .select({ studentId: studentGuardians.studentId })
    .from(studentGuardians)
    .where(
      and(
        eq(studentGuardians.guardianId, guardianId),
        inArray(
          studentGuardians.studentId,
          kids.map((k) => k.id),
        ),
      ),
    );
  const linked = kids.filter((k) => !already.some((a) => a.studentId === k.id));
  if (linked.length === 0)
    throw new ActionError(
      `${user.name} is already a guardian of ${kids.length === 1 ? kids[0].firstName : "these children"}.`,
    );
  await db.insert(studentGuardians).values(
    linked.map((k) => ({
      studentId: k.id,
      guardianId,
      relationship: input.relationship,
      isPrimaryContact: false,
    })),
  );
  await audit(db, {
    actorUserId: actor.id,
    action: "guardian.add",
    entityType: "guardian",
    entityId: guardianId,
    changes: {
      studentIds: linked.map((k) => k.id),
      relationship: input.relationship,
      invited: !existing,
    },
  });

  const names = linked.map((k) => k.firstName);
  const { name: schoolName } = await getSchoolSettings();
  if (user.status === "invited") {
    const token = await createInvite(await auth(), user.id);
    const url = await appUrl(`/invite/${token}`);
    await sendGuardianInvite(
      { email: user.email, name: user.name },
      url,
      actor.name,
      names,
      schoolName,
    );
    return { outcome: "invited" as const, name: user.name, guardianId };
  }
  await notify(db, {
    userId: user.id,
    type: "guardian.added",
    title: `You've been added as a parent of ${names.join(" and ")}`,
    body: `${actor.name} added you. Their timetable, homework and attendance are in your family area.`,
    href: "/family",
  });
  return { outcome: "linked" as const, name: user.name, guardianId };
}
