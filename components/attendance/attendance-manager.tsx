"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { EditTimesheetDialog, type TimesheetFormValues } from "./edit-timesheet-dialog";
import { extractTimeOfDay } from "@/lib/validations/attendance";

interface EmployeeOption {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
}

interface TimesheetRow {
  id: string;
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

export function AttendanceManager({ employees }: { employees: EmployeeOption[] }) {
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? "");
  const [{ start, end }, setRange] = useState(defaultRange());
  const [rows, setRows] = useState<TimesheetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [editingDate, setEditingDate] = useState<string | null>(null);

  const fetchTimesheets = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    const res = await fetch(
      `/api/timesheets?employeeId=${employeeId}&start=${start}&end=${end}`
    );
    setLoading(false);
    if (!res.ok) {
      toast.error("Failed to load timesheets");
      return;
    }
    const body = await res.json();
    setRows(body.timesheets);
  }, [employeeId, start, end]);

  useEffect(() => {
    fetchTimesheets();
  }, [fetchTimesheets]);

  async function generateDefaults() {
    if (!employeeId) return;
    setGenerating(true);
    const res = await fetch("/api/timesheets/bulk-generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId, start, end }),
    });
    setGenerating(false);
    if (!res.ok) {
      toast.error("Failed to generate default entries");
      return;
    }
    const body = await res.json();
    toast.success(`Generated ${body.created} entr${body.created === 1 ? "y" : "ies"}`);
    fetchTimesheets();
  }

  const editingRow = rows.find((r) => r.workDate.slice(0, 10) === editingDate);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Select cutoff</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <Label>Employee</Label>
            <Select value={employeeId} onValueChange={(value) => setEmployeeId(value ?? "")}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.lastName}, {e.firstName} ({e.employeeNumber})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Start</Label>
            <Input
              type="date"
              value={start}
              onChange={(e) => setRange((r) => ({ ...r, start: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>End</Label>
            <Input
              type="date"
              value={end}
              onChange={(e) => setRange((r) => ({ ...r, end: e.target.value }))}
            />
          </div>
          <Button variant="outline" onClick={generateDefaults} disabled={generating || !employeeId}>
            {generating ? "Generating..." : "Generate default entries"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timesheet entries</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No entries yet for this range — click &quot;Generate default entries&quot; to bootstrap.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Regular</TableHead>
                  <TableHead>OT</TableHead>
                  <TableHead>Night diff</TableHead>
                  <TableHead>Late/Undertime (min)</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const dateKey = r.workDate.slice(0, 10);
                  return (
                    <TableRow key={r.id}>
                      <TableCell>{dateKey}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === "PRESENT" ? "default" : "secondary"}>
                          {r.status.replaceAll("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>{r.regularHours}</TableCell>
                      <TableCell>{r.overtimeHours}</TableCell>
                      <TableCell>{r.nightDiffHours}</TableCell>
                      <TableCell>
                        {r.lateMinutes}/{r.undertimeMinutes}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => setEditingDate(dateKey)}>
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {editingDate && editingRow && (
        <EditTimesheetDialog
          open={!!editingDate}
          onOpenChange={(open) => !open && setEditingDate(null)}
          employeeId={employeeId}
          workDate={editingDate}
          initialValues={
            {
              status: editingRow.status,
              timeIn: extractTimeOfDay(editingRow.timeIn),
              timeOut: extractTimeOfDay(editingRow.timeOut),
              scheduledHours: Number(editingRow.scheduledHours),
              lateMinutes: editingRow.lateMinutes,
              undertimeMinutes: editingRow.undertimeMinutes,
              regularHours: Number(editingRow.regularHours),
              overtimeHours: Number(editingRow.overtimeHours),
              nightDiffHours: Number(editingRow.nightDiffHours),
              holidayType: (editingRow.holidayType ?? "") as TimesheetFormValues["holidayType"],
              isRestDay: editingRow.isRestDay,
            } as TimesheetFormValues
          }
          onSaved={fetchTimesheets}
        />
      )}
    </div>
  );
}
