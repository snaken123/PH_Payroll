"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RunOption {
  id: string;
  runNumber: number;
  cutoffStart: string;
  cutoffEnd: string;
}
interface EmployeeOption {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
}

function openReport(href: string) {
  window.open(href, "_blank");
}

export function ReportsManager({
  postedRuns,
  employees,
}: {
  postedRuns: RunOption[];
  employees: EmployeeOption[];
}) {
  const [runId, setRunId] = useState(postedRuns[0]?.id ?? "");
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? "");
  const [annualYear, setAnnualYear] = useState(String(now.getFullYear()));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Per-run reports</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Posted payroll run</Label>
            <Select value={runId} onValueChange={(v) => setRunId(v ?? "")}>
              <SelectTrigger className="w-96">
                <SelectValue placeholder="Select a posted run" />
              </SelectTrigger>
              <SelectContent>
                {postedRuns.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    #{r.runNumber} · {r.cutoffStart} – {r.cutoffEnd}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={!runId}
              onClick={() => openReport(`/api/reports/payroll-register/${runId}`)}
            >
              Payroll Register
            </Button>
            <Button
              variant="outline"
              disabled={!runId}
              onClick={() => openReport(`/api/reports/remittance/sss/${runId}`)}
            >
              SSS R-3
            </Button>
            <Button
              variant="outline"
              disabled={!runId}
              onClick={() => openReport(`/api/reports/remittance/philhealth/${runId}`)}
            >
              PhilHealth RF-1
            </Button>
            <Button
              variant="outline"
              disabled={!runId}
              onClick={() => openReport(`/api/reports/remittance/pagibig/${runId}`)}
            >
              Pag-IBIG MCRF
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Monthly report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label>Year</Label>
              <Input className="w-28" value={year} onChange={(e) => setYear(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Month</Label>
              <Input className="w-20" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
            <Button
              variant="outline"
              onClick={() => openReport(`/api/reports/1601c/${year}/${month}`)}
            >
              BIR 1601-C
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Annual reports</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label>Year</Label>
              <Input className="w-28" value={annualYear} onChange={(e) => setAnnualYear(e.target.value)} />
            </div>
            <Button
              variant="outline"
              onClick={() => openReport(`/api/reports/thirteenth-month/${annualYear}`)}
            >
              13th Month Pay Report
            </Button>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label>Employee</Label>
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
            <div className="space-y-1">
              <Label>Year</Label>
              <Input className="w-28" value={annualYear} onChange={(e) => setAnnualYear(e.target.value)} />
            </div>
            <Button
              variant="outline"
              disabled={!employeeId}
              onClick={() => openReport(`/api/reports/2316/${employeeId}/${annualYear}`)}
            >
              BIR 2316
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
