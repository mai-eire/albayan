import { describe, expect, it } from "vitest";
import { feeAccounts, feeStatus, outstandingCents } from "./fees";

describe("feeStatus", () => {
  it("derives the four states", () => {
    expect(feeStatus(0, 0)).toBe("waived");
    expect(feeStatus(25000, 0)).toBe("unpaid");
    expect(feeStatus(25000, 10000)).toBe("part_paid");
    expect(feeStatus(25000, 25000)).toBe("paid");
    expect(feeStatus(25000, 30000)).toBe("paid");
  });
});

describe("feeAccounts", () => {
  const active = (id: number, studentId: number, feeCents: number, startDate = "2026-09-05") =>
    ({ id, studentId, feeCents, status: "active" as const, startDate }) as const;

  it("makes one account per student with the balance", () => {
    const accounts = feeAccounts(
      [active(1, 1, 25000), active(2, 2, 20000), active(3, 3, 0)],
      [
        { enrolmentId: 1, amountCents: 10000 },
        { enrolmentId: 1, amountCents: 5000 },
        { enrolmentId: 2, amountCents: 20000 },
      ],
    );
    expect(
      accounts.map((a) => [a.enrolment.studentId, a.paidCents, a.balanceCents, a.status]),
    ).toEqual([
      [1, 15000, 10000, "part_paid"],
      [2, 20000, 0, "paid"],
      [3, 0, 0, "waived"],
    ]);
  });

  it("follows a student across a class move: fee from the active place, payments from both", () => {
    const [account] = feeAccounts(
      [
        { id: 1, studentId: 1, feeCents: 25000, status: "left", startDate: "2026-09-05" },
        { id: 2, studentId: 1, feeCents: 20000, status: "active", startDate: "2026-10-01" },
      ],
      [
        { enrolmentId: 1, amountCents: 10000 },
        { enrolmentId: 2, amountCents: 5000 },
      ],
    );
    expect(account.enrolment.id).toBe(2);
    expect(account.feeCents).toBe(20000);
    expect(account.paidCents).toBe(15000);
    expect(account.balanceCents).toBe(5000);
  });

  it("uses the most recent place for a student who has left", () => {
    const [account] = feeAccounts(
      [
        { id: 1, studentId: 1, feeCents: 25000, status: "left", startDate: "2026-09-05" },
        { id: 2, studentId: 1, feeCents: 30000, status: "left", startDate: "2026-11-01" },
      ],
      [],
    );
    expect(account.enrolment.id).toBe(2);
    expect(account.status).toBe("unpaid");
  });

  it("shows an overpayment as a negative balance that counts as nothing outstanding", () => {
    const accounts = feeAccounts([active(1, 1, 20000)], [{ enrolmentId: 1, amountCents: 25000 }]);
    expect(accounts[0].balanceCents).toBe(-5000);
    expect(outstandingCents(accounts)).toBe(0);
  });
});

describe("outstandingCents", () => {
  it("sums only what is owed", () => {
    expect(
      outstandingCents([{ balanceCents: 10000 }, { balanceCents: -5000 }, { balanceCents: 0 }]),
    ).toBe(10000);
  });
});
