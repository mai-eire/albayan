import type { EventType } from "./db/schema";

// The school calendar holds two families of entry, and every screen groups them this way:
// dates the school announces, which nobody opts into, and activities a family may choose.
// Deciding it here rather than per page keeps the office's list, the calendar and the
// schedule view saying the same thing.

export const schoolDateTypes = [
  "holiday",
  "closure",
  "exam",
  "parent_teacher_meeting",
  "staff_meeting",
  "other",
] as const satisfies readonly EventType[];

export function isActivity(type: EventType): boolean {
  return !(schoolDateTypes as readonly EventType[]).includes(type);
}

export const eventTypeLabels: Record<EventType, string> = {
  holiday: "Holiday",
  closure: "Closure",
  exam: "Exam",
  parent_teacher_meeting: "Parent–teacher meeting",
  staff_meeting: "Staff meeting",
  other: "Other",
  trip: "Trip",
  camp: "Camp",
  summer_school: "Summer school",
  club: "Club",
  sports_day: "Sports day",
  community: "Community event",
};

// What an entry looks like on a calendar (DESIGN §4.10): a colour for the kind of day it
// is and an icon, so it reads at a glance and never by colour alone. Subject colours are
// never used here — a chip says what kind of day it is, not which subject.
export type EventLook = { color: "clay" | "saffron" | "tile" | "gray" | "plum"; icon: string };

export function eventLook(type: EventType): EventLook {
  switch (type) {
    case "holiday":
      return { color: "clay", icon: "holiday" };
    case "closure":
      return { color: "clay", icon: "closure" };
    case "exam":
      return { color: "saffron", icon: "exam" };
    case "parent_teacher_meeting":
      return { color: "tile", icon: "meeting" };
    case "staff_meeting":
      return { color: "gray", icon: "staff" };
    case "other":
      return { color: "gray", icon: "other" };
    default:
      return { color: "plum", icon: type };
  }
}

// A date on its own is an all-day entry; a date and time is one that starts at a time.
// Both sort as text, so the database can order by the column either way.
export function dateOf(at: string): string {
  return at.slice(0, 10);
}

export function timeOf(at: string): string | null {
  return at.length > 10 ? at.slice(11, 16) : null;
}

export function atFrom(date: string, time: string | null): string {
  return time ? `${date}T${time}` : date;
}

type Spanning = { startAt: string; endAt: string };

// Every date an entry covers, so a week-long holiday marks all of its days on the grid.
export function datesCovered({ startAt, endAt }: Spanning): string[] {
  const from = dateOf(startAt);
  const to = dateOf(endAt);
  const dates: string[] = [];
  const cursor = new Date(`${from}T12:00:00Z`);
  while (cursor.toISOString().slice(0, 10) <= to) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    // A wrong end date shouldn't hang the page; the CHECK constraint makes it unlikely.
    if (dates.length > 400) break;
  }
  return dates;
}

// Still to come (including one running today) or already over.
export function isUpcoming(event: Spanning, today: string): boolean {
  return dateOf(event.endAt) >= today;
}

// "Saturday 3 October", "Saturday 3 October · 10:00", "3–5 October" — said the way a
// parent would say it, with the time only when there is one.
export function whenLabel(event: Spanning, formatDate: (date: string) => string): string {
  const from = dateOf(event.startAt);
  const to = dateOf(event.endAt);
  const time = timeOf(event.startAt);
  if (from === to) return time ? `${formatDate(from)} · ${time}` : formatDate(from);
  return `${formatDate(from)} – ${formatDate(to)}`;
}

// Staff see it, families and students never do.
export function isStaffOnly(event: { audience: string }): boolean {
  return event.audience === "staff";
}
