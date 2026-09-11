"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ShieldAlertIcon, HistoryIcon, UserXIcon } from "lucide-react";

interface AuditRecord {
  id: string;
  employeeNumber: string;
  employeeName: string;
  positionTitle: string;
  departmentName?: string | null;
  deletedByUserName: string;
  reason: string;
  hasPayrollHistory: boolean;
  createdAt: string;
}

export function DeletionAuditDialog() {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetch("/api/employees/deletions")
        .then((res) => res.json())
        .then((data) => {
          setLogs(data.auditLogs || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100">
            <HistoryIcon className="size-3.5 text-slate-500" /> Deletion Audit Log
          </Button>
        }
      />
      <DialogContent className="sm:max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <ShieldAlertIcon className="size-4 text-blue-600" /> Employee Deletion Audit Log
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Immutable tracking record of all deleted employee profiles, mandatory reasons, and author details.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pt-2">
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-500">Loading audit history...</div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              <UserXIcon className="size-8 text-slate-300 dark:text-slate-700" />
              <span>No employee deletion audit records found.</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Employee</TableHead>
                  <TableHead className="text-xs">Deleted By</TableHead>
                  <TableHead className="text-xs">Date &amp; Time</TableHead>
                  <TableHead className="text-xs">Reason</TableHead>
                  <TableHead className="text-xs text-right">History</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{log.employeeName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {log.employeeNumber} · {log.positionTitle}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {log.deletedByUserName}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="text-xs text-slate-700 dark:text-slate-300 max-w-xs font-medium">
                      {log.reason}
                    </TableCell>
                    <TableCell className="text-right">
                      {log.hasPayrollHistory ? (
                        <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60">
                          Payroll Records Exist
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-slate-500">
                          Clean Entry
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
