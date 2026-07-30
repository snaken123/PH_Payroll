"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  employmentStatusValues,
  employeeTypeValues,
  payBasisValues,
  type BulkEmployeeRow,
} from "@/lib/validations/employee";

type Field = keyof BulkEmployeeRow;

// Columns where "copy first row down" is offered — fields commonly shared
// across employees. Identity fields (name, government IDs, birth date) and
// basic rate are deliberately excluded: copying those in bulk would either
// be nonsensical (everyone getting the same TIN) or financially risky
// (everyone getting the same salary by one misclick).
const COPYABLE_FIELDS = new Set<Field>([
  "civilStatus",
  "positionTitle",
  "departmentName",
  "employmentStatus",
  "employeeType",
  "payBasis",
]);

export function BulkEditEmployeesTable({ initialRows }: { initialRows: BulkEmployeeRow[] }) {
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
            <TableRow>
              <ColumnHead label="Employee #" />
              <ColumnHead label="First name" />
              <ColumnHead label="Last name" />
              <ColumnHead label="Middle name" />
              <ColumnHead label="Birth date" />
              <ColumnHead label="Sex" />
              <ColumnHead label="Civil status" field="civilStatus" onCopyDown={copyDown} />
              <ColumnHead label="Position" field="positionTitle" onCopyDown={copyDown} />
              <ColumnHead label="Department" field="departmentName" onCopyDown={copyDown} />
              <ColumnHead label="Employment status" field="employmentStatus" onCopyDown={copyDown} />
              <ColumnHead label="Employee type" field="employeeType" onCopyDown={copyDown} />
              <ColumnHead label="TIN" />
              <ColumnHead label="SSS" />
              <ColumnHead label="PhilHealth" />
              <ColumnHead label="Pag-IBIG" />
              <ColumnHead label="Pay basis" field="payBasis" onCopyDown={copyDown} />
              <ColumnHead label="Basic rate" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={row.employeeId}>
                <TableCell>
                  <Input className="w-28" value={row.employeeNumber} onChange={(e) => updateCell(index, "employeeNumber", e.target.value)} />
                </TableCell>
                <TableCell>
                  <Input className="w-32" value={row.firstName} onChange={(e) => updateCell(index, "firstName", e.target.value)} />
                </TableCell>
                <TableCell>
                  <Input className="w-32" value={row.lastName} onChange={(e) => updateCell(index, "lastName", e.target.value)} />
                </TableCell>
                <TableCell>
                  <Input className="w-28" value={row.middleName ?? ""} onChange={(e) => updateCell(index, "middleName", e.target.value)} />
                </TableCell>
                <TableCell>
                  <Input className="w-36" type="date" value={row.birthDate} onChange={(e) => updateCell(index, "birthDate", e.target.value)} />
                </TableCell>
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
                <TableCell>
                  <Input className="w-36" value={row.positionTitle} onChange={(e) => updateCell(index, "positionTitle", e.target.value)} />
                </TableCell>
                <TableCell>
                  <Input className="w-32" value={row.departmentName ?? ""} onChange={(e) => updateCell(index, "departmentName", e.target.value)} />
                </TableCell>
                <TableCell>
                  <Select value={row.employmentStatus} onValueChange={(v) => v && updateCell(index, "employmentStatus", v)}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {employmentStatusValues.map((v) => (
                        <SelectItem key={v} value={v}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select value={row.employeeType} onValueChange={(v) => v && updateCell(index, "employeeType", v)}>
                    <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {employeeTypeValues.map((v) => (
                        <SelectItem key={v} value={v}>
                          {v.replaceAll("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input className="w-32" value={row.tin ?? ""} onChange={(e) => updateCell(index, "tin", e.target.value)} />
                </TableCell>
                <TableCell>
                  <Input className="w-32" value={row.sssNumber ?? ""} onChange={(e) => updateCell(index, "sssNumber", e.target.value)} />
                </TableCell>
                <TableCell>
                  <Input className="w-32" value={row.philhealthNumber ?? ""} onChange={(e) => updateCell(index, "philhealthNumber", e.target.value)} />
                </TableCell>
                <TableCell>
                  <Input className="w-32" value={row.pagibigNumber ?? ""} onChange={(e) => updateCell(index, "pagibigNumber", e.target.value)} />
                </TableCell>
                <TableCell>
                  <Select value={row.payBasis} onValueChange={(v) => v && updateCell(index, "payBasis", v)}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {payBasisValues.map((v) => (
                        <SelectItem key={v} value={v}>
                          {v.replaceAll("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input className="w-28" type="number" step="0.01" value={row.basicRate} onChange={(e) => updateCell(index, "basicRate", Number(e.target.value))} />
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
    <TableHead className="whitespace-nowrap">
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
