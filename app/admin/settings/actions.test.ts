import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Db } from "@/lib/db";
import { auditLog, schoolSettings, users } from "@/lib/db/schema";
import type { CurrentUser } from "@/lib/current-user";
import { testDb } from "@/test/db";

let db: Db;
let dispose: () => Promise<void>;
let current: CurrentUser | null = null;

vi.mock("@/lib/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/db")>()),
  db: async () => db,
}));
vi.mock("@/lib/current-user", () => ({ getCurrentUser: async () => current }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

// The bucket stands in for R2: the action checks what was actually stored rather than
// trusting the browser, and deletes the image it replaces.
const stored = new Map<string, { size: number; contentType: string }>();
const deleted: string[] = [];
vi.mock("@/lib/storage/bucket", () => ({
  fileFacts: async (key: string) => stored.get(key) ?? null,
  deleteFile: async (key: string) => {
    deleted.push(key);
  },
}));

const { updateSchoolLogo, updateSchoolSettings } = await import("./actions");

const base = {
  name: "X",
  email: "x@example.com",
  phone: null,
  emailVerified: true,
  emailNotifications: true,
  mustChangePassword: false,
  guardian: null,
  teacher: null,
  student: null,
};
const admin: CurrentUser = { ...base, id: 1, isAdmin: true, areas: ["admin"] };
const teacher: CurrentUser = {
  ...base,
  id: 2,
  isAdmin: false,
  teacher: { id: 1, isActive: true },
  areas: ["teacher"],
};

const valid = {
  name: "Al-Bayan School",
  timezone: "Europe/Dublin",
  studentIdPrefix: "alb",
  bankAccountName: "",
  bankIban: "ie29 aibk 9311 5212 3456 78",
  bankBic: "",
  absenceEmails: true,
};

beforeAll(async () => {
  ({ db, dispose } = await testDb());
  await db.insert(users).values([
    { id: 1, name: "Admin", email: "a@example.com", isAdmin: true },
    { id: 2, name: "Teacher", email: "t@example.com" },
  ]);
});
afterAll(() => dispose());

describe("updateSchoolSettings", () => {
  it("rejects anonymous callers", async () => {
    current = null;
    expect(await updateSchoolSettings(valid)).toMatchObject({ ok: false, error: /Sign in/ });
  });

  it("returns field errors on invalid input", async () => {
    current = admin;
    const result = await updateSchoolSettings({ ...valid, name: "", studentIdPrefix: "A1" });
    expect(result).toMatchObject({
      ok: false,
      fieldErrors: { name: "Enter the school's name", studentIdPrefix: "2 to 5 letters, e.g. ALB" },
    });
    expect(await db.select().from(schoolSettings)).toHaveLength(0);
  });

  it("denies non-admins", async () => {
    current = teacher;
    expect(await updateSchoolSettings(valid)).toMatchObject({ ok: false, error: /access/ });
    expect(await db.select().from(schoolSettings)).toHaveLength(0);
  });

  it("writes the row, normalises fields and audits the change", async () => {
    current = admin;
    expect(await updateSchoolSettings(valid)).toEqual({ ok: true, data: undefined });
    const [row] = await db.select().from(schoolSettings);
    expect(row).toMatchObject({
      id: 1,
      studentIdPrefix: "ALB",
      bankIban: "IE29AIBK93115212345678",
      bankAccountName: null,
      absenceEmails: true,
    });

    expect(await updateSchoolSettings({ ...valid, name: "Al-Bayan" })).toMatchObject({ ok: true });
    const entries = await db.select().from(auditLog);
    expect(entries).toHaveLength(2);
    expect(entries[1]).toMatchObject({
      actorUserId: 1,
      action: "school_settings.update",
      entityId: "1",
      changes: { name: ["Al-Bayan School", "Al-Bayan"] },
    });
  });
});

describe("updateSchoolLogo", () => {
  it("takes an image, records the key and audits it", async () => {
    current = admin;
    stored.set("uploads/a/logo.png", { size: 40_000, contentType: "image/png" });
    expect(await updateSchoolLogo({ storageKey: "uploads/a/logo.png" })).toMatchObject({
      ok: true,
    });
    const [row] = await db.select().from(schoolSettings);
    expect(row.logoKey).toBe("uploads/a/logo.png");
    const [entry] = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, "school_settings.set_logo"));
    expect(entry.changes).toMatchObject({ logoKey: [null, "uploads/a/logo.png"] });
  });

  it("throws away the one it replaces, and the file when the logo is removed", async () => {
    current = admin;
    stored.set("uploads/b/new.svg", { size: 9_000, contentType: "image/svg+xml" });
    expect(await updateSchoolLogo({ storageKey: "uploads/b/new.svg" })).toMatchObject({ ok: true });
    expect(deleted).toContain("uploads/a/logo.png");

    expect(await updateSchoolLogo({ storageKey: null })).toMatchObject({ ok: true });
    const [row] = await db.select().from(schoolSettings);
    expect(row.logoKey).toBeNull();
    expect(deleted).toContain("uploads/b/new.svg");
  });

  it("refuses anything that isn't a small image, and non-admins", async () => {
    current = admin;
    stored.set("uploads/c/prospectus.pdf", { size: 1_000, contentType: "application/pdf" });
    stored.set("uploads/c/huge.png", { size: 5 * 1024 * 1024, contentType: "image/png" });
    expect(await updateSchoolLogo({ storageKey: "uploads/c/prospectus.pdf" })).toMatchObject({
      ok: false,
      error: /PNG, JPEG, WebP or SVG/,
    });
    expect(await updateSchoolLogo({ storageKey: "uploads/c/huge.png" })).toMatchObject({
      ok: false,
      error: /up to 2 MB/,
    });
    expect(await updateSchoolLogo({ storageKey: "uploads/c/never-arrived.png" })).toMatchObject({
      ok: false,
      error: /didn't arrive/,
    });

    current = teacher;
    expect(await updateSchoolLogo({ storageKey: "uploads/c/huge.png" })).toMatchObject({
      ok: false,
      error: /access/,
    });
    const [row] = await db.select().from(schoolSettings);
    expect(row.logoKey).toBeNull();
  });
});
