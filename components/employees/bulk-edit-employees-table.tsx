"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CopyIcon } from "lucide-react";
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

// Columns where "copy first row down" is offered
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

  function updateCell(index: number, field: Field, value: string | number | boolean) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  function copyDown(field: Field) {
    setRows((prev) => {
      if (prev.length === 0) return prev;
      const value = prev[0][field];
      return prev.map((row, i) => (i === 0 ? row : { ...row, [field]: value }));
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
      <div className="flex justify-end">
        <Button onClick={saveAll} disabled={saving}>
          {saving ? "Saving..." : `Save all (${rows.length})`}
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 dark:bg-slate-900/60">
              <ColumnHead label="EMP_ID" />
              <ColumnHead label="Company" />
              <ColumnHead label="First Name" />
              <ColumnHead label="Last Name" />
              <ColumnHead label="Middle Name" />
              <ColumnHead label="Birthdate" />
              <ColumnHead label="Hire Date" />
              <ColumnHead label="Gender" field="sex" onCopyDown={copyDown} />
              <ColumnHead label="Civil Status" field="civilStatus" onCopyDown={copyDown} />
              <ColumnHead label="Position Title" field="positionTitle" onCopyDown={copyDown} />
              <ColumnHead label="Department" field="departmentName" onCopyDown={copyDown} />
              <ColumnHead label="RANK" field="rank" onCopyDown={copyDown} />
              <ColumnHead label="SCHEDULE Type" field="scheduleType" onCopyDown={copyDown} />
              <ColumnHead label="TIN#" />
              <ColumnHead label="SSS#" />
              <ColumnHead label="PHILHEALTH" />
              <ColumnHead label="PAGIBIG" />
              <ColumnHead label="email" />
              <ColumnHead label="mobile phone" />
              <ColumnHead label="Address" />
              <ColumnHead label="Permanent Address" />
              <ColumnHead label="Emergency Contact" />
              <ColumnHead label="EC Relationship" />
              <ColumnHead label="EC Contact Number" />
              <ColumnHead label="EC Address" />
              <ColumnHead label="Payroll Payment Method" field="paymentMethod" onCopyDown={copyDown} />
              <ColumnHead label="Bank Name" />
              <ColumnHead label="Account Number" />
              <ColumnHead label="Bank Branch" />
              <ColumnHead label="Manager (No OT) Yes/No" field="isManagerialExempt" onCopyDown={copyDown} />
              <ColumnHead label="SSS Contributions (Yes/No)" field="isDeductSss" onCopyDown={copyDown} />
              <ColumnHead label="Philhealth Contributions (Yes/No)" field="isDeductPhilhealth" onCopyDown={copyDown} />
              <ColumnHead label="Pag-IBIG (HDMF) Contributions (Yes/No)" field="isDeductPagibig" onCopyDown={copyDown} />
              <ColumnHead label="Withholding Tax Deductions (Yes/No)" field="isDeductWithholdingTax" onCopyDown={copyDown} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={row.employeeId}>
                {/* 1. EMP_ID */}
                <TableCell>
                  <Input className="w-28 font-semibold" value={row.employeeNumber} onChange={(e) => updateCell(index, "employeeNumber", e.target.value)} />
                </TableCell>

                {/* 2. Company */}
                <TableCell>
                  <Input className="w-36 bg-slate-50 font-medium text-slate-600 dark:bg-slate-900 dark:text-slate-400" value={row.companyName ?? ""} readOnly disabled />
                </TableCell>

                {/* 3. First Name */}
                <TableCell>
                  <Input className="w-32" value={row.firstName} onChange={(e) => updateCell(index, "firstName", e.target.value)} />
                </TableCell>

                {/* 4. Last Name */}
                <TableCell>
                  <Input className="w-32" value={row.lastName} onChange={(e) => updateCell(index, "lastName", e.target.value)} />
                </TableCell>

                {/* 5. Middle Name */}
                <TableCell>
                  <Input className="w-28" value={row.middleName ?? ""} onChange={(e) => updateCell(index, "middleName", e.target.value)} />
                </TableCell>

                {/* 6. Birthdate */}
                <TableCell>
                  <Input className="w-36" type="date" value={row.birthDate} onChange={(e) => updateCell(index, "birthDate", e.target.value)} />
                </TableCell>

                {/* 7. Hire Date */}
                <TableCell>
                  <Input className="w-36" type="date" value={row.dateHired ?? ""} onChange={(e) => updateCell(index, "dateHired", e.target.value)} />
                </TableCell>

                {/* 8. Gender */}
                <TableCell>
                  <Select value={row.sex} onValueChange={(v) => v && updateCell(index, "sex", v)}>
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
                  <Select value={row.civilStatus} onValueChange={(v) => v && updateCell(index, "civilStatus", v)}>
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
                  <Input className="w-36" value={row.positionTitle} onChange={(e) => updateCell(index, "positionTitle", e.target.value)} />
                </TableCell>

                {/* 11. Department */}
                <TableCell>
                  <Input className="w-32" value={row.departmentName ?? ""} onChange={(e) => updateCell(index, "departmentName", e.target.value)} />
                </TableCell>

                {/* 12. RANK */}
                <TableCell>
                  <Input className="w-28" value={row.rank ?? ""} onChange={(e) => updateCell(index, "rank", e.target.value)} />
                </TableCell>

                {/* 13. SCHEDULE Type */}
                <TableCell>
                  <Input className="w-28" value={row.scheduleType ?? ""} onChange={(e) => updateCell(index, "scheduleType", e.target.value)} />
                </TableCell>

                {/* 14. TIN# */}
                <TableCell>
                  <Input className="w-32" value={row.tin ?? ""} onChange={(e) => updateCell(index, "tin", e.target.value)} />
                </TableCell>

                {/* 15. SSS# */}
                <TableCell>
                  <Input className="w-32" value={row.sssNumber ?? ""} onChange={(e) => updateCell(index, "sssNumber", e.target.value)} />
                </TableCell>

                {/* 16. PHILHEALTH */}
                <TableCell>
                  <Input className="w-32" value={row.philhealthNumber ?? ""} onChange={(e) => updateCell(index, "philhealthNumber", e.target.value)} />
                </TableCell>

                {/* 17. PAGIBIG */}
                <TableCell>
                  <Input className="w-32" value={row.pagibigNumber ?? ""} onChange={(e) => updateCell(index, "pagibigNumber", e.target.value)} />
                </TableCell>

                {/* 18. email */}
                <TableCell>
                  <Input className="w-40" type="email" value={row.personalEmail ?? ""} onChange={(e) => updateCell(index, "personalEmail", e.target.value)} />
                </TableCell>

                {/* 19. mobile phone */}
                <TableCell>
                  <Input className="w-32" value={row.mobileNumber ?? ""} onChange={(e) => updateCell(index, "mobileNumber", e.target.value)} />
                </TableCell>

                {/* 20. Address */}
                <TableCell>
                  <Input className="w-44" value={row.currentAddress ?? ""} onChange={(e) => updateCell(index, "currentAddress", e.target.value)} />
                </TableCell>

                {/* 21. Permanent Address */}
                <TableCell>
                  <Input className="w-44" value={row.permanentAddress ?? ""} onChange={(e) => updateCell(index, "permanentAddress", e.target.value)} />
                </TableCell>

                {/* 22. Emergency Contact */}
                <TableCell>
                  <Input className="w-36" value={row.emergencyContactName ?? ""} onChange={(e) => updateCell(index, "emergencyContactName", e.target.value)} />
                </TableCell>

                {/* 23. EC Relationship */}
                <TableCell>
                  <Input className="w-28" value={row.emergencyContactRelationship ?? ""} onChange={(e) => updateCell(index, "emergencyContactRelationship", e.target.value)} />
                </TableCell>

                {/* 24. EC Contact Number */}
                <TableCell>
                  <Input className="w-32" value={row.emergencyContactNumber ?? ""} onChange={(e) => updateCell(index, "emergencyContactNumber", e.target.value)} />
                </TableCell>

                {/* 25. EC Address */}
                <TableCell>
                  <Input className="w-44" value={row.emergencyContactAddress ?? ""} onChange={(e) => updateCell(index, "emergencyContactAddress", e.target.value)} />
                </TableCell>

                {/* 26. Payroll Payment Method */}
                <TableCell>
                  <Select value={row.paymentMethod ?? "BANK_TRANSFER"} onValueChange={(v) => v && updateCell(index, "paymentMethod", v)}>
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
                  <Input className="w-32" value={row.bankName ?? ""} onChange={(e) => updateCell(index, "bankName", e.target.value)} />
                </TableCell>

                {/* 28. Account Number */}
                <TableCell>
                  <Input className="w-36" value={row.bankAccountNumber ?? ""} onChange={(e) => updateCell(index, "bankAccountNumber", e.target.value)} />
                </TableCell>

                {/* 29. Bank Branch */}
                <TableCell>
                  <Input className="w-32" value={row.bankBranch ?? ""} onChange={(e) => updateCell(index, "bankBranch", e.target.value)} />
                </TableCell>

                {/* 30. Manager (No OT) Yes/No */}
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <Checkbox
                      checked={row.isManagerialExempt ?? false}
                      onCheckedChange={(checked) => updateCell(index, "isManagerialExempt", Boolean(checked))}
                    />
                  </div>
                </TableCell>

                {/* 31. SSS Contributions (Yes/No) */}
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <Checkbox
                      checked={row.isDeductSss ?? true}
                      onCheckedChange={(checked) => updateCell(index, "isDeductSss", Boolean(checked))}
                    />
                  </div>
                </TableCell>

                {/* 32. Philhealth Contributions (Yes/No) */}
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <Checkbox
                      checked={row.isDeductPhilhealth ?? true}
                      onCheckedChange={(checked) => updateCell(index, "isDeductPhilhealth", Boolean(checked))}
                    />
                  </div>
                </TableCell>

                {/* 33. Pag-IBIG (HDMF) Contributions (Yes/No) */}
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <Checkbox
                      checked={row.isDeductPagibig ?? true}
                      onCheckedChange={(checked) => updateCell(index, "isDeductPagibig", Boolean(checked))}
                    />
                  </div>
                </TableCell>

                {/* 34. Withholding Tax Deductions (Yes/No) */}
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <Checkbox
                      checked={row.isDeductWithholdingTax ?? true}
                      onCheckedChange={(checked) => updateCell(index, "isDeductWithholdingTax", Boolean(checked))}
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
  onCopyDown,
}: {
  label: string;
  field?: Field;
  onCopyDown?: (field: Field) => void;
}) {
  const copyable = field && onCopyDown && COPYABLE_FIELDS.has(field);
  return (
    <TableHead className="whitespace-nowrap font-bold text-xs">
      <div className="flex items-center gap-1">
        {label}
        {copyable && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => onCopyDown(field)}
            aria-label={`Copy first row's ${label} down to all rows`}
            title="Copy top row's value down to all rows"
          >
            <CopyIcon />
          </Button>
        )}
      </div>
    </TableHead>
  );
}
