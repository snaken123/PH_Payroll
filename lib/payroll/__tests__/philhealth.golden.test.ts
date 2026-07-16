import { describe, expect, it } from "vitest";
import { getPhilhealthContribution } from "../rates/getPhilhealthContribution";
import type { PhilhealthConfigRow } from "../types";

// Mirrors prisma/seed.ts's PhilhealthConfig for 2026: 5% total, 2.5%/2.5%
// split, floor ₱10,000, ceiling ₱100,000 (PhilHealth Circular PC2026-0001).
const config: PhilhealthConfigRow = {
  premiumRate: 0.05,
  eeShareRate: 0.025,
  erShareRate: 0.025,
  floorSalary: 10000,
  ceilingSalary: 100000,
};

describe("getPhilhealthContribution", () => {
  it("applies the floor for compensation below ₱10,000", () => {
    const result = getPhilhealthContribution(8000, config);
    expect(result.contributionBase.toNumber()).toBe(10000);
    expect(result.eeShare.toNumber()).toBe(250);
    expect(result.erShare.toNumber()).toBe(250);
  });

  it("computes a straight 2.5%/2.5% split mid-range", () => {
    const result = getPhilhealthContribution(30000, config);
    expect(result.eeShare.toNumber()).toBe(750);
    expect(result.erShare.toNumber()).toBe(750);
    expect(result.totalContribution.toNumber()).toBe(1500);
  });

  it("applies the ceiling for compensation above ₱100,000", () => {
    const result = getPhilhealthContribution(150000, config);
    expect(result.contributionBase.toNumber()).toBe(100000);
    expect(result.eeShare.toNumber()).toBe(2500);
    expect(result.erShare.toNumber()).toBe(2500);
  });

  it("is continuous exactly at the floor and ceiling boundaries", () => {
    const atFloor = getPhilhealthContribution(10000, config);
    const atCeiling = getPhilhealthContribution(100000, config);
    expect(atFloor.eeShare.toNumber()).toBe(250);
    expect(atCeiling.eeShare.toNumber()).toBe(2500);
  });
});
