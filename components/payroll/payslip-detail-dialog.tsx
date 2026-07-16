"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface LineItem {
  id: string;
  category: string;
  direction: string;
  description: string;
  amount: string;
}

export function PayslipDetailDialog({
  payslipId,
  employeeName,
  lineItems,
  netPay,
}: {
  payslipId: string;
  employeeName: string;
  lineItems: LineItem[];
  netPay: string;
}) {
  const [open, setOpen] = useState(false);

  const earnings = lineItems.filter((li) => li.direction === "EARNING");
  const deductions = lineItems.filter((li) => li.direction === "DEDUCTION");
  const employerContributions = lineItems.filter((li) => li.direction === "EMPLOYER_CONTRIBUTION");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm" />}>View</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{employeeName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h3 className="mb-1 text-sm font-medium text-muted-foreground">Earnings</h3>
            <Table>
              <TableBody>
                {earnings.map((li) => (
                  <TableRow key={li.id}>
                    <TableCell>{li.description}</TableCell>
                    <TableCell className="text-right">₱{Number(li.amount).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div>
            <h3 className="mb-1 text-sm font-medium text-muted-foreground">Deductions</h3>
            <Table>
              <TableBody>
                {deductions.length === 0 ? (
                  <TableRow>
                    <TableCell className="text-muted-foreground">None</TableCell>
                  </TableRow>
                ) : (
                  deductions.map((li) => (
                    <TableRow key={li.id}>
                      <TableCell>{li.description}</TableCell>
                      <TableCell className="text-right">
                        (₱{Number(li.amount).toLocaleString()})
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div>
            <h3 className="mb-1 text-sm font-medium text-muted-foreground">
              Employer contributions (not deducted from pay)
            </h3>
            <Table>
              <TableHeader />
              <TableBody>
                {employerContributions.map((li) => (
                  <TableRow key={li.id}>
                    <TableCell>{li.description}</TableCell>
                    <TableCell className="text-right">₱{Number(li.amount).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between border-t pt-3 font-semibold">
            <span>Net pay</span>
            <span>₱{Number(netPay).toLocaleString()}</span>
          </div>

          <Button
            variant="outline"
            className="w-full"
            render={<a href={`/api/reports/payslip/${payslipId}`} target="_blank" />}
          >
            Download payslip PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
