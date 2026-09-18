import { describe, expect, it } from "vitest";
import { addMinutes, familyStart, forFamilies, sessionEndTime, timePeriods } from "./timetable";

const periods = [
  { subjectId: "quran", title: null, durationMinutes: 50 },
  { subjectId: "arabic", title: null, durationMinutes: 50 },
  { subjectId: null, title: "Break", durationMinutes: 20 },
  { subjectId: "islamic_studies", title: null, durationMinutes: 50 },
];

describe("timetable", () => {
  it("computes start and end times from the session start", () => {
    expect(timePeriods("10:00", periods).map((p) => `${p.startTime}-${p.endTime}`)).toEqual([
      "10:00-10:50",
      "10:50-11:40",
      "11:40-12:00",
      "12:00-12:50",
    ]);
    expect(sessionEndTime("10:00", periods)).toBe("12:50");
  });

  it("handles hour boundaries and an empty schedule", () => {
    expect(addMinutes("09:45", 30)).toBe("10:15");
    expect(addMinutes("23:50", 20)).toBe("00:10");
    expect(timePeriods("10:00", [])).toEqual([]);
    expect(sessionEndTime("10:00", [])).toBe("10:00");
  });
});

describe("staff-only slots", () => {
  const periods = [
    { subjectId: null, title: "Staff meeting", durationMinutes: 30, staffOnly: true },
    { subjectId: "quran", title: null, durationMinutes: 50 },
    { subjectId: null, title: "Break", durationMinutes: 10 },
  ];
  it("are dropped for families, whose day starts at the first slot they see", () => {
    expect(forFamilies(periods).map((p) => p.title ?? p.subjectId)).toEqual(["quran", "Break"]);
    expect(familyStart("09:30", periods)).toBe("10:00");
    expect(familyStart("09:30", periods.slice(1))).toBe("09:30");
  });
});
