import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { CurrentUser } from "@/lib/current-user";
import type { Db } from "@/lib/db";
import {
  academicYears,
  classes,
  enrolments,
  guardians,
  resources,
  schoolSessions,
  studentGuardians,
  students,
  teachers,
  users,
} from "@/lib/db/schema";
import { testDb } from "@/test/db";

let db: Db;
let bucket: R2Bucket;
let dispose: () => Promise<void>;
let current: CurrentUser | null = null;

vi.mock("@/lib/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/db")>()),
  db: async () => db,
}));
vi.mock("@/lib/current-user", () => ({ getCurrentUser: async () => current }));
vi.mock("@/lib/storage/bucket", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/storage/bucket")>();
  return {
    ...mod,
    putFile: async (key: string, data: ArrayBuffer, contentType: string) => {
      await bucket.put(key, data, { httpMetadata: { contentType } });
    },
    getFile: async (key: string) => {
      const object = await bucket.get(key);
      if (!object) return null;
      return {
        key,
        size: object.size,
        contentType: object.httpMetadata?.contentType ?? "application/octet-stream",
        etag: object.httpEtag,
        body: object.body,
      };
    },
  };
});

const { POST } = await import("./route");
const { GET } = await import("./[...key]/route");

const base = {
  name: "X",
  email: "x@example.com",
  phone: null,
  isAdmin: false,
  emailVerified: true,
  emailNotifications: true,
  mustChangePassword: false,
  teacher: null,
  student: null,
};
const teacher: CurrentUser = {
  ...base,
  id: 2,
  guardian: null,
  teacher: { id: 1, isActive: true },
  areas: ["teacher"],
};
const level1Parent: CurrentUser = { ...base, id: 3, guardian: { id: 1 }, areas: ["family"] };
const level2Parent: CurrentUser = { ...base, id: 4, guardian: { id: 2 }, areas: ["family"] };
const pupil: CurrentUser = {
  ...base,
  id: 5,
  guardian: null,
  student: { id: 1, studentId: "ALB-26-0001", firstName: "Amira" },
  areas: ["student"],
};

beforeAll(async () => {
  ({ db, bucket, dispose } = await testDb());
  await db.insert(users).values([
    { id: 2, name: "Teacher", email: "t@example.com" },
    { id: 3, name: "Parent 1", email: "p1@example.com" },
    { id: 4, name: "Parent 2", email: "p2@example.com" },
    { id: 5, name: "Amira", email: "s@example.com" },
  ]);
  await db.insert(teachers).values({ id: 1, userId: 2 });
  await db.insert(guardians).values([
    { id: 1, userId: 3 },
    { id: 2, userId: 4 },
  ]);
  await db
    .insert(academicYears)
    .values({ id: "2026-27", startDate: "2026-09-01", endDate: "2027-06-30", isCurrent: true });
  await db.insert(schoolSessions).values({
    id: 1,
    academicYearId: "2026-27",
    name: "Saturday",
    dayOfWeek: 6,
    startTime: "10:00",
  });
  await db.insert(classes).values([
    { id: 1, academicYearId: "2026-27", sessionId: 1, name: "Level 1", classTeacherId: 1 },
    { id: 2, academicYearId: "2026-27", sessionId: 1, name: "Level 2" },
  ]);
  await db.insert(students).values([
    {
      id: 1,
      userId: 5,
      firstName: "Amira",
      lastName: "A",
      gender: "female",
      dateOfBirth: "2018-01-01",
      status: "active",
      appliedAt: "2026-08-01T00:00:00Z",
      createdByGuardianId: 1,
    },
    {
      id: 2,
      firstName: "Zayd",
      lastName: "B",
      gender: "male",
      dateOfBirth: "2018-01-01",
      status: "active",
      appliedAt: "2026-08-01T00:00:00Z",
      createdByGuardianId: 2,
    },
  ]);
  await db.insert(studentGuardians).values([
    { studentId: 1, guardianId: 1, relationship: "mother", isPrimaryContact: true },
    { studentId: 2, guardianId: 2, relationship: "mother", isPrimaryContact: true },
  ]);
  await db.insert(enrolments).values([
    { studentId: 1, classId: 1, startDate: "2026-09-05", feeCents: 0 },
    { studentId: 2, classId: 2, startDate: "2026-09-05", feeCents: 0 },
  ]);
});
afterAll(() => dispose());

async function upload(name: string, body: string) {
  const response = await POST(
    new Request("http://localhost/api/files", {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        "X-File-Name": name,
        "Content-Length": String(body.length),
      },
      body,
    }),
  );
  return { status: response.status, body: (await response.json()) as { key?: string } };
}

async function download(key: string) {
  const response = await GET(new Request(`http://localhost/api/files/${key}`), {
    params: Promise.resolve({ key: key.split("/") }),
  });
  return response.status;
}

describe("files through the Worker", () => {
  it("lets staff upload and keeps an unattached file admin-only", async () => {
    current = level1Parent;
    expect((await upload("a.txt", "hello")).status).toBe(403);
    current = teacher;
    const { status, body } = await upload("worksheet.txt", "hello");
    expect(status).toBe(201);
    expect(body.key).toMatch(/^uploads\/.+\/worksheet\.txt$/);
    expect(await download(body.key!)).toBe(403);
  });

  it("serves a class resource to that class's family and student, not to another family", async () => {
    current = teacher;
    const { body } = await upload("level1.txt", "for level 1");
    await db.insert(resources).values({
      title: "Level 1 sheet",
      kind: "file",
      storageKey: body.key!,
      uploadedByUserId: 2,
      classId: 1,
    });
    expect(await download(body.key!)).toBe(200);
    current = level1Parent;
    expect(await download(body.key!)).toBe(200);
    current = pupil;
    expect(await download(body.key!)).toBe(200);
    current = level2Parent;
    expect(await download(body.key!)).toBe(403);
    current = null;
    expect(await download(body.key!)).toBe(401);
  });

  it("honours the audience", async () => {
    current = teacher;
    const { body } = await upload("parents.txt", "for parents");
    await db.insert(resources).values({
      title: "Parents only",
      kind: "file",
      storageKey: body.key!,
      uploadedByUserId: 2,
      classId: 1,
      audience: "guardians_only",
    });
    current = level1Parent;
    expect(await download(body.key!)).toBe(200);
    current = pupil;
    expect(await download(body.key!)).toBe(403);
  });

  it("refuses files over the cap", async () => {
    current = teacher;
    const response = await POST(
      new Request("http://localhost/api/files", {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
          "X-File-Name": "big.txt",
          "Content-Length": String(26 * 1024 * 1024),
        },
        body: "x",
      }),
    );
    expect(response.status).toBe(413);
  });
});
