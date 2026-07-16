"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { CreateLeaveRequestDialog } from "./create-leave-request-dialog";

interface EmployeeOption {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
}
interface LeaveTypeOption {
  id: string;
  name: string;
}
interface Balance {
  id: string;
  entitledDays: string;
  usedDays: string;
  carriedOverDays: string;
  adjustedDays: string;
  leaveType: { id: string; name: string };
}
interface LeaveRequestRow {
  id: string;
  startDate: string;
  endDate: string;
  daysCount: string;
  status: string;
  employee: { firstName: string; lastName: string; employeeNumber: string };
  leaveType: { name: string };
}

export function LeaveManager({
  employees,
  leaveTypes,
}: {
  employees: EmployeeOption[];
  leaveTypes: LeaveTypeOption[];
}) {
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? "");
  const [balances, setBalances] = useState<Balance[]>([]);
  const [requests, setRequests] = useState<LeaveRequestRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!employeeId) return;
    const [balancesRes, requestsRes] = await Promise.all([
      fetch(`/api/leave/balances?employeeId=${employeeId}`),
      fetch(`/api/leave/requests?employeeId=${employeeId}`),
    ]);
    if (balancesRes.ok) setBalances((await balancesRes.json()).balances);
    if (requestsRes.ok) setRequests((await requestsRes.json()).requests);
  }, [employeeId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  async function handleDecision(id: string, action: "approve" | "reject") {
    setBusyId(id);
    const res = await fetch(`/api/leave/requests/${id}/${action}`, { method: "POST" });
    setBusyId(null);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? `Failed to ${action} request`);
      return;
    }
    toast.success(action === "approve" ? "Request approved" : "Request rejected");
    fetchAll();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Employee</CardTitle>
          {employeeId && (
            <CreateLeaveRequestDialog
              employeeId={employeeId}
              leaveTypes={leaveTypes}
              onCreated={fetchAll}
            />
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <Label>Select employee</Label>
            <Select value={employeeId} onValueChange={(v) => setEmployeeId(v ?? "")}>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Leave balances ({new Date().getFullYear()})</CardTitle>
        </CardHeader>
        <CardContent>
          {balances.length === 0 ? (
            <p className="text-sm text-muted-foreground">No balances for this employee yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Leave type</TableHead>
                  <TableHead>Entitled</TableHead>
                  <TableHead>Used</TableHead>
                  <TableHead>Remaining</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {balances.map((b) => {
                  const remaining =
                    Number(b.entitledDays) + Number(b.carriedOverDays) + Number(b.adjustedDays) - Number(b.usedDays);
                  return (
                    <TableRow key={b.id}>
                      <TableCell>{b.leaveType.name}</TableCell>
                      <TableCell>{b.entitledDays}</TableCell>
                      <TableCell>{b.usedDays}</TableCell>
                      <TableCell className="font-medium">{remaining}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Leave requests</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leave requests yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.leaveType.name}</TableCell>
                    <TableCell>
                      {r.startDate.slice(0, 10)} – {r.endDate.slice(0, 10)}
                    </TableCell>
                    <TableCell>{r.daysCount}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === "APPROVED" ? "default" : "secondary"}>{r.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {r.status === "PENDING" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            disabled={busyId === r.id}
                            onClick={() => handleDecision(r.id, "approve")}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyId === r.id}
                            onClick={() => handleDecision(r.id, "reject")}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
