import { describe, expect, it } from "vitest";
import { isRetainerEmployee } from "../retainer";

describe("isRetainerEmployee", () => {
  it("returns true when rank is 'Retainer'", () => {
    expect(isRetainerEmployee({ rank: "Retainer", employmentStatus: "REGULAR" })).toBe(true);
  });

  it("returns true when rank is 'retainer' (case-insensitive)", () => {
    expect(isRetainerEmployee({ rank: "retainer", employmentStatus: "PROBATIONARY" })).toBe(true);
    expect(isRetainerEmployee({ rank: "RETAINER" })).toBe(true);
    expect(isRetainerEmployee({ rank: "  Retainer  " })).toBe(true);
  });

  it("returns true when employmentStatus is 'RETAINER'", () => {
    expect(isRetainerEmployee({ rank: null, employmentStatus: "RETAINER" })).toBe(true);
    expect(isRetainerEmployee({ rank: "AS1", employmentStatus: "RETAINER" })).toBe(true);
  });

  it("returns false when neither rank nor employmentStatus is Retainer", () => {
    expect(isRetainerEmployee({ rank: "AS1", employmentStatus: "REGULAR" })).toBe(false);
    expect(isRetainerEmployee({ rank: "PROB", employmentStatus: "PROBATIONARY" })).toBe(false);
    expect(isRetainerEmployee({ rank: null, employmentStatus: "REGULAR" })).toBe(false);
    expect(isRetainerEmployee({})).toBe(false);
  });
});
