import { describe, expect, it } from "vitest";
import { dueLabel, homeworkStatus } from "./homework";

describe("homework", () => {
  it("classifies due dates", () => {
    expect(homeworkStatus("2026-09-16", "2026-09-16")).toBe("due_soon");
    expect(homeworkStatus("2026-09-17", "2026-09-16")).toBe("due_soon");
    expect(homeworkStatus("2026-09-18", "2026-09-16")).toBe("due_later");
    expect(homeworkStatus("2026-09-15", "2026-09-16")).toBe("overdue");
  });
  it("labels them in plain words", () => {
    expect(dueLabel("2026-09-16", "2026-09-16", "Europe/Dublin")).toBe("Due today");
    expect(dueLabel("2026-09-17", "2026-09-16", "Europe/Dublin")).toBe("Due tomorrow");
    expect(dueLabel("2026-09-19", "2026-09-16", "Europe/Dublin")).toBe(
      "Due on Saturday 19 September",
    );
    expect(dueLabel("2026-09-12", "2026-09-16", "Europe/Dublin")).toBe(
      "Was due on Saturday 12 September",
    );
  });
});
