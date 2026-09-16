import { describe, expect, it } from "vitest";
import { eurosToCents, formatEuros } from "./money";

describe("money", () => {
  it("parses what people type", () => {
    expect(eurosToCents("250")).toBe(25000);
    expect(eurosToCents("250.5")).toBe(25050);
    expect(eurosToCents("€1,250.00")).toBe(125000);
    expect(eurosToCents(" 0.99 ")).toBe(99);
    expect(eurosToCents(250)).toBe(25000);
    expect(eurosToCents("-10")).toBe(-1000);
    expect(() => eurosToCents("ten")).toThrow();
    expect(() => eurosToCents("1.234")).toThrow();
  });

  it("formats without trailing zeros unless there are cents", () => {
    expect(formatEuros(25000)).toBe("€250");
    expect(formatEuros(25050)).toBe("€250.50");
    expect(formatEuros(125000)).toBe("€1,250");
    expect(formatEuros(5)).toBe("€0.05");
    expect(formatEuros(0)).toBe("€0");
    expect(formatEuros(-1000)).toBe("−€10");
  });
});
