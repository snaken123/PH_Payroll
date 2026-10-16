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
import { CreditCardIcon, Loader2Icon, PlusIcon, EditIcon } from "lucide-react";
import { toast } from "sonner";

export interface CompanyBankOption {
  id: string;
  bankName: string;
  accountNumber: string;
  nickname?: string | null;
}

export interface ExistingCheck {
  id: string;
  checkNumber: string;
  checkDate: string;
  amount: number | string;
  bankAccountId?: string | null;
  bankName?: string | null;
  payee?: string | null;
  notes?: string | null;
  status?: string;
  payrollRun?: {
    id: string;
    runNumber: number;
    payrollPeriod?: {
      cutoffStart: string;
      cutoffEnd: string;
      payDate: string;
    };
  };
}

export interface PostedRunOption {
  id: string;
  runNumber: number;
  cutoffStart: string;
  cutoffEnd: string;
  payDate: string;
  netPay: number;
  hasCheck?: boolean;
}

interface RecordCheckDialogProps {
  runId?: string;
  runNumber?: number;
  defaultAmount?: number;
  defaultDate?: string;
  companyBankAccounts?: CompanyBankOption[];
  existingCheck?: ExistingCheck | null;
  availableRuns?: PostedRunOption[];
  onSuccess?: () => void;
  triggerButton?: React.ReactNode;
}

function toDateInput(val?: string | Date | null): string {
  if (!val) return new Date().toISOString().slice(0, 10);
  if (typeof val === "string") {
    if (val.includes("T")) return val.slice(0, 10);
    return val;
  }
  return val.toISOString().slice(0, 10);
}

export function RecordCheckDialog({
  runId,
  runNumber,
  defaultAmount = 0,
  defaultDate,
  companyBankAccounts = [],
  existingCheck = null,
  availableRuns = [],
  onSuccess,
  triggerButton,
}: RecordCheckDialogProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isEditing = Boolean(existingCheck);

  const [selectedRunId, setSelectedRunId] = useState<string>(
    runId || existingCheck?.payrollRun?.id || availableRuns[0]?.id || ""
  );
  const [checkNumber, setCheckNumber] = useState(existingCheck?.checkNumber ?? "");
  const [checkDate, setCheckDate] = useState(
    toDateInput(existingCheck?.checkDate || defaultDate)
  );
  const [amount, setAmount] = useState(
    existingCheck?.amount ? String(existingCheck.amount) : defaultAmount ? String(defaultAmount) : ""
  );
  const [bankAccountId, setBankAccountId] = useState(
    existingCheck?.bankAccountId ?? (companyBankAccounts[0]?.id || "")
  );
  const [bankName, setBankName] = useState(existingCheck?.bankName ?? "");
  const [payee, setPayee] = useState(
    existingCheck?.payee ?? (runNumber ? `Net Payroll Payout — Run #${runNumber}` : "Net Payroll Payout")
  );
  const [notes, setNotes] = useState(existingCheck?.notes ?? "");
  const [status, setStatus] = useState(existingCheck?.status ?? "ISSUED");

  const handleOpen = (nextOpen: boolean) => {
    if (nextOpen) {
      if (existingCheck) {
        setSelectedRunId(runId || existingCheck.payrollRun?.id || "");
        setCheckNumber(existingCheck.checkNumber);
        setCheckDate(toDateInput(existingCheck.checkDate));
        setAmount(String(existingCheck.amount));
        setBankAccountId(existingCheck.bankAccountId ?? "");
        setBankName(existingCheck.bankName ?? "");
        setPayee(existingCheck.payee ?? "");
        setNotes(existingCheck.notes ?? "");
        setStatus(existingCheck.status ?? "ISSUED");
      } else {
        const initialRun = runId
          ? availableRuns.find((r) => r.id === runId)
          : availableRuns.find((r) => !r.hasCheck) || availableRuns[0];

        const initialRunId = initialRun?.id || runId || "";
        const initialRunNumber = initialRun?.runNumber || runNumber;
        const initialAmount = initialRun?.netPay || defaultAmount;
        const initialDate = initialRun?.payDate || defaultDate;

        setSelectedRunId(initialRunId);
        setCheckNumber("");
        setCheckDate(toDateInput(initialDate));
        setAmount(initialAmount ? String(initialAmount) : "");
        setBankAccountId(companyBankAccounts[0]?.id || "");
        setBankName("");
        setPayee(initialRunNumber ? `Net Payroll Payout — Run #${initialRunNumber}` : "Net Payroll Payout");
        setNotes("");
        setStatus("ISSUED");
      }
    }
    setOpen(nextOpen);
  };

  const handleRunChange = (newRunId: string | null) => {
    if (!newRunId) return;
    setSelectedRunId(newRunId);
    const chosen = availableRuns.find((r) => r.id === newRunId);
    if (chosen) {
      setAmount(String(chosen.netPay));
      setCheckDate(toDateInput(chosen.payDate));
      setPayee(`Net Payroll Payout — Run #${chosen.runNumber}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkNumber.trim()) {
      toast.error("Please enter a valid check number.");
      return;
    }
    if (!checkDate) {
      toast.error("Please select the check issue date.");
      return;
    }
    if (!amount || Number(amount) < 0) {
      toast.error("Please enter a valid check amount.");
      return;
    }

    const effectiveTargetRunId = isEditing ? (runId || existingCheck?.payrollRun?.id) : (selectedRunId || runId);
    if (!isEditing && !effectiveTargetRunId) {
      toast.error("Please select which payroll run this check is for.");
      return;
    }

    setSubmitting(true);
    try {
      const selectedBank = companyBankAccounts.find((b) => b.id === bankAccountId);
      const effectiveBankName = selectedBank
        ? `${selectedBank.bankName} (${selectedBank.accountNumber})`
        : bankName;

      const payload = {
        checkNumber: checkNumber.trim(),
        checkDate,
        amount: Number(amount),
        bankAccountId: bankAccountId || null,
        bankName: effectiveBankName || null,
        payee: payee.trim() || null,
        notes: notes.trim() || null,
        status,
      };

      const url = isEditing
        ? `/api/payroll/checks/${existingCheck!.id}`
        : `/api/payroll/runs/${effectiveTargetRunId}/checks`;
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to record check.");
      }

      toast.success(
        isEditing
          ? `Check #${checkNumber} updated successfully!`
          : `Check #${checkNumber} recorded successfully!`
      );
      setOpen(false);
      onSuccess?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving check";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const currentRunNumber = runNumber || availableRuns.find((r) => r.id === selectedRunId)?.runNumber;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger
        render={
          triggerButton ? (
            (triggerButton as React.ReactElement)
          ) : isEditing ? (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
              <EditIcon className="size-3" /> Edit
            </Button>
          ) : (
            <Button size="sm" className="gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white">
              <PlusIcon className="size-3.5" /> Record Check Number
            </Button>
          )
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <CreditCardIcon className="size-4 text-blue-600" />
            {isEditing
              ? `Edit Check #${existingCheck?.checkNumber}`
              : currentRunNumber
                ? `Record Check for Run #${currentRunNumber}`
                : "Record Check Details"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isEditing
              ? "Update disbursement check number, issue date, status, or issuing bank details."
              : "Record the bank check number used to pay or fund this posted payroll run."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-1 text-xs">
          {!isEditing && availableRuns.length > 0 && !runId && (
            <div className="space-y-1.5">
              <Label htmlFor="payrollRun" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Posted Payroll Run <span className="text-red-500">*</span>
              </Label>
              <Select value={selectedRunId} onValueChange={handleRunChange}>
                <SelectTrigger id="payrollRun" className="h-8 text-xs font-semibold">
                  <SelectValue placeholder="Select posted payroll run" />
                </SelectTrigger>
                <SelectContent>
                  {availableRuns.map((r) => (
                    <SelectItem key={r.id} value={r.id} className="text-xs">
                      Run #{r.runNumber} ({r.cutoffStart} to {r.cutoffEnd}) — Net: ₱{r.netPay.toLocaleString("en-US", { minimumFractionDigits: 2 })}{" "}
                      {r.hasCheck ? "(Check Recorded)" : "(No Check)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="checkNumber" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Check Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="checkNumber"
                placeholder="e.g. 0048192"
                className="h-8 text-xs font-mono font-bold"
                value={checkNumber}
                onChange={(e) => setCheckNumber(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="checkDate" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Check Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="checkDate"
                type="date"
                className="h-8 text-xs font-mono"
                value={checkDate}
                onChange={(e) => setCheckDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="amount" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Check Amount (₱) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              className="h-8 text-xs font-mono font-bold"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bankAccount" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Disbursing Bank Account
            </Label>
            {companyBankAccounts.length > 0 ? (
              <Select value={bankAccountId} onValueChange={(v) => setBankAccountId(v || "")}>
                <SelectTrigger id="bankAccount" className="h-8 text-xs">
                  <SelectValue placeholder="Select company bank account" />
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
                placeholder="Bank Name & Account No. (e.g. BDO Current #00123)"
                className="h-8 text-xs"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payee" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Payee / Purpose
            </Label>
            <Input
              id="payee"
              placeholder="e.g. Net Payroll Disbursement / ATM Funding"
              className="h-8 text-xs"
              value={payee}
              onChange={(e) => setPayee(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="status" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Check Status
              </Label>
              <Select value={status} onValueChange={(v) => setStatus(v || "ISSUED")}>
                <SelectTrigger id="status" className="h-8 text-xs font-semibold">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ISSUED" className="text-xs font-semibold text-blue-600">
                    ISSUED
                  </SelectItem>
                  <SelectItem value="CLEARED" className="text-xs font-semibold text-emerald-600">
                    CLEARED
                  </SelectItem>
                  <SelectItem value="VOID" className="text-xs font-semibold text-slate-500">
                    VOID
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Notes (Optional)
              </Label>
              <Input
                id="notes"
                placeholder="Memo or check voucher ref"
                className="h-8 text-xs"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
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
              ) : isEditing ? (
                "Update Check Details"
              ) : (
                "Save Check Number"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
