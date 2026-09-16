import { describe, it, expect } from "vitest";
import { updateEmployeeSchema, editEmployeeProfileSchema } from "../validations/employee";

describe("Employee 201 File Validation & Payload Schema", () => {
  it("validates 201 File personal contact and emergency contact fields in updateEmployeeSchema", () => {
    const payload = {
      personalEmail: "employee.personal@example.com",
      mobileNumber: "0917-888-9999",
      currentAddress: "123 Mabini St, Malate, Manila",
      permanentAddress: "456 Rizal St, San Fernando, Pampanga",
      emergencyContactName: "Maria Santos",
      emergencyContactRelationship: "Spouse",
      emergencyContactNumber: "0918-777-6666",
      emergencyContactAddress: "123 Mabini St, Malate, Manila",
    };

    const parsed = updateEmployeeSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.personalEmail).toBe("employee.personal@example.com");
      expect(parsed.data.mobileNumber).toBe("0917-888-9999");
      expect(parsed.data.emergencyContactName).toBe("Maria Santos");
      expect(parsed.data.emergencyContactRelationship).toBe("Spouse");
    }
  });

  it("validates 201 File profile update form in editEmployeeProfileSchema", () => {
    const payload = {
      employeeNumber: "EMP-201-001",
      firstName: "Ariel",
      lastName: "Sibonga",
      birthDate: "1990-05-15",
      sex: "MALE" as const,
      civilStatus: "MARRIED" as const,
      personalEmail: "ariel.sibonga@personal.local",
      mobileNumber: "0917-555-1234",
      currentAddress: "Block 5 Lot 12, Pasig City",
      permanentAddress: "Barangay Poblacion, Iloilo City",
      emergencyContactName: "Elena Sibonga",
      emergencyContactRelationship: "Spouse",
      emergencyContactNumber: "0917-555-4321",
      emergencyContactAddress: "Block 5 Lot 12, Pasig City",
      positionTitle: "Senior Logistics Supervisor",
      departmentName: "Operations",
      paymentMethod: "BANK_TRANSFER" as const,
    };

    const parsed = editEmployeeProfileSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.personalEmail).toBe("ariel.sibonga@personal.local");
      expect(parsed.data.mobileNumber).toBe("0917-555-1234");
      expect(parsed.data.emergencyContactName).toBe("Elena Sibonga");
    }
  });
});
