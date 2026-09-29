// A month for the calendar pages, built from terms, weekly lesson days and (later) events.
// Pure: dates are YYYY-MM-DD strings, weeks start on Monday.

export type CalendarTerm = { name: string; startDate: string; endDate: string };
// A weekday the viewer is in school, with the hours they are there: a family's day starts
// at the first slot they see, a teacher's at the staff slot before it (lib/timetable.ts).
export type LessonDay = {
  sessionId: number;
  dayOfWeek: number;
  label: string;
  startTime: string;
  endTime: string;
};
// What a day carries from the school calendar. The row itself lives in the page's state;
// the grid only needs enough to draw the chip and open its popover.
export type CalendarEvent = { id: number; date: string; title: string; type: string };

export type CalendarDay = {
  date: string;
  dayOfMonth: number;
  inMonth: boolean;
  isToday: boolean;
  termName: string | null;
  // Lesson days falling on this date and inside a term ("Saturday class").
  lessons: LessonDay[];
  events: CalendarEvent[];
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

// Every date falling on `dayOfWeek` between two dates inclusive — a class's lesson days.
export function lessonDatesBetween(dayOfWeek: number, from: string, to: string): string[] {
  const dates: string[] = [];
  const date = new Date(`${from}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + ((dayOfWeek - date.getUTCDay() + 7) % 7));
  while (date.toISOString().slice(0, 10) <= to) {
    dates.push(date.toISOString().slice(0, 10));
    date.setUTCDate(date.getUTCDate() + 7);
  }
  return dates;
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
        lessons: term ? input.lessonDays.filter((l) => l.dayOfWeek === cursor.getUTCDay()) : [],
        events: (input.events ?? []).filter((e) => e.date === date),
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

// Every lesson day of the year, in date order: the schedule view's own rows, so a family
// reads "Saturday class" between the trip and the mid-term break the way a diary would.
export function lessonDatesInTerms(
  terms: CalendarTerm[],
  lessonDays: LessonDay[],
): { date: string; lesson: LessonDay }[] {
  const rows = terms.flatMap((term) =>
    lessonDays.flatMap((lesson) =>
      lessonDatesBetween(lesson.dayOfWeek, term.startDate, term.endDate).map((date) => ({
        date,
        lesson,
      })),
    ),
  );
  return rows.sort(
    (a, b) => a.date.localeCompare(b.date) || a.lesson.label.localeCompare(b.lesson.label),
  );
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// How far ahead the schedule lists class days. A school year holds eighty of them, which
// would bury the eleven dates that actually need reading; four weeks is what a family
// plans around, and the dates and activities still run to the end of the year.
export const lessonHorizonDays = 28;
