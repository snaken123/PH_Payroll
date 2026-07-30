"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { timesheetStatusValues, holidayTypeValues } from "@/lib/validations/attendance";

interface EmployeeOption {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
}

interface TimesheetEntryDTO {
  employeeId: string;
  workDate: string;
  status: string;
  timeIn: string | null;
  timeOut: string | null;
  scheduledHours: string;
  lateMinutes: number;
  undertimeMinutes: number;
  regularHours: string;
  overtimeHours: string;
  nightDiffHours: string;
  holidayType: string | null;
  isRestDay: boolean;
}

interface HolidayDTO {
  date: string;
  holidayType: string;
}

interface GridRow {
  key: string;
  employeeId: string;
  employeeLabel: string;
  workDate: string;
  status: string;
  timeIn: string;
  timeOut: string;
  scheduledHours: number;
  lateMinutes: number;
  undertimeMinutes: number;
  regularHours: number;
  overtimeHours: number;
  nightDiffHours: number;
  holidayType: string;
  isRestDay: boolean;
}

type EditableField =
  | "status"
  | "timeIn"
  | "timeOut"
  | "scheduledHours"
  | "lateMinutes"
  | "undertimeMinutes"
  | "regularHours"
  | "overtimeHours"
  | "nightDiffHours"
  | "holidayType"
  | "isRestDay";

function toTimeString(dt: string | null): string {
  if (!dt) return "";
  const d = new Date(dt);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function enumerateDates(start: string, end: string): string[] {
  const dates: string[] = [];
  for (let d = new Date(`${start}T00:00:00Z`); d <= new Date(`${end}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

/** Mirrors lib/services/attendanceDefaults.ts so a day with no entry yet
 * still shows a sensible, immediately-editable default. */
function defaultForDate(workDate: string, holidaysByDate: Map<string, string>) {
  const isSunday = new Date(`${workDate}T00:00:00Z`).getUTCDay() === 0;
  const holidayType = holidaysByDate.get(workDate);

  if (isSunday) {
    return { status: "REST_DAY", scheduledHours: 0, regularHours: 0, isRestDay: true, holidayType: "" };
  }
  if (holidayType) {
    return { status: "HOLIDAY", scheduledHours: 8, regularHours: 0, isRestDay: false, holidayType };
  }
  return { status: "PRESENT", scheduledHours: 8, regularHours: 8, isRestDay: false, holidayType: "" };
}

function defaultRange() {
  const now = new Date();
  const day = now.getUTCDate();
  const firstHalf = day <= 15;
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), firstHalf ? 1 : 16));
  const end = firstHalf
    ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 15))
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export function AttendanceGrid() {
  const [{ start, end }, setRange] = useState(defaultRange());
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [entries, setEntries] = useState<TimesheetEntryDTO[]>([]);
  const [holidays, setHolidays] = useState<HolidayDTO[]>([]);
  const [rows, setRows] = useState<GridRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [quickSelectDate, setQuickSelectDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/timesheets/grid?start=${start}&end=${end}`);
    setLoading(false);
    if (!res.ok) {
      toast.error("Failed to load attendance");
      return;
    }
    const body = await res.json();
    setEmployees(body.employees);
    setEntries(body.timesheets);
    setHolidays(body.holidays);
  }, [start, end]);

  useEffect(() => {
    load();
  }, [load]);

  // Rebuild the full employee x day grid whenever the loaded data changes —
  // any date with no saved entry gets a computed default row instead of a
  // blank cell, so every row is immediately editable and saveable.
  useEffect(() => {
    const dates = enumerateDates(start, end);
    const holidaysByDate = new Map(holidays.map((h) => [h.date.slice(0, 10), h.holidayType]));
    const entryByKey = new Map(entries.map((e) => [`${e.employeeId}_${e.workDate.slice(0, 10)}`, e]));

    const nextRows: GridRow[] = [];
    for (const date of dates) {
      for (const emp of employees) {
        const key = `${emp.id}_${date}`;
        const existing = entryByKey.get(key);
        const label = `${emp.lastName}, ${emp.firstName} (${emp.employeeNumber})`;

        if (existing) {
          nextRows.push({
            key,
            employeeId: emp.id,
            employeeLabel: label,
            workDate: date,
            status: existing.status,
            timeIn: toTimeString(existing.timeIn),
            timeOut: toTimeString(existing.timeOut),
            scheduledHours: Number(existing.scheduledHours),
            lateMinutes: existing.lateMinutes,
            undertimeMinutes: existing.undertimeMinutes,
            regularHours: Number(existing.regularHours),
            overtimeHours: Number(existing.overtimeHours),
            nightDiffHours: Number(existing.nightDiffHours),
            holidayType: existing.holidayType ?? "",
            isRestDay: existing.isRestDay,
          });
        } else {
          const d = defaultForDate(date, holidaysByDate);
          nextRows.push({
            key,
            employeeId: emp.id,
            employeeLabel: label,
            workDate: date,
            status: d.status,
            timeIn: "",
            timeOut: "",
            scheduledHours: d.scheduledHours,
            lateMinutes: 0,
            undertimeMinutes: 0,
            regularHours: d.regularHours,
            overtimeHours: 0,
            nightDiffHours: 0,
            holidayType: d.holidayType,
            isRestDay: d.isRestDay,
          });
        }
      }
    }
    setRows(nextRows);
    setSelected(new Set());
  }, [employees, entries, holidays, start, end]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter((r) => r.employeeLabel.toLowerCase().includes(q));
  }, [rows, search]);

  const uniqueDates = useMemo(() => enumerateDates(start, end), [start, end]);

  function updateRow(key: string, patch: Partial<GridRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function toggleRow(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAllFiltered(checked: boolean) {
    setSelected(checked ? new Set(filteredRows.map((r) => r.key)) : new Set());
  }

  function selectDate() {
    if (!quickSelectDate) return;
    setSelected(new Set(filteredRows.filter((r) => r.workDate === quickSelectDate).map((r) => r.key)));
  }

  // Applies to selected rows, or every visible (filtered) row if nothing is
  // checked — lets "Mark all present" work with zero clicks of setup, while
  // checkbox selection (optionally narrowed to one date via "Quick select
  // date") targets a specific date or subset of employees precisely.
  function applyToTarget(patch: Partial<GridRow>) {
    const targetKeys = selected.size > 0 ? selected : new Set(filteredRows.map((r) => r.key));
    setRows((prev) => prev.map((r) => (targetKeys.has(r.key) ? { ...r, ...patch } : r)));
  }

  function resetSelectedToDefault() {
    const holidaysByDate = new Map(holidays.map((h) => [h.date.slice(0, 10), h.holidayType]));
    const targetKeys = selected.size > 0 ? selected : new Set(filteredRows.map((r) => r.key));
    setRows((prev) =>
      prev.map((r) => {
        if (!targetKeys.has(r.key)) return r;
        const d = defaultForDate(r.workDate, holidaysByDate);
        return {
          ...r,
          status: d.status,
          timeIn: "",
          timeOut: "",
          scheduledHours: d.scheduledHours,
          lateMinutes: 0,
          undertimeMinutes: 0,
          regularHours: d.regularHours,
          overtimeHours: 0,
          nightDiffHours: 0,
          holidayType: d.holidayType,
          isRestDay: d.isRestDay,
        };
      })
    );
  }

  async function generateDefaults() {
    setGenerating(true);
    const res = await fetch("/api/timesheets/bulk-generate-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ start, end }),
    });
    setGenerating(false);
    if (!res.ok) {
      toast.error("Failed to generate default entries");
      return;
    }
    const body = await res.json();
    toast.success(`Generated ${body.created} entr${body.created === 1 ? "y" : "ies"} for ${body.employeeCount} employees`);
    load();
  }

  async function saveAll() {
    setSaving(true);
    const res = await fetch("/api/timesheets/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rows: rows.map((r) => ({
          employeeId: r.employeeId,
          workDate: r.workDate,
          status: r.status,
          timeIn: r.timeIn,
          timeOut: r.timeOut,
          scheduledHours: r.scheduledHours,
          lateMinutes: r.lateMinutes,
          undertimeMinutes: r.undertimeMinutes,
          regularHours: r.regularHours,
          overtimeHours: r.overtimeHours,
          nightDiffHours: r.nightDiffHours,
          holidayType: r.holidayType || null,
          isRestDay: r.isRestDay,
        })),
      }),
    });
    setSaving(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error?.formErrors?.join?.(", ") ?? body?.error ?? "Failed to save");
      return;
    }

    toast.success(`Saved ${rows.length} entries`);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label htmlFor="gridStart">Start</Label>
          <Input id="gridStart" type="date" value={start} onChange={(e) => setRange((r) => ({ ...r, start: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="gridEnd">End</Label>
          <Input id="gridEnd" type="date" value={end} onChange={(e) => setRange((r) => ({ ...r, end: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="gridSearch">Search employee</Label>
          <Input id="gridSearch" className="w-48" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or number…" />
        </div>
        <Button variant="outline" onClick={generateDefaults} disabled={generating}>
          {generating ? "Generating..." : "Generate default entries"}
        </Button>
      </div>

      <div className="rounded-lg border p-4">
        <p className="mb-3 text-sm font-medium">Global actions</p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex items-end gap-2">
            <div className="space-y-1">
              <Label htmlFor="quickSelectDate" className="text-xs">Quick-select a date</Label>
              <Select value={quickSelectDate} onValueChange={(v) => setQuickSelectDate(v ?? "")}>
                <SelectTrigger id="quickSelectDate" className="w-40">
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueDates.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={selectDate} disabled={!quickSelectDate}>
              Select all on that date
            </Button>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => applyToTarget({ status: "PRESENT", scheduledHours: 8, regularHours: 8, overtimeHours: 0, lateMinutes: 0, undertimeMinutes: 0, isRestDay: false, holidayType: "" })}>
              Mark present
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => applyToTarget({ status: "ABSENT", scheduledHours: 8, regularHours: 0, overtimeHours: 0, lateMinutes: 0, undertimeMinutes: 0, isRestDay: false, holidayType: "" })}>
              Mark absent
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => applyToTarget({ status: "HOLIDAY", holidayType: "SPECIAL_NON_WORKING", scheduledHours: 8, regularHours: 0, isRestDay: false })}>
              Apply special holiday
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => applyToTarget({ status: "HOLIDAY", holidayType: "REGULAR_HOLIDAY", scheduledHours: 8, regularHours: 0, isRestDay: false })}>
              Apply regular holiday
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => applyToTarget({ status: "REST_DAY", scheduledHours: 0, regularHours: 0, isRestDay: true, holidayType: "" })}>
              Apply rest day
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={resetSelectedToDefault}>
              Reset to default
            </Button>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Actions apply to checked rows, or to every visible row if none are checked.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : (
        <>
          <div className="flex justify-end">
            <Button onClick={saveAll} disabled={saving}>
              {saving ? "Saving..." : `Save all (${rows.length})`}
            </Button>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <Checkbox
                      checked={filteredRows.length > 0 && filteredRows.every((r) => selected.has(r.key))}
                      onCheckedChange={(checked) => toggleAllFiltered(!!checked)}
                      aria-label="Select all visible rows"
                    />
                  </TableHead>
                  <TableHead className="whitespace-nowrap">Date</TableHead>
                  <TableHead className="whitespace-nowrap">Employee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time in</TableHead>
                  <TableHead>Time out</TableHead>
                  <TableHead>Late (min)</TableHead>
                  <TableHead>Undertime (min)</TableHead>
                  <TableHead>Regular hrs</TableHead>
                  <TableHead>OT hrs</TableHead>
                  <TableHead>Night diff</TableHead>
                  <TableHead>Rest day</TableHead>
                  <TableHead>Holiday</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((r) => (
                  <TableRow key={r.key}>
                    <TableCell>
                      <Checkbox checked={selected.has(r.key)} onCheckedChange={() => toggleRow(r.key)} aria-label={`Select ${r.employeeLabel} on ${r.workDate}`} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{r.workDate}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{r.employeeLabel}</TableCell>
                    <TableCell>
                      <Select value={r.status} onValueChange={(v) => v && updateRow(r.key, { status: v })}>
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {timesheetStatusValues.map((v) => (
                            <SelectItem key={v} value={v}>
                              {v.replaceAll("_", " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input className="w-24" type="time" value={r.timeIn} onChange={(e) => updateRow(r.key, { timeIn: e.target.value })} />
                    </TableCell>
                    <TableCell>
                      <Input className="w-24" type="time" value={r.timeOut} onChange={(e) => updateRow(r.key, { timeOut: e.target.value })} />
                    </TableCell>
                    <TableCell>
                      <Input className="w-16" type="number" value={r.lateMinutes} onChange={(e) => updateRow(r.key, { lateMinutes: Number(e.target.value) })} />
                    </TableCell>
                    <TableCell>
                      <Input className="w-16" type="number" value={r.undertimeMinutes} onChange={(e) => updateRow(r.key, { undertimeMinutes: Number(e.target.value) })} />
                    </TableCell>
                    <TableCell>
                      <Input className="w-16" type="number" step="0.25" value={r.regularHours} onChange={(e) => updateRow(r.key, { regularHours: Number(e.target.value) })} />
                    </TableCell>
                    <TableCell>
                      <Input className="w-16" type="number" step="0.25" value={r.overtimeHours} onChange={(e) => updateRow(r.key, { overtimeHours: Number(e.target.value) })} />
                    </TableCell>
                    <TableCell>
                      <Input className="w-16" type="number" step="0.25" value={r.nightDiffHours} onChange={(e) => updateRow(r.key, { nightDiffHours: Number(e.target.value) })} />
                    </TableCell>
                    <TableCell>
                      <Checkbox checked={r.isRestDay} onCheckedChange={(checked) => updateRow(r.key, { isRestDay: !!checked })} aria-label="Rest day" />
                    </TableCell>
                    <TableCell>
                      <Select value={r.holidayType || "none"} onValueChange={(v) => updateRow(r.key, { holidayType: v === "none" ? "" : (v ?? "") })}>
                        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {holidayTypeValues.map((v) => (
                            <SelectItem key={v} value={v}>
                              {v.replaceAll("_", " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
        </>
      )}
    </div>
  );
}
