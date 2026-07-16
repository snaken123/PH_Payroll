import { describe, expect, it } from "vitest";
import { computeThirteenthMonthPay } from "../thirteenthMonth";

describe("computeThirteenthMonthPay", () => {
  it("divides annual basic salary by 12", () => {
    const result = computeThirteenthMonthPay(264000, 90000);
    expect(result.thirteenthMonthPay.toNumber()).toBe(22000);
  });

  it("has no taxable excess when under the exemption ceiling", () => {
    const result = computeThirteenthMonthPay(264000, 90000);
    expect(result.taxableExcess.toNumber()).toBe(0);
  });

  it("computes taxable excess above the exemption ceiling", () => {
    const result = computeThirteenthMonthPay(1200000, 90000); // 100,000/mo -> 100,000 13th month
    expect(result.thirteenthMonthPay.toNumber()).toBe(100000);
    expect(result.taxableExcess.toNumber()).toBe(10000);
  });

  it("reduces remaining ceiling room by other non-taxable benefits already granted", () => {
    const result = computeThirteenthMonthPay(264000, 90000, 80000);
    // remaining ceiling = 10,000; 13th month pay = 22,000 -> excess = 12,000
    expect(result.taxableExcess.toNumber()).toBe(12000);
  });
});
