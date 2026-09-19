import { describe, it } from "vitest";
import { prisma } from "../../lib/db";

describe("Audit employees across companies", () => {
  it("logs all employees and their primary company assignment", async () => {
    const employees = await prisma.employee.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        employeeNumber: true,
        firstName: true,
        lastName: true,
        companyId: true,
        company: { select: { companyCode: true, legalName: true } },
        compensationRecords: {
          orderBy: { effectiveFrom: "desc" },
          take: 1,
          select: {
            basicRate: true,
            allowances: {
              select: {
                label: true,
                amount: true,
                payingCompanyId: true,
                payingCompany: { select: { companyCode: true, legalName: true } }
              }
            }
          }
        }
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
    });

    console.log(`\n==================================================`);
    console.log(`TOTAL ACTIVE EMPLOYEES IN DB: ${employees.length}`);
    console.log(`==================================================\n`);

    for (const emp of employees) {
      const comp = emp.compensationRecords[0];
      const allowancesStr = comp?.allowances?.map(a => `${a.label}: ₱${a.amount} (payingCompany: ${a.payingCompany?.legalName || 'Primary Company'})`).join(" | ") || "None";
      console.log(`EMPLOYEE: ${emp.firstName} ${emp.lastName} (#${emp.employeeNumber})`);
      console.log(`  ID: ${emp.id}`);
      console.log(`  Assigned Company: ${emp.company.legalName} (${emp.company.companyCode})`);
      console.log(`  Basic Rate: ₱${comp?.basicRate ?? 0}`);
      console.log(`  Allowances: ${allowancesStr}`);
      console.log(`--------------------------------------------------`);
    }
  });
});
