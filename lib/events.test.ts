import { describe, expect, it } from "vitest";
import { datesCovered, dateOf, isActivity, isUpcoming, timeOf, whenLabel } from "./events";

describe("the date and time convention", () => {
  it("reads a plain date as all day and a date and time as timed", () => {
    expect(dateOf("2026-10-31")).toBe("2026-10-31");
    expect(timeOf("2026-10-31")).toBeNull();
    expect(dateOf("2026-10-31T10:00")).toBe("2026-10-31");
    expect(timeOf("2026-10-31T10:00")).toBe("10:00");
  });

  it("keeps both forms in order as text, which is how the database sorts them", () => {
    const sorted = ["2026-11-01", "2026-10-31T10:00", "2026-10-31"].sort();
    expect(sorted).toEqual(["2026-10-31", "2026-10-31T10:00", "2026-11-01"]);
  });
});

describe("datesCovered", () => {
  it("marks every day a week-long holiday runs", () => {
    expect(datesCovered({ startAt: "2026-10-26", endAt: "2026-10-30" })).toEqual([
      "2026-10-26",
      "2026-10-27",
      "2026-10-28",
      "2026-10-29",
      "2026-10-30",
    ]);
  });

  it("is one day for a single date, times and all, and crosses a month end", () => {
    expect(datesCovered({ startAt: "2026-10-31T10:00", endAt: "2026-10-31T13:00" })).toEqual([
      "2026-10-31",
    ]);
    expect(datesCovered({ startAt: "2026-10-30", endAt: "2026-11-02" })).toHaveLength(4);
  });
});

describe("isUpcoming", () => {
  it("counts an entry running today as still to come", () => {
    const week = { startAt: "2026-10-26", endAt: "2026-10-30" };
    expect(isUpcoming(week, "2026-10-28")).toBe(true);
    expect(isUpcoming(week, "2026-10-30")).toBe(true);
    expect(isUpcoming(week, "2026-10-31")).toBe(false);
  });
});

describe("whenLabel", () => {
  const format = (d: string) => `[${d}]`;
  it("says a day, a day and a time, or a span", () => {
    expect(whenLabel({ startAt: "2026-10-31", endAt: "2026-10-31" }, format)).toBe("[2026-10-31]");
    expect(whenLabel({ startAt: "2026-10-31T10:00", endAt: "2026-10-31T13:00" }, format)).toBe(
      "[2026-10-31] · 10:00",
    );
    expect(whenLabel({ startAt: "2026-10-26", endAt: "2026-10-30" }, format)).toBe(
      "[2026-10-26] – [2026-10-30]",
    );
  });
});

describe("isActivity", () => {
  it("splits what the school announces from what a family may choose", () => {
    expect(isActivity("holiday")).toBe(false);
    expect(isActivity("exam")).toBe(false);
    expect(isActivity("parent_teacher_meeting")).toBe(false);
    expect(isActivity("trip")).toBe(true);
    expect(isActivity("summer_school")).toBe(true);
  });
});
