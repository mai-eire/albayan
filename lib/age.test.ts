import { describe, expect, it } from "vitest";
import { ageOn } from "./age";

describe("ageOn", () => {
  it("counts full years only", () => {
    expect(ageOn("2018-09-16", "2026-09-16")).toBe(8);
    expect(ageOn("2018-09-17", "2026-09-16")).toBe(7);
    expect(ageOn("2018-01-01", "2026-12-31")).toBe(8);
    expect(ageOn("2026-09-16", "2026-09-16")).toBe(0);
  });
});
