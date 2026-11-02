import { describe, expect, it } from "vitest";
import { fromCents, toCents } from "@shared/lib/money";

describe("money", () => {
  it("round-trips decimal strings without float error", () => {
    expect(toCents("0.10") + toCents("0.20")).toBe(30n);
    expect(fromCents(toCents("1250.5"))).toBe("1250.50");
    expect(fromCents(toCents("-3.07"))).toBe("-3.07");
  });

  it("rejects invalid input", () => {
    expect(() => toCents("1.234")).toThrow();
  });
});
