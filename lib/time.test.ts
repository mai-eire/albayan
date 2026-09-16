import { describe, expect, it } from "vitest";
import { dayOfWeekIn, formatDate, formatHijri, todayIn } from "./time";

const tz = "Europe/Dublin";

describe("time", () => {
  it("computes today in the school timezone, not UTC", () => {
    // 23:30 UTC on a Saturday is already Sunday in Dublin summer time.
    expect(todayIn(tz, new Date("2026-09-19T23:30:00Z"))).toBe("2026-09-20");
    expect(todayIn("UTC", new Date("2026-09-19T23:30:00Z"))).toBe("2026-09-19");
    expect(dayOfWeekIn(tz, new Date("2026-09-19T23:30:00Z"))).toBe(0);
    expect(dayOfWeekIn(tz, new Date("2026-09-19T12:00:00Z"))).toBe(6);
  });

  it("formats dates the way the copy rules say", () => {
    expect(formatDate("2026-09-19", tz)).toBe("Saturday 19 September");
    expect(formatDate("2026-09-19", tz, true)).toBe("Saturday 19 September 2026");
  });

  it("gives a Hijri date", () => {
    expect(formatHijri(new Date("2026-09-19T12:00:00Z"), tz)).toMatch(/\d+ .+ 14\d\d$/);
  });
});
