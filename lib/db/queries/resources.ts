import { and, desc, eq, inArray, isNotNull, or } from "drizzle-orm";
import type { ResourceFacts } from "@/lib/access";
import { db } from "@/lib/db";
import { classes, homework, resources, subjects, users } from "@/lib/db/schema";

export type ResourceRow = {
  id: number;
  title: string;
  description: string | null;
  kind: "file" | "link";
  storageKey: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  url: string | null;
  audience: (typeof resources.$inferSelect)["audience"];
  isSchoolWide: boolean;
  classId: number | null;
  className: string | null;
  subjectId: string | null;
  subjectName: string | null;
  homeworkId: number | null;
  homeworkTitle: string | null;
  studentId: number | null;
  uploadedByUserId: number;
  uploadedByName: string;
  createdAt: string;
};

const shape = {
  id: resources.id,
  title: resources.title,
  description: resources.description,
  kind: resources.kind,
  storageKey: resources.storageKey,
  mimeType: resources.mimeType,
  sizeBytes: resources.sizeBytes,
  url: resources.url,
  audience: resources.audience,
  isSchoolWide: resources.isSchoolWide,
  classId: resources.classId,
  className: classes.name,
  subjectId: resources.subjectId,
  subjectName: subjects.name,
  homeworkId: resources.homeworkId,
  homeworkTitle: homework.title,
  studentId: resources.studentId,
  uploadedByUserId: resources.uploadedByUserId,
  uploadedByName: users.name,
  createdAt: resources.createdAt,
};

function base(d: Awaited<ReturnType<typeof db>>) {
  return d
    .select(shape)
    .from(resources)
    .leftJoin(classes, eq(classes.id, resources.classId))
    .leftJoin(subjects, eq(subjects.id, resources.subjectId))
    .leftJoin(homework, eq(homework.id, resources.homeworkId))
    .innerJoin(users, eq(users.id, resources.uploadedByUserId))
    .orderBy(desc(resources.createdAt), desc(resources.id));
}

export async function listSchoolWideResources(): Promise<ResourceRow[]> {
  return base(await db()).where(eq(resources.isSchoolWide, true));
}

export async function listResourcesUploadedBy(userId: number): Promise<ResourceRow[]> {
  return base(await db()).where(eq(resources.uploadedByUserId, userId));
}

// A class's resources: attached to the class itself or to any of its homework.
export async function listResourcesForClass(classId: number): Promise<ResourceRow[]> {
  const d = await db();
  return base(d).where(
    or(
      eq(resources.classId, classId),
      inArray(
        resources.homeworkId,
        d.select({ id: homework.id }).from(homework).where(eq(homework.classId, classId)),
      ),
    ),
  );
}

export async function listResourcesForHomework(homeworkIds: number[]): Promise<ResourceRow[]> {
  if (!homeworkIds.length) return [];
  return base(await db()).where(inArray(resources.homeworkId, homeworkIds));
}

export async function listResourcesForStudent(studentId: number): Promise<ResourceRow[]> {
  return base(await db()).where(eq(resources.studentId, studentId));
}

export async function getResource(id: number): Promise<ResourceRow | null> {
  const [row] = await base(await db()).where(eq(resources.id, id));
  return row ?? null;
}

// The access facts for a stored file, for the download route. A homework resource is
// checked as its class.
export async function getResourceFactsByKey(
  storageKey: string,
): Promise<(ResourceFacts & { id: number; uploadedByUserId: number }) | null> {
  const d = await db();
  const [row] = await d
    .select({
      id: resources.id,
      audience: resources.audience,
      isSchoolWide: resources.isSchoolWide,
      classId: resources.classId,
      homeworkClassId: homework.classId,
      studentId: resources.studentId,
      uploadedByUserId: resources.uploadedByUserId,
    })
    .from(resources)
    .leftJoin(homework, eq(homework.id, resources.homeworkId))
    .where(and(eq(resources.storageKey, storageKey), isNotNull(resources.storageKey)));
  if (!row) return null;
  return {
    id: row.id,
    audience: row.audience,
    isSchoolWide: row.isSchoolWide,
    classId: row.classId ?? row.homeworkClassId,
    studentId: row.studentId,
    uploadedByUserId: row.uploadedByUserId,
  };
}

// What one child's family (or the child) may open: school-wide, their class's (including
// homework attachments) and anything shared with them alone, filtered by audience.
export async function listResourcesForChild(
  studentId: number,
  classId: number | null,
  viewer: "guardian" | "student",
): Promise<ResourceRow[]> {
  const d = await db();
  const audiences =
    viewer === "guardian"
      ? (["students_and_guardians", "guardians_only"] as const)
      : (["students_and_guardians"] as const);
  const targets = [eq(resources.isSchoolWide, true), eq(resources.studentId, studentId)];
  if (classId !== null) {
    targets.push(
      eq(resources.classId, classId),
      inArray(
        resources.homeworkId,
        d.select({ id: homework.id }).from(homework).where(eq(homework.classId, classId)),
      ),
    );
  }
  return base(d).where(and(inArray(resources.audience, [...audiences]), or(...targets)));
}
