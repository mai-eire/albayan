import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { CurrentUser } from "@/lib/current-user";
import type { Db } from "@/lib/db";
import {
  academicYears,
  auditLog,
  classes,
  enrolments,
  guardians,
  payments,
  schoolSessions,
  studentGuardians,
  students,
  users,
} from "@/lib/db/schema";
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

const { recordPayment, updatePayment, deletePayment, updateEnrolmentFee } =
  await import("./actions");
const { feesOutstanding, listFeeAccounts, listFeesForStudent, listPaymentsForGuardian } =
  await import("@/lib/db/queries/fees");

const admin: CurrentUser = {
  id: 1,
  name: "Admin",
  email: "a@example.com",
  phone: null,
  isAdmin: true,
  emailVerified: true,
  emailNotifications: true,
  mustChangePassword: false,
  guardian: null,
  teacher: null,
  student: null,
  areas: ["admin"],
};

const payment = {
  amount: "100",
  method: "cash" as const,
  paidOn: "2026-10-03",
  paidByGuardianId: 1,
  reference: null,
  note: null,
};

beforeAll(async () => {
  ({ db, dispose } = await testDb());
  await db.insert(users).values([
    { id: 1, name: "Admin", email: "a@example.com", isAdmin: true },
    { id: 2, name: "Parent", email: "p@example.com" },
    { id: 3, name: "Other parent", email: "o@example.com" },
  ]);
  await db.insert(guardians).values([
    { id: 1, userId: 2 },
    { id: 2, userId: 3 },
  ]);
  await db.insert(academicYears).values({
    id: "2026-27",
    startDate: "2026-09-01",
    endDate: "2027-06-30",
    isCurrent: true,
  });
  await db.insert(schoolSessions).values({
    id: 1,
    academicYearId: "2026-27",
    name: "Saturday",
    dayOfWeek: 6,
    startTime: "10:00",
  });
  await db.insert(classes).values([
    { id: 1, academicYearId: "2026-27", sessionId: 1, name: "Level 1" },
    { id: 2, academicYearId: "2026-27", sessionId: 1, name: "Level 2" },
  ]);
  await db.insert(students).values([
    {
      id: 1,
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
      firstName: "Bilal",
      lastName: "B",
      gender: "male",
      dateOfBirth: "2016-01-01",
      status: "active",
      appliedAt: "2026-08-01T00:00:00Z",
      createdByGuardianId: 2,
    },
  ]);
  await db.insert(studentGuardians).values([
    { studentId: 1, guardianId: 1, relationship: "mother", isPrimaryContact: true },
    { studentId: 2, guardianId: 2, relationship: "father", isPrimaryContact: true },
  ]);
  await db.insert(enrolments).values([
    // Amira moved class: payments against the old place still count for her year.
    {
      id: 10,
      studentId: 1,
      classId: 1,
      startDate: "2026-09-05",
      endDate: "2026-09-20",
      status: "left",
      feeCents: 25000,
    },
    { id: 11, studentId: 1, classId: 2, startDate: "2026-09-20", feeCents: 25000 },
    { id: 12, studentId: 2, classId: 1, startDate: "2026-09-05", feeCents: 20000 },
  ]);
  await db.insert(payments).values({
    enrolmentId: 10,
    amountCents: 5000,
    paidOn: "2026-09-05",
    method: "cash",
    recordedByUserId: 1,
  });
});
afterAll(() => dispose());

describe("recordPayment", () => {
  it("is admin-only, needs an active place and a guardian of the child", async () => {
    current = { ...admin, isAdmin: false, areas: [] };
    expect(await recordPayment({ enrolmentId: 11, ...payment })).toMatchObject({
      ok: false,
      error: /access/,
    });
    current = admin;
    expect(await recordPayment({ enrolmentId: 10, ...payment })).toMatchObject({
      ok: false,
      error: /no longer/,
    });
    expect(await recordPayment({ enrolmentId: 11, ...payment, paidByGuardianId: 2 })).toMatchObject(
      { ok: false, error: /guardians/ },
    );
    expect(await recordPayment({ enrolmentId: 11, ...payment, amount: "0" })).toMatchObject({
      ok: false,
      fieldErrors: { amount: expect.stringMatching(/amount/) },
    });
  });

  it("records, audits and shows up in the balance", async () => {
    const result = await recordPayment({ enrolmentId: 11, ...payment, reference: "Receipt 12" });
    expect(result).toMatchObject({ ok: true, data: { studentId: 1 } });
    const [account] = await listFeeAccounts("2026-27");
    expect(account).toMatchObject({
      feeCents: 25000,
      paidCents: 15000,
      balanceCents: 10000,
      status: "part_paid",
    });
    expect(account.enrolment).toMatchObject({
      id: 11,
      className: "Level 2",
      guardianName: "Parent",
    });
    expect(await db.select().from(auditLog)).toEqual([
      expect.objectContaining({
        action: "payment.record",
        entityType: "payment",
        changes: expect.objectContaining({
          amountCents: 10000,
          method: "cash",
          reference: "Receipt 12",
          studentId: 1,
        }),
      }),
    ]);
  });
});

describe("updatePayment and deletePayment", () => {
  it("edits in place with before/after, deletes with the row", async () => {
    const [{ id }] = await db
      .select({ id: payments.id })
      .from(payments)
      .where(eq(payments.enrolmentId, 11));
    expect(await updatePayment({ id, ...payment, amount: "120", reference: "Receipt 12" })).toEqual(
      {
        ok: true,
        data: undefined,
      },
    );
    // Nothing changed: no audit row.
    await updatePayment({ id, ...payment, amount: "120", reference: "Receipt 12" });
    expect(await deletePayment({ id: 999 })).toMatchObject({ ok: false, error: /no longer/ });
    expect(await deletePayment({ id })).toEqual({ ok: true, data: undefined });

    const log = await db.select().from(auditLog).orderBy(auditLog.id);
    expect(log.slice(1)).toEqual([
      expect.objectContaining({
        action: "payment.update",
        entityId: String(id),
        changes: { amountCents: [10000, 12000], studentId: 1 },
      }),
      expect.objectContaining({
        action: "payment.delete",
        entityId: String(id),
        changes: expect.objectContaining({ amountCents: 12000, studentId: 1 }),
      }),
    ]);
    const [account] = await listFeeAccounts("2026-27");
    expect(account).toMatchObject({ paidCents: 5000, balanceCents: 20000 });
  });
});

describe("updateEnrolmentFee", () => {
  it("changes the fee and note on the active place and audits", async () => {
    expect(await updateEnrolmentFee({ enrolmentId: 10, fee: "200", feeNote: null })).toMatchObject({
      ok: false,
      error: /no longer/,
    });
    expect(
      await updateEnrolmentFee({ enrolmentId: 11, fee: "200", feeNote: "Sibling discount" }),
    ).toEqual({ ok: true, data: undefined });
    expect(await db.select().from(auditLog).orderBy(auditLog.id)).toContainEqual(
      expect.objectContaining({
        action: "enrolment.update_fee",
        entityType: "student",
        entityId: "1",
        changes: {
          feeCents: [25000, 20000],
          feeNote: [null, "Sibling discount"],
          enrolmentId: 11,
        },
      }),
    );
    const [account] = await listFeeAccounts("2026-27");
    expect(account).toMatchObject({ feeCents: 20000, paidCents: 5000, balanceCents: 15000 });
  });
});

describe("fee queries", () => {
  it("totals what is owed by family for the dashboard", async () => {
    expect(await feesOutstanding("2026-27")).toMatchObject({ totalCents: 35000, families: 2 });
    const { feesCents } = await feesOutstanding("2026-27");
    expect(feesCents).toBe(
      (await listFeeAccounts("2026-27")).reduce((sum, a) => sum + a.feeCents, 0),
    );
  });

  it("lists a student's years with their payments across places", async () => {
    const years = await listFeesForStudent(1);
    expect(years).toHaveLength(1);
    expect(years[0]).toMatchObject({
      feeCents: 20000,
      paidCents: 5000,
      status: "part_paid",
      enrolment: { id: 11, academicYearId: "2026-27", className: "Level 2" },
    });
    expect(years[0].payments.map((p) => p.enrolmentId)).toEqual([10]);
  });

  it("lists a family's payments and never another family's", async () => {
    expect((await listPaymentsForGuardian(1)).map((p) => p.studentName)).toEqual(["Amira A"]);
    expect(await listPaymentsForGuardian(2)).toEqual([]);
  });
});
