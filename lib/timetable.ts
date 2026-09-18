// Times are never stored: a session has a start time and ordered periods with durations.

export type PeriodInput = {
  subjectId: string | null;
  title: string | null;
  durationMinutes: number;
  // A staff meeting or briefing: on staff timetables only. Families and students get the
  // list with these removed (`forFamilies`), and their day starts at the first slot left.
  staffOnly?: boolean;
};

export function forFamilies<T extends PeriodInput>(periods: T[]): T[] {
  return periods.filter((p) => !p.staffOnly);
}

// When the family's day starts: the session start plus any staff-only slots before the
// first slot they can see.
export function familyStart(startTime: string, periods: PeriodInput[]): string {
  const first = periods.findIndex((p) => !p.staffOnly);
  return addMinutes(
    startTime,
    periods.slice(0, first < 0 ? periods.length : first).reduce((n, p) => n + p.durationMinutes, 0),
  );
}

export type TimedPeriod<T extends PeriodInput = PeriodInput> = T & {
  startTime: string;
  endTime: string;
};

export function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

// "10:00" + [50, 50, 20, 50] → 10:00–10:50, 10:50–11:40, 11:40–12:00, 12:00–12:50.
export function timePeriods<T extends PeriodInput>(
  startTime: string,
  periods: T[],
): TimedPeriod<T>[] {
  let cursor = startTime;
  return periods.map((period) => {
    const start = cursor;
    cursor = addMinutes(cursor, period.durationMinutes);
    return { ...period, startTime: start, endTime: cursor };
  });
}

export function sessionEndTime(startTime: string, periods: PeriodInput[]): string {
  return addMinutes(
    startTime,
    periods.reduce((sum, p) => sum + p.durationMinutes, 0),
  );
}

export const weekdays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
