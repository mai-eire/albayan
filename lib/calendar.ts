// A month for the calendar pages, built from terms, weekly lesson days and (later) events.
// Pure: dates are YYYY-MM-DD strings, weeks start on Monday.

export type CalendarTerm = { name: string; startDate: string; endDate: string };
export type LessonDay = { dayOfWeek: number; label: string };
export type CalendarEvent = { date: string; title: string };

export type CalendarDay = {
  date: string;
  dayOfMonth: number;
  inMonth: boolean;
  isToday: boolean;
  termName: string | null;
  // Lesson labels that fall on this day and inside a term ("Saturday class").
  lessons: string[];
  events: string[];
};

export type CalendarMonth = {
  month: string; // YYYY-MM
  title: string; // "September 2026"
  weeks: CalendarDay[][];
  previous: string;
  next: string;
};

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function shift(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function buildMonth(input: {
  month: string;
  today: string;
  terms: CalendarTerm[];
  lessonDays: LessonDay[];
  events?: CalendarEvent[];
}): CalendarMonth {
  const [y, m] = input.month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  // Back to Monday.
  const start = new Date(first);
  start.setUTCDate(first.getUTCDate() - ((first.getUTCDay() + 6) % 7));
  const weeks: CalendarDay[][] = [];
  const cursor = new Date(start);
  do {
    const week: CalendarDay[] = [];
    for (let i = 0; i < 7; i++) {
      const date = iso(cursor);
      const term = input.terms.find((t) => t.startDate <= date && date <= t.endDate) ?? null;
      week.push({
        date,
        dayOfMonth: cursor.getUTCDate(),
        inMonth: cursor.getUTCMonth() === m - 1,
        isToday: date === input.today,
        termName: term?.name ?? null,
        lessons: term
          ? input.lessonDays.filter((l) => l.dayOfWeek === cursor.getUTCDay()).map((l) => l.label)
          : [],
        events: (input.events ?? []).filter((e) => e.date === date).map((e) => e.title),
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    weeks.push(week);
  } while (cursor.getUTCMonth() === m - 1);
  return {
    month: input.month,
    title: first.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }),
    weeks,
    previous: shift(input.month, -1),
    next: shift(input.month, 1),
  };
}
