import { relativeDay } from "./time";

export type HomeworkStatus = "due_later" | "due_soon" | "overdue";

// Due today or tomorrow is "soon"; past is overdue. Dates are YYYY-MM-DD in school time.
export function homeworkStatus(dueDate: string, today: string): HomeworkStatus {
  if (dueDate < today) return "overdue";
  const diff = Math.round(
    (Date.parse(`${dueDate}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000,
  );
  return diff <= 1 ? "due_soon" : "due_later";
}

// "Due tomorrow", "Due on Saturday 19 September", "Was due on Saturday 12 September".
export function dueLabel(dueDate: string, today: string, timezone: string): string {
  const when = relativeDay(dueDate, today, timezone);
  return dueDate < today ? `Was due ${when}` : `Due ${when}`;
}
