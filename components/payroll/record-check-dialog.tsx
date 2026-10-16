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
}

interface RecordCheckDialogProps {
  runId: string;
  runNumber: number;
  defaultAmount?: number;
  defaultDate?: string;
  companyBankAccounts?: CompanyBankOption[];
  existingCheck?: ExistingCheck | null;
  onSuccess?: () => void;
  triggerButton?: React.ReactNode;
}

export function RecordCheckDialog({
  runId,
  runNumber,
  defaultAmount = 0,
  defaultDate,
  companyBankAccounts = [],
  existingCheck = null,
  onSuccess,
  triggerButton,
}: RecordCheckDialogProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isEditing = Boolean(existingCheck);

  const [checkNumber, setCheckNumber] = useState(existingCheck?.checkNumber ?? "");
  const [checkDate, setCheckDate] = useState(
    existingCheck?.checkDate
      ? new Date(existingCheck.checkDate).toISOString().slice(0, 10)
      : defaultDate || new Date().toISOString().slice(0, 10)
  );
  const [amount, setAmount] = useState(
    existingCheck?.amount ? String(existingCheck.amount) : defaultAmount ? String(defaultAmount) : ""
  );
  const [bankAccountId, setBankAccountId] = useState(existingCheck?.bankAccountId ?? (companyBankAccounts[0]?.id || ""));
  const [bankName, setBankName] = useState(existingCheck?.bankName ?? "");
  const [payee, setPayee] = useState(
    existingCheck?.payee ?? `Net Payroll Payout — Run #${runNumber}`
  );
  const [notes, setNotes] = useState(existingCheck?.notes ?? "");
  const [status, setStatus] = useState(existingCheck?.status ?? "ISSUED");

  const handleOpen = (nextOpen: boolean) => {
    if (nextOpen) {
      if (existingCheck) {
        setCheckNumber(existingCheck.checkNumber);
        setCheckDate(
          existingCheck.checkDate
            ? new Date(existingCheck.checkDate).toISOString().slice(0, 10)
            : new Date().toISOString().slice(0, 10)
        );
        setAmount(String(existingCheck.amount));
        setBankAccountId(existingCheck.bankAccountId ?? "");
        setBankName(existingCheck.bankName ?? "");
        setPayee(existingCheck.payee ?? "");
        setNotes(existingCheck.notes ?? "");
        setStatus(existingCheck.status ?? "ISSUED");
      } else {
        setCheckNumber("");
        setCheckDate(defaultDate || new Date().toISOString().slice(0, 10));
        setAmount(defaultAmount ? String(defaultAmount) : "");
        setBankAccountId(companyBankAccounts[0]?.id || "");
        setPayee(`Net Payroll Payout — Run #${runNumber}`);
        setNotes("");
        setStatus("ISSUED");
      }
    }
    setOpen(nextOpen);
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
        : `/api/payroll/runs/${runId}/checks`;
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
          : `Check #${checkNumber} recorded for Run #${runNumber}!`
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
            {isEditing ? `Edit Check #${existingCheck?.checkNumber}` : `Record Check for Run #${runNumber}`}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isEditing
              ? "Update disbursement check number, issue date, or issuing bank account."
              : "Record the bank check number used to pay or fund this posted payroll run."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 text-xs">
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
                "Update Check"
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
