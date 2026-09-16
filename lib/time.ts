// All "today" and display-date logic goes through here, in the school's timezone.

export function todayIn(timezone: string, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(now); // YYYY-MM-DD
}

// "Saturday 19 September" (§7): weekday first, no ordinal, no comma, year only if asked.
export function formatDate(date: string | Date, timezone: string, withYear = false): string {
  const value = typeof date === "string" ? new Date(`${date.slice(0, 10)}T12:00:00Z`) : date;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).formatToParts(value);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("weekday")} ${get("day")} ${get("month")}${withYear ? ` ${get("year")}` : ""}`;
}

// Secondary line on calendars and Today: "23 Rabiʻ I 1448"
export function formatHijri(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-GB-u-ca-islamic-umalqura", {
    timeZone: timezone,
    day: "numeric",
    month: "long",
    year: "numeric",
  })
    .format(date)
    .replace(/ AH$/, "");
}

// 0 = Sunday … 6 = Saturday, matching school_sessions.dayOfWeek.
export function dayOfWeekIn(timezone: string, now = new Date()): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" }).format(
    now,
  );
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
}

// The next date (YYYY-MM-DD) that falls on `dayOfWeek`, counting today if it is that day.
export function nextDateOn(dayOfWeek: number, today: string): string {
  const date = new Date(`${today}T12:00:00Z`);
  const ahead = (dayOfWeek - date.getUTCDay() + 7) % 7;
  date.setUTCDate(date.getUTCDate() + ahead);
  return date.toISOString().slice(0, 10);
}

// "today", "tomorrow", "on Saturday 19 September" — for families and students (§5).
// `short` keeps it to the weekday ("on Saturday") where a title has to fit on a phone.
export function relativeDay(date: string, today: string, timezone: string, short = false): string {
  const diff = Math.round(
    (Date.parse(`${date}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000,
  );
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  return `on ${short ? formatDate(date, timezone).split(" ")[0] : formatDate(date, timezone)}`;
}
