-- Company row-level security (defense-in-depth).  NOT APPLIED — review, then run manually.
--
-- What this does today (safe to apply as-is):
--   * Enables RLS on every table that carries "companyId".
--   * Adds a policy exposing only rows whose "companyId" matches the session setting app.company_id.
--   * Does NOT use FORCE ROW LEVEL SECURITY, so the table-owner role Prisma connects as is unaffected.
--     It immediately protects any OTHER role (read-only/reporting roles, a public Data API,
--     leaked non-owner credentials): with app.company_id unset they see zero rows.
--
-- To make it also guard the app's own queries (second phase, requires code change):
--   1. Run tenant-scoped queries inside a transaction that first executes
--      SELECT set_config('app.company_id', <companyId>, true);   (e.g. a Prisma client extension)
--   2. Connect the app with a non-owner role (or add FORCE ROW LEVEL SECURITY to each table).
--   Test on a database branch first. Note: build currently runs `prisma db push`; apply this
--   SQL separately — db push does not manage policies.

ALTER TABLE "CompanyMembership" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS company_isolation ON "CompanyMembership";
CREATE POLICY company_isolation ON "CompanyMembership"
  USING ("companyId" = current_setting('app.company_id', true))
  WITH CHECK ("companyId" = current_setting('app.company_id', true));

ALTER TABLE "CompanyBankAccount" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS company_isolation ON "CompanyBankAccount";
CREATE POLICY company_isolation ON "CompanyBankAccount"
  USING ("companyId" = current_setting('app.company_id', true))
  WITH CHECK ("companyId" = current_setting('app.company_id', true));

ALTER TABLE "CompanyBranch" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS company_isolation ON "CompanyBranch";
CREATE POLICY company_isolation ON "CompanyBranch"
  USING ("companyId" = current_setting('app.company_id', true))
  WITH CHECK ("companyId" = current_setting('app.company_id', true));

ALTER TABLE "Employee" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS company_isolation ON "Employee";
CREATE POLICY company_isolation ON "Employee"
  USING ("companyId" = current_setting('app.company_id', true))
  WITH CHECK ("companyId" = current_setting('app.company_id', true));

ALTER TABLE "EmployeeDocument" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS company_isolation ON "EmployeeDocument";
CREATE POLICY company_isolation ON "EmployeeDocument"
  USING ("companyId" = current_setting('app.company_id', true))
  WITH CHECK ("companyId" = current_setting('app.company_id', true));

ALTER TABLE "EmployeeDeletionAudit" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS company_isolation ON "EmployeeDeletionAudit";
CREATE POLICY company_isolation ON "EmployeeDeletionAudit"
  USING ("companyId" = current_setting('app.company_id', true))
  WITH CHECK ("companyId" = current_setting('app.company_id', true));

ALTER TABLE "CompanyHoliday" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS company_isolation ON "CompanyHoliday";
CREATE POLICY company_isolation ON "CompanyHoliday"
  USING ("companyId" = current_setting('app.company_id', true))
  WITH CHECK ("companyId" = current_setting('app.company_id', true));

ALTER TABLE "TimesheetEntry" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS company_isolation ON "TimesheetEntry";
CREATE POLICY company_isolation ON "TimesheetEntry"
  USING ("companyId" = current_setting('app.company_id', true))
  WITH CHECK ("companyId" = current_setting('app.company_id', true));

ALTER TABLE "PayrollPeriod" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS company_isolation ON "PayrollPeriod";
CREATE POLICY company_isolation ON "PayrollPeriod"
  USING ("companyId" = current_setting('app.company_id', true))
  WITH CHECK ("companyId" = current_setting('app.company_id', true));

ALTER TABLE "PayrollRun" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS company_isolation ON "PayrollRun";
CREATE POLICY company_isolation ON "PayrollRun"
  USING ("companyId" = current_setting('app.company_id', true))
  WITH CHECK ("companyId" = current_setting('app.company_id', true));

ALTER TABLE "Payslip" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS company_isolation ON "Payslip";
CREATE POLICY company_isolation ON "Payslip"
  USING ("companyId" = current_setting('app.company_id', true))
  WITH CHECK ("companyId" = current_setting('app.company_id', true));

ALTER TABLE "Loan" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS company_isolation ON "Loan";
CREATE POLICY company_isolation ON "Loan"
  USING ("companyId" = current_setting('app.company_id', true))
  WITH CHECK ("companyId" = current_setting('app.company_id', true));

ALTER TABLE "LeaveType" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS company_isolation ON "LeaveType";
CREATE POLICY company_isolation ON "LeaveType"
  USING ("companyId" = current_setting('app.company_id', true))
  WITH CHECK ("companyId" = current_setting('app.company_id', true));

ALTER TABLE "GeneratedDocument" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS company_isolation ON "GeneratedDocument";
CREATE POLICY company_isolation ON "GeneratedDocument"
  USING ("companyId" = current_setting('app.company_id', true))
  WITH CHECK ("companyId" = current_setting('app.company_id', true));

ALTER TABLE "Contractor" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS company_isolation ON "Contractor";
CREATE POLICY company_isolation ON "Contractor"
  USING ("companyId" = current_setting('app.company_id', true))
  WITH CHECK ("companyId" = current_setting('app.company_id', true));

ALTER TABLE "ContractorPayment" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS company_isolation ON "ContractorPayment";
CREATE POLICY company_isolation ON "ContractorPayment"
  USING ("companyId" = current_setting('app.company_id', true))
  WITH CHECK ("companyId" = current_setting('app.company_id', true));

ALTER TABLE "FinalPayRun" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS company_isolation ON "FinalPayRun";
CREATE POLICY company_isolation ON "FinalPayRun"
  USING ("companyId" = current_setting('app.company_id', true))
  WITH CHECK ("companyId" = current_setting('app.company_id', true));
