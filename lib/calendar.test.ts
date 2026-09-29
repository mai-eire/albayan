import { describe, expect, it } from "vitest";
import { addDays, buildMonth, lessonDatesBetween, lessonDatesInTerms } from "./calendar";

const terms = [{ name: "Autumn term", startDate: "2026-09-05", endDate: "2026-12-19" }];
const saturday = {
  sessionId: 1,
  dayOfWeek: 6,
  label: "Saturday class",
  startTime: "10:00",
  endTime: "13:00",
};
const sunday = { ...saturday, sessionId: 2, dayOfWeek: 0, label: "Sunday class" };
const lessonDays = [saturday, sunday];

describe("buildMonth", () => {
  it("lays out Monday-first weeks covering the month", () => {
    const month = buildMonth({ month: "2026-09", today: "2026-09-16", terms, lessonDays });
    expect(month.title).toBe("September 2026");
    expect(month.weeks[0][0].date).toBe("2026-08-31");
    expect(month.weeks[0][0].inMonth).toBe(false);
    expect(month.weeks.at(-1)![6].date).toBe("2026-10-04");
    expect(month.weeks).toHaveLength(5);
    expect(month.previous).toBe("2026-08");
    expect(month.next).toBe("2026-10");
    expect(month.weeks[2].find((d) => d.date === "2026-09-16")?.isToday).toBe(true);
  });

  it("marks lesson days only inside a term", () => {
    const month = buildMonth({ month: "2026-09", today: "2026-09-16", terms, lessonDays });
    const day = (date: string) => month.weeks.flat().find((d) => d.date === date)!;
    expect(day("2026-09-05").lessons).toEqual([saturday]);
    expect(day("2026-09-06").lessons).toEqual([sunday]);
    expect(day("2026-09-07").lessons).toEqual([]);
    // The Saturday before term starts is not a lesson day.
    expect(day("2026-08-29")).toBeUndefined();
    const august = buildMonth({ month: "2026-08", today: "2026-09-16", terms, lessonDays });
    expect(august.weeks.flat().find((d) => d.date === "2026-08-29")?.lessons).toEqual([]);
    expect(day("2026-09-05").termName).toBe("Autumn term");
  });

  it("places events and crosses the year boundary", () => {
    const month = buildMonth({
      month: "2026-12",
      today: "2026-12-01",
      terms,
      lessonDays,
      events: [{ id: 1, date: "2026-12-19", title: "Last day of term", type: "holiday" }],
    });
    expect(month.weeks.flat().find((d) => d.date === "2026-12-19")?.events).toEqual([
      { id: 1, date: "2026-12-19", title: "Last day of term", type: "holiday" },
    ]);
    expect(month.next).toBe("2027-01");
  });
});

describe("lessonDatesBetween", () => {
  it("lists the Saturdays in a range, inclusive", () => {
    expect(lessonDatesBetween(6, "2026-09-05", "2026-09-26")).toEqual([
      "2026-09-05",
      "2026-09-12",
      "2026-09-19",
      "2026-09-26",
    ]);
    expect(lessonDatesBetween(0, "2026-09-05", "2026-09-06")).toEqual(["2026-09-06"]);
    expect(lessonDatesBetween(0, "2026-09-07", "2026-09-12")).toEqual([]);
  });
});

describe("lessonDatesInTerms", () => {
  it("lists every class day of the year in date order", () => {
    const dates = lessonDatesInTerms(terms, lessonDays);
    expect(dates[0]).toEqual({ date: "2026-09-05", lesson: saturday });
    expect(dates[1]).toEqual({ date: "2026-09-06", lesson: sunday });
    expect(dates.at(-1)!.date).toBe("2026-12-19");
    // Two days a week for fifteen weeks of term, give or take the ends.
    expect(dates.length).toBeGreaterThan(20);
    expect(dates.every((d) => d.date >= "2026-09-05" && d.date <= "2026-12-19")).toBe(true);
  });
});

describe("addDays", () => {
  it("moves a date and crosses months and years", () => {
    expect(addDays("2026-09-29", 28)).toBe("2026-10-27");
    expect(addDays("2026-12-20", 28)).toBe("2027-01-17");
    expect(addDays("2026-03-28", 1)).toBe("2026-03-29"); // a clock-change Sunday
  });
});
