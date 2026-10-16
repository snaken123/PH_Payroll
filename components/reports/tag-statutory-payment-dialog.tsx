"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ShieldCheckIcon, Loader2Icon, CheckCircle2Icon, CreditCardIcon } from "lucide-react";
import { toast } from "sonner";
import type { CompanyBankOption } from "@/components/payroll/record-check-dialog";

export interface StatutoryAgencyPaymentData {
  agency: "SSS" | "PHILHEALTH" | "PAGIBIG" | "BIR";
  label: string;
  eeAmount: number;
  erAmount: number;
  totalAmount: number;
  status: "UNPAID" | "PAID" | "PARTIALLY_PAID";
  paymentRecordId?: string | null;
  paidAmount?: number | null;
  paymentDate?: string | null;
  paymentMethod?: "CHECK" | "BANK_TRANSFER" | "ONLINE_PORTAL" | "CASH" | null;
  checkNumber?: string | null;
  referenceNumber?: string | null;
  bankAccountId?: string | null;
  bankName?: string | null;
  notes?: string | null;
}

interface TagStatutoryPaymentDialogProps {
  agencyData: StatutoryAgencyPaymentData;
  payrollRunId: string;
  runNumber: number;
  periodYear: number;
  periodMonth: number;
  companyBankAccounts?: CompanyBankOption[];
  onSuccess?: () => void;
  triggerButton?: React.ReactNode;
}

const AGENCY_META: Record<
  string,
  { name: string; tag: string; badgeClass: string }
> = {
  SSS: {
    name: "Social Security System",
    tag: "SSS",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
  },
  PHILHEALTH: {
    name: "PhilHealth",
    tag: "PHIC",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
  },
  PAGIBIG: {
    name: "Pag-IBIG Fund",
    tag: "HDMF",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
  },
  BIR: {
    name: "BIR Withholding Tax",
    tag: "BIR",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800",
  },
};

export function TagStatutoryPaymentDialog({
  agencyData,
  payrollRunId,
  runNumber,
  periodYear,
  periodMonth,
  companyBankAccounts = [],
  onSuccess,
  triggerButton,
}: TagStatutoryPaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const agencyMeta = AGENCY_META[agencyData.agency] || {
    name: agencyData.label || agencyData.agency,
    tag: agencyData.agency,
    badgeClass: "bg-slate-100 text-slate-800 border-slate-200",
  };

  const [status, setStatus] = useState<"UNPAID" | "PAID" | "PARTIALLY_PAID">(
    agencyData.status || "UNPAID"
  );
  const [paymentDate, setPaymentDate] = useState(
    agencyData.paymentDate || new Date().toISOString().slice(0, 10)
  );
  const [paymentMethod, setPaymentMethod] = useState<string>(
    agencyData.paymentMethod || "CHECK"
  );
  const [checkNumber, setCheckNumber] = useState(agencyData.checkNumber || "");
  const [referenceNumber, setReferenceNumber] = useState(agencyData.referenceNumber || "");
  const [bankAccountId, setBankAccountId] = useState(
    agencyData.bankAccountId || (companyBankAccounts[0]?.id || "")
  );
  const [bankName, setBankName] = useState(agencyData.bankName || "");
  const [paidAmount, setPaidAmount] = useState(
    agencyData.paidAmount ? String(agencyData.paidAmount) : String(agencyData.totalAmount)
  );
  const [notes, setNotes] = useState(agencyData.notes || "");

  const handleOpen = (nextOpen: boolean) => {
    if (nextOpen) {
      setStatus(agencyData.status || "PAID");
      setPaymentDate(agencyData.paymentDate || new Date().toISOString().slice(0, 10));
      setPaymentMethod(agencyData.paymentMethod || "CHECK");
      setCheckNumber(agencyData.checkNumber || "");
      setReferenceNumber(agencyData.referenceNumber || "");
      setBankAccountId(agencyData.bankAccountId || (companyBankAccounts[0]?.id || ""));
      setBankName(agencyData.bankName || "");
      setPaidAmount(
        agencyData.paidAmount ? String(agencyData.paidAmount) : String(agencyData.totalAmount)
      );
      setNotes(agencyData.notes || "");
    }
    setOpen(nextOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (status === "PAID" || status === "PARTIALLY_PAID") {
      if (!paymentDate) {
        toast.error("Please enter the payment date.");
        return;
      }
      if (paymentMethod === "CHECK" && !checkNumber.trim()) {
        toast.error("Please provide the check number used for payment.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const selectedBank = companyBankAccounts.find((b) => b.id === bankAccountId);
      const effectiveBankName = selectedBank
        ? `${selectedBank.bankName} (${selectedBank.accountNumber})`
        : bankName;

      const payload = {
        agency: agencyData.agency,
        payrollRunId,
        periodYear,
        periodMonth,
        computedEeAmount: agencyData.eeAmount,
        computedErAmount: agencyData.erAmount,
        computedTotalAmount: agencyData.totalAmount,
        status,
        paidAmount: status === "PAID" ? (paidAmount ? Number(paidAmount) : agencyData.totalAmount) : null,
        paymentDate: status === "PAID" || status === "PARTIALLY_PAID" ? paymentDate : null,
        paymentMethod: status === "PAID" || status === "PARTIALLY_PAID" ? paymentMethod : null,
        checkNumber: checkNumber.trim() || null,
        referenceNumber: referenceNumber.trim() || null,
        bankAccountId: bankAccountId || null,
        bankName: effectiveBankName || null,
        notes: notes.trim() || null,
      };

      const res = await fetch("/api/reports/contributions/tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update payment status.");
      }

      toast.success(
        status === "PAID"
          ? `${agencyMeta.tag} tagged as PAID successfully!`
          : `${agencyMeta.tag} payment status updated.`
      );
      setOpen(false);
      onSuccess?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error updating payment status");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger
        render={
          triggerButton ? (
            (triggerButton as React.ReactElement)
          ) : agencyData.status === "PAID" ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <CheckCircle2Icon className="size-3.5 text-emerald-600 mr-1" />
              Edit Payment
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-xs font-semibold text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/50"
            >
              Tag as Paid
            </Button>
          )
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`inline-flex items-center justify-center font-mono font-bold text-[10px] px-2 py-0.5 rounded border ${agencyMeta.badgeClass}`}
            >
              {agencyMeta.tag}
            </span>
            <DialogTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {agencyMeta.name} — Remittance Details
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Tag statutory payment status and record disbursing check / reference details.
          </DialogDescription>
        </DialogHeader>

        {/* Read-only snapshot from Payroll Run */}
        <div className="p-3 rounded-lg border border-slate-200/90 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 space-y-2 text-xs">
          <div className="flex justify-between items-center text-slate-500">
            <span>Cutoff Payroll Run:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">Run #{runNumber}</span>
          </div>
          {agencyData.agency !== "BIR" ? (
            <>
              <div className="flex justify-between items-center text-slate-500">
                <span>Employee Share (EE):</span>
                <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                  ₱{agencyData.eeAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Employer Share (ER):</span>
                <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                  ₱{agencyData.erAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </>
          ) : (
            <div className="flex justify-between items-center text-slate-500">
              <span>Withholding Tax Withheld:</span>
              <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                ₱{agencyData.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center font-bold">
            <span className="text-slate-900 dark:text-slate-100">Total Remittance Due:</span>
            <span className="font-mono text-sm text-blue-700 dark:text-blue-400">
              ₱{agencyData.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 py-1 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="status" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Payment Status <span className="text-red-500">*</span>
              </Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus((v as "UNPAID" | "PAID" | "PARTIALLY_PAID") || "UNPAID")}
              >
                <SelectTrigger id="status" className="h-8 text-xs font-semibold">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAID" className="text-xs font-semibold text-emerald-600">
                    PAID (Remitted)
                  </SelectItem>
                  <SelectItem value="UNPAID" className="text-xs font-semibold text-amber-600">
                    UNPAID (Pending)
                  </SelectItem>
                  <SelectItem value="PARTIALLY_PAID" className="text-xs font-semibold text-blue-600">
                    PARTIALLY PAID
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="paymentDate" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Payment Date {status !== "UNPAID" && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id="paymentDate"
                type="date"
                className="h-8 text-xs font-mono"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                disabled={status === "UNPAID"}
                required={status !== "UNPAID"}
              />
            </div>
          </div>

          {status !== "UNPAID" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="paymentMethod" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Payment Method
                  </Label>
                  <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v || "CHECK")}>
                    <SelectTrigger id="paymentMethod" className="h-8 text-xs">
                      <SelectValue placeholder="Method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CHECK" className="text-xs">
                        Bank Check
                      </SelectItem>
                      <SelectItem value="ONLINE_PORTAL" className="text-xs">
                        Agency Online Portal (e.g. EPRS / PRN)
                      </SelectItem>
                      <SelectItem value="BANK_TRANSFER" className="text-xs">
                        Bank Transfer / Auto-Debit
                      </SelectItem>
                      <SelectItem value="CASH" className="text-xs">
                        Cash Payment
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="checkNumber" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Check Number {paymentMethod === "CHECK" && <span className="text-red-500">*</span>}
                  </Label>
                  <Input
                    id="checkNumber"
                    placeholder="e.g. 0048193"
                    className="h-8 text-xs font-mono font-bold"
                    value={checkNumber}
                    onChange={(e) => setCheckNumber(e.target.value)}
                    required={paymentMethod === "CHECK"}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="referenceNumber" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Reference / OR / PRN #
                  </Label>
                  <Input
                    id="referenceNumber"
                    placeholder="e.g. SBR-99182 / SPA-1029"
                    className="h-8 text-xs font-mono"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="paidAmount" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Paid Amount (₱)
                  </Label>
                  <Input
                    id="paidAmount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="h-8 text-xs font-mono font-bold"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bankAccount" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Disbursing Bank Account
                </Label>
                {companyBankAccounts.length > 0 ? (
                  <Select value={bankAccountId} onValueChange={(v) => setBankAccountId(v || "")}>
                    <SelectTrigger id="bankAccount" className="h-8 text-xs">
                      <SelectValue placeholder="Select bank account" />
                    </SelectTrigger>
                    <SelectContent>
                      {companyBankAccounts.map((b) => (
                        <SelectItem key={b.id} value={b.id} className="text-xs">
                          {b.bankName} — {b.accountNumber} {b.nickname ? `(${b.nickname})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="bankName"
                    placeholder="Bank Name & Account No."
                    className="h-8 text-xs"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                  />
                )}
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Notes / Filing Remarks
            </Label>
            <Textarea
              id="notes"
              placeholder="e.g. Paid via BDO Corporate BancNet; official receipt filed in HR cabinet."
              className="text-xs min-h-[60px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2Icon className="size-3.5 animate-spin mr-1.5" />
                  Saving...
                </>
              ) : (
                "Save Payment Details"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
