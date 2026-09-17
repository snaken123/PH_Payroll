"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PencilIcon, MoreVerticalIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { timesheetStatusValues, holidayTypeValues, extractTimeOfDay } from "@/lib/validations/attendance";
import { calculateTimesheetHours, type CompanyAttendanceConfig } from "@/lib/attendance/calculateHours";

interface EmployeeOption {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  scheduleType?: string | null;
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

interface CellState {
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

function cellKey(employeeId: string, workDate: string) {
  return `${employeeId}::${workDate}`;
}

function toTimeString(dt: string | null): string {
  return extractTimeOfDay(dt);
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
function defaultForDate(workDate: string, holidaysByDate: Map<string, string>): CellState {
  const isSunday = new Date(`${workDate}T00:00:00Z`).getUTCDay() === 0;
  const holidayType = holidaysByDate.get(workDate);

  if (isSunday) {
    return {
      status: "REST_DAY",
      timeIn: "",
      timeOut: "",
      scheduledHours: 0,
      lateMinutes: 0,
      undertimeMinutes: 0,
      regularHours: 0,
      overtimeHours: 0,
      nightDiffHours: 0,
      holidayType: "",
      isRestDay: true,
    };
  }
  if (holidayType) {
    return {
      status: "HOLIDAY",
      timeIn: "",
      timeOut: "",
      scheduledHours: 8,
      lateMinutes: 0,
      undertimeMinutes: 0,
      regularHours: 0,
      overtimeHours: 0,
      nightDiffHours: 0,
      holidayType,
      isRestDay: false,
    };
  }
  return {
    status: "PRESENT",
    timeIn: "",
    timeOut: "",
    scheduledHours: 8,
    lateMinutes: 0,
    undertimeMinutes: 0,
    regularHours: 8,
    overtimeHours: 0,
    nightDiffHours: 0,
    holidayType: "",
    isRestDay: false,
  };
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

import { hasPermission } from "@/lib/permissions";

export function AttendanceGrid() {
  const { data: session } = useSession();
  const companyId = session?.user?.companyId;
  const userPermissions = session?.user?.permissions ?? [];
  const platformRole = session?.user?.platformRole;
  const canUseGlobalActions = hasPermission(userPermissions, "attendance.global_actions", platformRole);
  const [{ start, end }, setRange] = useState(defaultRange());
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [entries, setEntries] = useState<TimesheetEntryDTO[]>([]);
  const [holidays, setHolidays] = useState<HolidayDTO[]>([]);
  const [config, setConfig] = useState<CompanyAttendanceConfig | undefined>(undefined);
  const [cells, setCells] = useState<Record<string, CellState>>({});
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingCell, setEditingCell] = useState<{ employeeId: string; date: string } | null>(null);
  const [adHocHolidayDate, setAdHocHolidayDate] = useState<string | null>(null);
  const [adHocHolidayName, setAdHocHolidayName] = useState("");
  const [adHocHolidayType, setAdHocHolidayType] = useState<"SPECIAL_NON_WORKING" | "REGULAR_HOLIDAY">("SPECIAL_NON_WORKING");
  const [savingAdHoc, setSavingAdHoc] = useState(false);

  const dates = useMemo(() => enumerateDates(start, end), [start, end]);

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
    setConfig(body.config);
  }, [start, end, companyId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  // Rebuild the full employee x day cell map whenever loaded data changes —
  // any day with no saved entry gets a computed default cell instead of a
  // blank one, so the whole matrix is immediately editable.
  useEffect(() => {
    const holidaysByDate = new Map(holidays.map((h) => [h.date.slice(0, 10), h.holidayType]));
    const entryByKey = new Map(entries.map((e) => [cellKey(e.employeeId, e.workDate.slice(0, 10)), e]));

    const next: Record<string, CellState> = {};
    for (const emp of employees) {
      for (const date of dates) {
        const key = cellKey(emp.id, date);
        const existing = entryByKey.get(key);
        next[key] = existing
          ? {
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
            }
          : defaultForDate(date, holidaysByDate);
      }
    }
    void Promise.resolve().then(() => {
      setCells(next);
      setSelectedEmployees(new Set());
      setSelectedDates(new Set());
    });
  }, [employees, entries, holidays, dates]);

  const filteredEmployees = useMemo(() => {
    if (!search.trim()) return employees;
    const q = search.trim().toLowerCase();
    return employees.filter((e) => `${e.lastName} ${e.firstName} ${e.employeeNumber}`.toLowerCase().includes(q));
  }, [employees, search]);

  function updateCell(employeeId: string, date: string, patch: Partial<CellState>) {
    setCells((prev) => {
      const key = cellKey(employeeId, date);
      const current = prev[key];
      if (!current) return prev;

      let nextCell = { ...current, ...patch };

      if (patch.status === "HOLIDAY" && !nextCell.holidayType) {
        nextCell.holidayType = "REGULAR_HOLIDAY";
      } else if (patch.status && patch.status !== "HOLIDAY" && patch.holidayType === undefined) {
        nextCell.holidayType = "";
      }

      if (patch.timeIn !== undefined || patch.timeOut !== undefined) {
        const emp = employees.find((e) => e.id === employeeId);
        const calc = calculateTimesheetHours({
          scheduleType: emp?.scheduleType,
          timeIn: nextCell.timeIn,
          timeOut: nextCell.timeOut,
          config,
        });
        nextCell = {
          ...nextCell,
          regularHours: calc.regularHours,
          overtimeHours: calc.overtimeHours,
          lateMinutes: calc.lateMinutes,
          undertimeMinutes: calc.undertimeMinutes,
        };
      }

      return { ...prev, [key]: nextCell };
    });
  }

  function toggleEmployee(employeeId: string) {
    setSelectedEmployees((prev) => {
      const next = new Set(prev);
      if (next.has(employeeId)) next.delete(employeeId);
      else next.add(employeeId);
      return next;
    });
  }

  function toggleAllEmployees(checked: boolean) {
    setSelectedEmployees(checked ? new Set(filteredEmployees.map((e) => e.id)) : new Set());
  }

  function toggleDate(date: string) {
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  // Global actions target the cross-product of selected employees x selected
  // dates — either axis left empty means "every visible employee/date",
  // so e.g. checking just one date column applies an action to everyone on
  // that day, and checking just one employee row applies it across their
  // whole visible range.
  function targetCellKeys(): Set<string> {
    const empIds = selectedEmployees.size > 0 ? [...selectedEmployees] : filteredEmployees.map((e) => e.id);
    const targetDates = selectedDates.size > 0 ? [...selectedDates] : dates;
    const keys = new Set<string>();
    for (const empId of empIds) {
      for (const date of targetDates) keys.add(cellKey(empId, date));
    }
    return keys;
  }

  function applyToTarget(patch: Partial<CellState>) {
    const keys = targetCellKeys();
    setCells((prev) => {
      const next = { ...prev };
      for (const key of keys) {
        if (next[key]) next[key] = { ...next[key], ...patch };
      }
      return next;
    });
  }

  function applyToColumn(date: string, patch: Partial<CellState>) {
    setCells((prev) => {
      const next = { ...prev };
      for (const emp of filteredEmployees) {
        const key = cellKey(emp.id, date);
        if (next[key]) next[key] = { ...next[key], ...patch };
      }
      return next;
    });
  }

  async function handleSaveAdHocHoliday() {
    if (!adHocHolidayDate || !adHocHolidayName.trim()) {
      toast.error("Please provide a holiday name");
      return;
    }
    setSavingAdHoc(true);
    const res = await fetch("/api/holidays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: adHocHolidayDate,
        name: adHocHolidayName.trim(),
        holidayType: adHocHolidayType,
      }),
    });
    setSavingAdHoc(false);
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      toast.error(err?.error ?? "Failed to save holiday");
      return;
    }

    applyToColumn(adHocHolidayDate, {
      status: "HOLIDAY",
      holidayType: adHocHolidayType,
      scheduledHours: 8,
      regularHours: 0,
      isRestDay: false,
    });

    toast.success(`Saved "${adHocHolidayName}" to Company Holidays and applied to ${adHocHolidayDate}`);
    setAdHocHolidayDate(null);
    setAdHocHolidayName("");
    load();
  }

  function resetTargetToDefault() {
    const keys = targetCellKeys();
    const holidaysByDate = new Map(holidays.map((h) => [h.date.slice(0, 10), h.holidayType]));
    setCells((prev) => {
      const next = { ...prev };
      for (const key of keys) {
        const [, date] = key.split("::");
        next[key] = defaultForDate(date, holidaysByDate);
      }
      return next;
    });
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
    const rows = employees.flatMap((emp) =>
      dates.map((date) => {
        const c = cells[cellKey(emp.id, date)];
        return {
          employeeId: emp.id,
          workDate: date,
          status: c.status,
          timeIn: c.timeIn,
          timeOut: c.timeOut,
          scheduledHours: c.scheduledHours,
          lateMinutes: c.lateMinutes,
          undertimeMinutes: c.undertimeMinutes,
          regularHours: c.regularHours,
          overtimeHours: c.overtimeHours,
          nightDiffHours: c.nightDiffHours,
          holidayType: c.holidayType || null,
          isRestDay: c.isRestDay,
        };
      })
    );

    const res = await fetch("/api/timesheets/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
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

  const editingState = editingCell ? cells[cellKey(editingCell.employeeId, editingCell.date)] : null;
  const editingEmployee = editingCell ? employees.find((e) => e.id === editingCell.employeeId) : null;

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

      {canUseGlobalActions && (
        <div className="rounded-lg border p-4">
          <p className="mb-3 text-sm font-medium">Global actions</p>
          <div className="flex flex-wrap gap-2">
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
            <Button type="button" variant="ghost" size="sm" onClick={resetTargetToDefault}>
              Reset to default
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Check employee rows and/or date columns to target them specifically — actions apply to every visible
            cell if nothing is checked, to a whole employee&apos;s row if only they&apos;re checked, to a whole
            date&apos;s column if only that date is checked, or to the intersection if both are checked.
          </p>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : (
        <>
          <div className="flex justify-end">
            <Button onClick={saveAll} disabled={saving}>
              {saving ? "Saving..." : "Save all"}
            </Button>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 z-10 w-56 whitespace-nowrap bg-background">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={filteredEmployees.length > 0 && filteredEmployees.every((e) => selectedEmployees.has(e.id))}
                        onCheckedChange={(checked) => toggleAllEmployees(!!checked)}
                        aria-label="Select all visible employees"
                      />
                      Employee
                    </div>
                  </TableHead>
                  {dates.map((date) => (
                    <TableHead key={date} className="w-36 min-w-[144px] whitespace-nowrap">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1">
                          <Checkbox
                            checked={selectedDates.has(date)}
                            onCheckedChange={() => toggleDate(date)}
                            aria-label={`Select column ${date}`}
                          />
                          <span className="text-xs font-semibold">{date.slice(5)}</span>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="ghost" size="icon-xs" title={`Actions for ${date}`}>
                                <MoreVerticalIcon className="size-3.5 text-muted-foreground" />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                applyToColumn(date, {
                                  status: "HOLIDAY",
                                  holidayType: "SPECIAL_NON_WORKING",
                                  scheduledHours: 8,
                                  regularHours: 0,
                                  isRestDay: false,
                                })
                              }
                            >
                              Set as Special Holiday
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                applyToColumn(date, {
                                  status: "HOLIDAY",
                                  holidayType: "REGULAR_HOLIDAY",
                                  scheduledHours: 8,
                                  regularHours: 0,
                                  isRestDay: false,
                                })
                              }
                            >
                              Set as Regular Holiday
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setAdHocHolidayDate(date);
                                setAdHocHolidayName("Ad-hoc Special Holiday");
                                setAdHocHolidayType("SPECIAL_NON_WORKING");
                              }}
                            >
                              Save to Company Calendar & Apply...
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                applyToColumn(date, {
                                  status: "PRESENT",
                                  scheduledHours: 8,
                                  regularHours: 8,
                                  overtimeHours: 0,
                                  lateMinutes: 0,
                                  undertimeMinutes: 0,
                                  isRestDay: false,
                                  holidayType: "",
                                })
                              }
                            >
                              Set as Present
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                applyToColumn(date, {
                                  status: "ABSENT",
                                  scheduledHours: 8,
                                  regularHours: 0,
                                  overtimeHours: 0,
                                  lateMinutes: 0,
                                  undertimeMinutes: 0,
                                  isRestDay: false,
                                  holidayType: "",
                                })
                              }
                            >
                              Set as Absent
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                applyToColumn(date, {
                                  status: "REST_DAY",
                                  scheduledHours: 0,
                                  regularHours: 0,
                                  isRestDay: true,
                                  holidayType: "",
                                })
                              }
                            >
                              Set as Rest Day
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="sticky left-0 z-10 whitespace-nowrap bg-background">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedEmployees.has(emp.id)}
                          onCheckedChange={() => toggleEmployee(emp.id)}
                          aria-label={`Select ${emp.lastName}, ${emp.firstName}`}
                        />
                        <span className="text-sm">
                          {emp.lastName}, {emp.firstName} ({emp.employeeNumber})
                        </span>
                      </div>
                    </TableCell>
                    {dates.map((date) => {
                      const c = cells[cellKey(emp.id, date)];
                      if (!c) return <TableCell key={date} />;
                      return (
                        <TableCell key={date} className="p-1 align-top">
                          <div className="flex w-32 flex-col gap-1">
                            <Select value={c.status} onValueChange={(v) => v && updateCell(emp.id, date, { status: v })}>
                              <SelectTrigger className="h-7 px-1.5 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {timesheetStatusValues.map((v) => (
                                  <SelectItem key={v} value={v}>
                                    {v.replaceAll("_", " ")}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div className="flex items-center gap-1">
                              <Input
                                className="h-7 w-14 px-1 text-xs text-center font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                type="number"
                                step="0.25"
                                title="Regular hours"
                                value={c.regularHours}
                                onChange={(e) => updateCell(emp.id, date, { regularHours: Number(e.target.value) })}
                              />
                              <Input
                                className="h-7 w-14 px-1 text-xs text-center font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                type="number"
                                step="0.25"
                                title="Overtime hours"
                                value={c.overtimeHours}
                                onChange={(e) => updateCell(emp.id, date, { overtimeHours: Number(e.target.value) })}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => setEditingCell({ employeeId: emp.id, date })}
                                aria-label={`More details for ${emp.lastName} on ${date}`}
                                title="Time in/out, late, undertime, night diff, rest day, holiday"
                              >
                                <PencilIcon />
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-end">
            <Button onClick={saveAll} disabled={saving}>
              {saving ? "Saving..." : "Save all"}
            </Button>
          </div>
        </>
      )}

      <Dialog open={!!editingCell} onOpenChange={(open) => !open && setEditingCell(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingEmployee ? `${editingEmployee.lastName}, ${editingEmployee.firstName}` : ""} — {editingCell?.date}
            </DialogTitle>
            <DialogDescription>Time in/out, late, undertime, night differential, rest day, and holiday type.</DialogDescription>
          </DialogHeader>
          {editingCell && editingState && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="detailTimeIn">Time in</Label>
                <Input
                  id="detailTimeIn"
                  type="time"
                  value={editingState.timeIn}
                  onChange={(e) => updateCell(editingCell.employeeId, editingCell.date, { timeIn: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="detailTimeOut">Time out</Label>
                <Input
                  id="detailTimeOut"
                  type="time"
                  value={editingState.timeOut}
                  onChange={(e) => updateCell(editingCell.employeeId, editingCell.date, { timeOut: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="detailLate">Late (min)</Label>
                <Input
                  id="detailLate"
                  type="number"
                  value={editingState.lateMinutes}
                  onChange={(e) => updateCell(editingCell.employeeId, editingCell.date, { lateMinutes: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="detailUndertime">Undertime (min)</Label>
                <Input
                  id="detailUndertime"
                  type="number"
                  value={editingState.undertimeMinutes}
                  onChange={(e) => updateCell(editingCell.employeeId, editingCell.date, { undertimeMinutes: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="detailNightDiff">Night diff hours</Label>
                <Input
                  id="detailNightDiff"
                  type="number"
                  step="0.25"
                  value={editingState.nightDiffHours}
                  onChange={(e) => updateCell(editingCell.employeeId, editingCell.date, { nightDiffHours: Number(e.target.value) })}
                />
              </div>
              <div className="flex items-center gap-2 self-end pb-2">
                <Switch
                  checked={editingState.isRestDay}
                  onCheckedChange={(checked) => updateCell(editingCell.employeeId, editingCell.date, { isRestDay: !!checked })}
                  id="detailRestDay"
                />
                <Label htmlFor="detailRestDay">Rest day</Label>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="detailHolidayType">Holiday type</Label>
                <Select
                  value={editingState.holidayType || "none"}
                  onValueChange={(v) => updateCell(editingCell.employeeId, editingCell.date, { holidayType: v === "none" ? "" : (v ?? "") })}
                >
                  <SelectTrigger id="detailHolidayType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {holidayTypeValues.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v.replaceAll("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setEditingCell(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!adHocHolidayDate} onOpenChange={(open) => !open && setAdHocHolidayDate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register Company Holiday — {adHocHolidayDate}</DialogTitle>
            <DialogDescription>
              Save this ad-hoc date into the company holiday calendar. It will automatically apply to all employees.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="adHocName">Holiday name</Label>
              <Input
                id="adHocName"
                value={adHocHolidayName}
                onChange={(e) => setAdHocHolidayName(e.target.value)}
                placeholder="e.g. Special Non-Working Day, Typhoon Suspension..."
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="adHocType">Holiday type</Label>
              <Select
                value={adHocHolidayType}
                onValueChange={(v) => setAdHocHolidayType(v as "SPECIAL_NON_WORKING" | "REGULAR_HOLIDAY")}
              >
                <SelectTrigger id="adHocType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SPECIAL_NON_WORKING">Special Non-Working Holiday</SelectItem>
                  <SelectItem value="REGULAR_HOLIDAY">Regular Holiday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdHocHolidayDate(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAdHocHoliday} disabled={savingAdHoc}>
              {savingAdHoc ? "Saving..." : "Save & Apply to Grid"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
