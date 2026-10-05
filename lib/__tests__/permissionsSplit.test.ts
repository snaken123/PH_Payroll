import { describe, it, expect } from "vitest";
import { PERMISSION_CATEGORIES, hasPermission } from "@/lib/permissions";

describe("Granular Permissions Split Verification", () => {
  it("separates Create & Edit Employees from Delete Employees", () => {
    const employeeCategory = PERMISSION_CATEGORIES.find((c) => c.id === "employee");
    expect(employeeCategory).toBeDefined();

    const createEditItem = employeeCategory?.items.find((i) => i.key === "employee.manage");
    const deleteItem = employeeCategory?.items.find((i) => i.key === "employee.delete");

    expect(createEditItem).toBeDefined();
    expect(createEditItem?.label).toBe("Create & Edit Employees");
    expect(createEditItem?.description).toContain("Add new employees and modify profile details");

    expect(deleteItem).toBeDefined();
    expect(deleteItem?.label).toBe("Delete Employees");
    expect(deleteItem?.description).toContain("Separate employees or delete roster records");
  });

  it("separates Create Loans from Approve Loans", () => {
    const loansCategory = PERMISSION_CATEGORIES.find((c) => c.id === "loans");
    expect(loansCategory).toBeDefined();

    const createItem = loansCategory?.items.find((i) => i.key === "loans.create");
    const approveItem = loansCategory?.items.find((i) => i.key === "loans.approve");

    expect(createItem).toBeDefined();
    expect(createItem?.label).toBe("Create Loans / Cash Advances");
    expect(createItem?.description).toContain("Issue new company loans");

    expect(approveItem).toBeDefined();
    expect(approveItem?.label).toBe("Approve Loans / Cash Advances");
    expect(approveItem?.description).toContain("Review and grant final approval");
  });

  it("maintains backward compatibility for legacy employee.manage and loans.manage keys in hasPermission", () => {
    const legacyPermissions = ["employee.manage", "loans.manage"];

    expect(hasPermission(legacyPermissions, "employee.manage")).toBe(true);
    expect(hasPermission(legacyPermissions, "employee.delete")).toBe(true);
    expect(hasPermission(legacyPermissions, "loans.create")).toBe(true);
    expect(hasPermission(legacyPermissions, "loans.approve")).toBe(true);
  });
});
