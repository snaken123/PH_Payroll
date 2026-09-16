import { describe, it, expect } from "vitest";
import { getTargetUrlOnCompanySwitch } from "../company-switcher";

describe("getTargetUrlOnCompanySwitch", () => {
  it("redirects employee detail page to /dashboard/employees list", () => {
    expect(getTargetUrlOnCompanySwitch("/dashboard/employees/cms702a9t000usgzu4ftg2qmv")).toBe(
      "/dashboard/employees"
    );
  });

  it("redirects employee final pay subpage to /dashboard/employees list", () => {
    expect(
      getTargetUrlOnCompanySwitch("/dashboard/employees/cms702a9t000usgzu4ftg2qmv/final-pay/run123")
    ).toBe("/dashboard/employees");
  });

  it("keeps /dashboard/employees/bulk-edit page path", () => {
    expect(getTargetUrlOnCompanySwitch("/dashboard/employees/bulk-edit")).toBe(
      "/dashboard/employees/bulk-edit"
    );
  });

  it("keeps top-level /dashboard/employees list path", () => {
    expect(getTargetUrlOnCompanySwitch("/dashboard/employees")).toBe("/dashboard/employees");
  });

  it("redirects contractor detail page to /dashboard/contractors list", () => {
    expect(getTargetUrlOnCompanySwitch("/dashboard/contractors/contractor123")).toBe(
      "/dashboard/contractors"
    );
  });

  it("keeps top-level /dashboard/contractors list path", () => {
    expect(getTargetUrlOnCompanySwitch("/dashboard/contractors")).toBe("/dashboard/contractors");
  });

  it("redirects payroll run detail page to /dashboard/payroll list", () => {
    expect(getTargetUrlOnCompanySwitch("/dashboard/payroll/run123")).toBe("/dashboard/payroll");
  });

  it("keeps top-level /dashboard/payroll list path", () => {
    expect(getTargetUrlOnCompanySwitch("/dashboard/payroll")).toBe("/dashboard/payroll");
  });

  it("keeps top-level tab routes like attendance, settings, holidays, and dashboard", () => {
    expect(getTargetUrlOnCompanySwitch("/dashboard/attendance")).toBe("/dashboard/attendance");
    expect(getTargetUrlOnCompanySwitch("/dashboard/settings")).toBe("/dashboard/settings");
    expect(getTargetUrlOnCompanySwitch("/dashboard/holidays")).toBe("/dashboard/holidays");
    expect(getTargetUrlOnCompanySwitch("/dashboard")).toBe("/dashboard");
  });
});
