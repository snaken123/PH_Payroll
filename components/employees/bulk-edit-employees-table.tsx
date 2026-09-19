"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CopyIcon, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  sexValues,
  civilStatusValues,
  paymentMethodValues,
  type BulkEmployeeRow,
} from "@/lib/validations/employee";

type Field = keyof BulkEmployeeRow;

// Columns where "copy top row down" is offered
const COPYABLE_FIELDS = new Set<Field>([
  "sex",
  "civilStatus",
  "positionTitle",
  "departmentName",
  "rank",
  "scheduleType",
  "paymentMethod",
  "isManagerialExempt",
  "isDeductSss",
  "isDeductPhilhealth",
  "isDeductPagibig",
  "isDeductWithholdingTax",
]);

export function BulkEditEmployeesTable({
  initialRows,
}: {
  initialRows: BulkEmployeeRow[];
  canViewCompensation?: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<BulkEmployeeRow[]>(initialRows);
  const [saving, setSaving] = useState(false);

  // Sorting state
  const [sortField, setSortField] = useState<Field | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  function handleSort(field: Field) {
    if (sortField === field) {
      if (sortOrder === "asc") {
        setSortOrder("desc");
      } else {
        setSortField(null);
        setSortOrder("asc");
      }
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  }

  function updateCell(employeeId: string, field: Field, value: string | number | boolean) {
    setRows((prev) => prev.map((row) => (row.employeeId === employeeId ? { ...row, [field]: value } : row)));
  }

  const sortedRows = [...rows].sort((a, b) => {
    if (!sortField) return 0;
    const valA = a[sortField];
    const valB = b[sortField];

    let cmp = 0;
    if (typeof valA === "boolean" && typeof valB === "boolean") {
      cmp = valA === valB ? 0 : valA ? 1 : -1;
    } else if (typeof valA === "number" && typeof valB === "number") {
      cmp = valA - valB;
    } else {
      const strA = String(valA ?? "").toLowerCase();
      const strB = String(valB ?? "").toLowerCase();
      cmp = strA.localeCompare(strB, undefined, { numeric: true, sensitivity: "base" });
    }

    return sortOrder === "asc" ? cmp : -cmp;
  });

  function copyDown(field: Field) {
    setRows((prev) => {
      if (prev.length === 0) return prev;
      const topRow = sortedRows[0];
      if (!topRow) return prev;
      const value = topRow[field];
      return prev.map((row) => ({ ...row, [field]: value }));
    });
  }

  async function saveAll() {
    setSaving(true);
    const res = await fetch("/api/employees/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    });
    setSaving(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error?.formErrors?.join?.(", ") ?? body?.error ?? "Failed to save changes");
      return;
    }

    toast.success(`Saved ${rows.length} employee${rows.length === 1 ? "" : "s"}`);
    router.refresh();
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No employees to edit.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="text-xs text-muted-foreground">
          {sortField ? (
            <span>
              Sorted by: <strong className="text-foreground">{sortField}</strong> ({sortOrder.toUpperCase()})
            </span>
          ) : (
            <span>Click any column header to sort</span>
          )}
        </div>
        <Button onClick={saveAll} disabled={saving}>
          {saving ? "Saving..." : `Save all (${rows.length})`}
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 dark:bg-slate-900/60">
              <ColumnHead label="EMP_ID" field="employeeNumber" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
              <ColumnHead label="Company" field="companyName" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
              <ColumnHead label="First Name" field="firstName" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
              <ColumnHead label="Last Name" field="lastName" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
              <ColumnHead label="Middle Name" field="middleName" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
              <ColumnHead label="Birthdate" field="birthDate" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
              <ColumnHead label="Hire Date" field="dateHired" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
              <ColumnHead label="Gender" field="sex" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} onCopyDown={copyDown} />
              <ColumnHead label="Civil Status" field="civilStatus" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} onCopyDown={copyDown} />
              <ColumnHead label="Position Title" field="positionTitle" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} onCopyDown={copyDown} />
              <ColumnHead label="Department" field="departmentName" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} onCopyDown={copyDown} />
              <ColumnHead label="RANK" field="rank" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} onCopyDown={copyDown} />
              <ColumnHead label="SCHEDULE Type" field="scheduleType" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} onCopyDown={copyDown} />
              <ColumnHead label="TIN#" field="tin" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
              <ColumnHead label="SSS#" field="sssNumber" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
              <ColumnHead label="PHILHEALTH" field="philhealthNumber" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
              <ColumnHead label="PAGIBIG" field="pagibigNumber" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
              <ColumnHead label="email" field="personalEmail" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
              <ColumnHead label="mobile phone" field="mobileNumber" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
              <ColumnHead label="Address" field="currentAddress" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
              <ColumnHead label="Permanent Address" field="permanentAddress" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
              <ColumnHead label="Emergency Contact" field="emergencyContactName" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
              <ColumnHead label="EC Relationship" field="emergencyContactRelationship" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
              <ColumnHead label="EC Contact Number" field="emergencyContactNumber" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
              <ColumnHead label="EC Address" field="emergencyContactAddress" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
              <ColumnHead label="Payroll Payment Method" field="paymentMethod" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} onCopyDown={copyDown} />
              <ColumnHead label="Bank Name" field="bankName" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
              <ColumnHead label="Account Number" field="bankAccountNumber" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
              <ColumnHead label="Bank Branch" field="bankBranch" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
              <ColumnHead label="Manager (No OT) Yes/No" field="isManagerialExempt" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} onCopyDown={copyDown} />
              <ColumnHead label="SSS Contributions (Yes/No)" field="isDeductSss" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} onCopyDown={copyDown} />
              <ColumnHead label="Philhealth Contributions (Yes/No)" field="isDeductPhilhealth" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} onCopyDown={copyDown} />
              <ColumnHead label="Pag-IBIG (HDMF) Contributions (Yes/No)" field="isDeductPagibig" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} onCopyDown={copyDown} />
              <ColumnHead label="Withholding Tax Deductions (Yes/No)" field="isDeductWithholdingTax" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} onCopyDown={copyDown} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRows.map((row) => (
              <TableRow key={row.employeeId}>
                {/* 1. EMP_ID */}
                <TableCell>
                  <Input className="w-28 font-semibold" value={row.employeeNumber} onChange={(e) => updateCell(row.employeeId, "employeeNumber", e.target.value)} />
                </TableCell>

                {/* 2. Company */}
                <TableCell>
                  <Input className="w-36 bg-slate-50 font-medium text-slate-600 dark:bg-slate-900 dark:text-slate-400" value={row.companyName ?? ""} readOnly disabled />
                </TableCell>

                {/* 3. First Name */}
                <TableCell>
                  <Input className="w-32" value={row.firstName} onChange={(e) => updateCell(row.employeeId, "firstName", e.target.value)} />
                </TableCell>

                {/* 4. Last Name */}
                <TableCell>
                  <Input className="w-32" value={row.lastName} onChange={(e) => updateCell(row.employeeId, "lastName", e.target.value)} />
                </TableCell>

                {/* 5. Middle Name */}
                <TableCell>
                  <Input className="w-28" value={row.middleName ?? ""} onChange={(e) => updateCell(row.employeeId, "middleName", e.target.value)} />
                </TableCell>

                {/* 6. Birthdate */}
                <TableCell>
                  <Input className="w-36" type="date" value={row.birthDate} onChange={(e) => updateCell(row.employeeId, "birthDate", e.target.value)} />
                </TableCell>

                {/* 7. Hire Date */}
                <TableCell>
                  <Input className="w-36" type="date" value={row.dateHired ?? ""} onChange={(e) => updateCell(row.employeeId, "dateHired", e.target.value)} />
                </TableCell>

                {/* 8. Gender */}
                <TableCell>
                  <Select value={row.sex} onValueChange={(v) => v && updateCell(row.employeeId, "sex", v)}>
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {sexValues.map((v) => (
                        <SelectItem key={v} value={v}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>

                {/* 9. Civil Status */}
                <TableCell>
                  <Select value={row.civilStatus} onValueChange={(v) => v && updateCell(row.employeeId, "civilStatus", v)}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {civilStatusValues.map((v) => (
                        <SelectItem key={v} value={v}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>

                {/* 10. Position Title */}
                <TableCell>
                  <Input className="w-36" value={row.positionTitle} onChange={(e) => updateCell(row.employeeId, "positionTitle", e.target.value)} />
                </TableCell>

                {/* 11. Department */}
                <TableCell>
                  <Input className="w-32" value={row.departmentName ?? ""} onChange={(e) => updateCell(row.employeeId, "departmentName", e.target.value)} />
                </TableCell>

                {/* 12. RANK */}
                <TableCell>
                  <Input className="w-28" value={row.rank ?? ""} onChange={(e) => updateCell(row.employeeId, "rank", e.target.value)} />
                </TableCell>

                {/* 13. SCHEDULE Type */}
                <TableCell>
                  <Input className="w-28" value={row.scheduleType ?? ""} onChange={(e) => updateCell(row.employeeId, "scheduleType", e.target.value)} />
                </TableCell>

                {/* 14. TIN# */}
                <TableCell>
                  <Input className="w-32" value={row.tin ?? ""} onChange={(e) => updateCell(row.employeeId, "tin", e.target.value)} />
                </TableCell>

                {/* 15. SSS# */}
                <TableCell>
                  <Input className="w-32" value={row.sssNumber ?? ""} onChange={(e) => updateCell(row.employeeId, "sssNumber", e.target.value)} />
                </TableCell>

                {/* 16. PHILHEALTH */}
                <TableCell>
                  <Input className="w-32" value={row.philhealthNumber ?? ""} onChange={(e) => updateCell(row.employeeId, "philhealthNumber", e.target.value)} />
                </TableCell>

                {/* 17. PAGIBIG */}
                <TableCell>
                  <Input className="w-32" value={row.pagibigNumber ?? ""} onChange={(e) => updateCell(row.employeeId, "pagibigNumber", e.target.value)} />
                </TableCell>

                {/* 18. email */}
                <TableCell>
                  <Input className="w-40" type="email" value={row.personalEmail ?? ""} onChange={(e) => updateCell(row.employeeId, "personalEmail", e.target.value)} />
                </TableCell>

                {/* 19. mobile phone */}
                <TableCell>
                  <Input className="w-32" value={row.mobileNumber ?? ""} onChange={(e) => updateCell(row.employeeId, "mobileNumber", e.target.value)} />
                </TableCell>

                {/* 20. Address */}
                <TableCell>
                  <Input className="w-44" value={row.currentAddress ?? ""} onChange={(e) => updateCell(row.employeeId, "currentAddress", e.target.value)} />
                </TableCell>

                {/* 21. Permanent Address */}
                <TableCell>
                  <Input className="w-44" value={row.permanentAddress ?? ""} onChange={(e) => updateCell(row.employeeId, "permanentAddress", e.target.value)} />
                </TableCell>

                {/* 22. Emergency Contact */}
                <TableCell>
                  <Input className="w-36" value={row.emergencyContactName ?? ""} onChange={(e) => updateCell(row.employeeId, "emergencyContactName", e.target.value)} />
                </TableCell>

                {/* 23. EC Relationship */}
                <TableCell>
                  <Input className="w-28" value={row.emergencyContactRelationship ?? ""} onChange={(e) => updateCell(row.employeeId, "emergencyContactRelationship", e.target.value)} />
                </TableCell>

                {/* 24. EC Contact Number */}
                <TableCell>
                  <Input className="w-32" value={row.emergencyContactNumber ?? ""} onChange={(e) => updateCell(row.employeeId, "emergencyContactNumber", e.target.value)} />
                </TableCell>

                {/* 25. EC Address */}
                <TableCell>
                  <Input className="w-44" value={row.emergencyContactAddress ?? ""} onChange={(e) => updateCell(row.employeeId, "emergencyContactAddress", e.target.value)} />
                </TableCell>

                {/* 26. Payroll Payment Method */}
                <TableCell>
                  <Select value={row.paymentMethod ?? "BANK_TRANSFER"} onValueChange={(v) => v && updateCell(row.employeeId, "paymentMethod", v)}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {paymentMethodValues.map((v) => (
                        <SelectItem key={v} value={v}>
                          {v.replaceAll("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>

                {/* 27. Bank Name */}
                <TableCell>
                  <Input className="w-32" value={row.bankName ?? ""} onChange={(e) => updateCell(row.employeeId, "bankName", e.target.value)} />
                </TableCell>

                {/* 28. Account Number */}
                <TableCell>
                  <Input className="w-36" value={row.bankAccountNumber ?? ""} onChange={(e) => updateCell(row.employeeId, "bankAccountNumber", e.target.value)} />
                </TableCell>

                {/* 29. Bank Branch */}
                <TableCell>
                  <Input className="w-32" value={row.bankBranch ?? ""} onChange={(e) => updateCell(row.employeeId, "bankBranch", e.target.value)} />
                </TableCell>

                {/* 30. Manager (No OT) Yes/No */}
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <Checkbox
                      checked={row.isManagerialExempt ?? false}
                      onCheckedChange={(checked) => updateCell(row.employeeId, "isManagerialExempt", Boolean(checked))}
                    />
                  </div>
                </TableCell>

                {/* 31. SSS Contributions (Yes/No) */}
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <Checkbox
                      checked={row.isDeductSss ?? true}
                      onCheckedChange={(checked) => updateCell(row.employeeId, "isDeductSss", Boolean(checked))}
                    />
                  </div>
                </TableCell>

                {/* 32. Philhealth Contributions (Yes/No) */}
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <Checkbox
                      checked={row.isDeductPhilhealth ?? true}
                      onCheckedChange={(checked) => updateCell(row.employeeId, "isDeductPhilhealth", Boolean(checked))}
                    />
                  </div>
                </TableCell>

                {/* 33. Pag-IBIG (HDMF) Contributions (Yes/No) */}
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <Checkbox
                      checked={row.isDeductPagibig ?? true}
                      onCheckedChange={(checked) => updateCell(row.employeeId, "isDeductPagibig", Boolean(checked))}
                    />
                  </div>
                </TableCell>

                {/* 34. Withholding Tax Deductions (Yes/No) */}
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <Checkbox
                      checked={row.isDeductWithholdingTax ?? true}
                      onCheckedChange={(checked) => updateCell(row.employeeId, "isDeductWithholdingTax", Boolean(checked))}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex justify-end">
        <Button onClick={saveAll} disabled={saving}>
          {saving ? "Saving..." : `Save all (${rows.length})`}
        </Button>
      </div>
    </div>
  );
}

function ColumnHead({
  label,
  field,
  sortField,
  sortOrder,
  onSort,
  onCopyDown,
}: {
  label: string;
  field: Field;
  sortField: Field | null;
  sortOrder: "asc" | "desc";
  onSort: (field: Field) => void;
  onCopyDown?: (field: Field) => void;
}) {
  const isSorted = sortField === field;
  const copyable = onCopyDown && COPYABLE_FIELDS.has(field);

  return (
    <TableHead className="whitespace-nowrap font-bold text-xs p-2">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onSort(field)}
          className={`flex items-center gap-1 hover:text-foreground transition-colors select-none ${
            isSorted ? "text-blue-600 dark:text-blue-400 font-bold" : "text-slate-700 dark:text-slate-300"
          }`}
          title={`Click to sort by ${label}`}
        >
          <span>{label}</span>
          <span className="shrink-0">
            {isSorted ? (
              sortOrder === "desc" ? (
                <ArrowDown className="size-3.5 text-blue-600 dark:text-blue-400" />
              ) : (
                <ArrowUp className="size-3.5 text-blue-600 dark:text-blue-400" />
              )
            ) : (
              <ArrowUpDown className="size-3 opacity-40 hover:opacity-100" />
            )}
          </span>
        </button>
        {copyable && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={(e) => {
              e.stopPropagation();
              onCopyDown(field);
            }}
            aria-label={`Copy top row's ${label} down to all rows`}
            title="Copy top row's value down to all rows"
            className="h-6 w-6 p-0 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <CopyIcon className="size-3" />
          </Button>
        )}
      </div>
    </TableHead>
  );
}
