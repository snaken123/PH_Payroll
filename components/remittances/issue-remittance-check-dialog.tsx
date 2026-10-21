"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  LandmarkIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  Building2Icon,
  CoinsIcon,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  OFFICIAL_STATUTORY_PAYEES,
  type ConsolidatedPayableItem,
} from "@/types/remittance";
import { StatutoryAgency } from "@/lib/generated/prisma/enums";

interface IssueRemittanceCheckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: ConsolidatedPayableItem[];
  companies: Array<{
    id: string;
    legalName: string;
    companyCode: string;
    tin: string;
    bankAccounts: Array<{ id: string; bankName: string; accountNumber: string; nickname?: string | null }>;
  }>;
  onSuccess: (createdCheck: any) => void;
}

export function IssueRemittanceCheckDialog({
  open,
  onOpenChange,
  selectedItems,
  companies,
  onSuccess,
}: IssueRemittanceCheckDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [checkNumber, setCheckNumber] = useState("");
  const [checkDate, setCheckDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [referenceNumber, setReferenceNumber] = useState("");
  const [selectedBankAccountId, setSelectedBankAccountId] = useState("");
  const [customBankName, setCustomBankName] = useState("");
  const [customPayee, setCustomPayee] = useState("");
  const [notes, setNotes] = useState("");

  // Analysis of selected items
  const {
    uniqueCompanyIds,
    uniqueAgencies,
    hasMixedAgencies,
    hasMixedCompanies,
    hasMixedSssTypes,
    totalAmount,
    primaryCompany,
    primaryAgency,
  } = useMemo(() => {
    const compIds = Array.from(new Set(selectedItems.map((i) => i.companyId)));
    const ags = Array.from(new Set(selectedItems.map((i) => i.agency)));

    const mixedCompanies = compIds.length > 1;
    const mixedAgencies = ags.length > 1;

    const sssContrib = selectedItems.some((i) => i.agency === StatutoryAgency.SSS && i.itemType === "CONTRIBUTION");
    const sssLoans = selectedItems.some((i) => i.agency === StatutoryAgency.SSS && i.itemType === "LOAN");
    const mixedSss = sssContrib && sssLoans;

    const sum = selectedItems.reduce((acc, i) => acc + i.totalAmount, 0);

    const firstItem = selectedItems[0];
    const comp = companies.find((c) => c.id === firstItem?.companyId) || null;
    const ag = firstItem?.agency || StatutoryAgency.SSS;

    return {
      uniqueCompanyIds: compIds,
      uniqueAgencies: ags,
      hasMixedCompanies: mixedCompanies,
      hasMixedAgencies: mixedAgencies,
      hasMixedSssTypes: mixedSss,
      totalAmount: sum,
      primaryCompany: comp,
      primaryAgency: ag,
    };
  }, [selectedItems, companies]);

  const defaultPayee = primaryAgency ? OFFICIAL_STATUTORY_PAYEES[primaryAgency] : "";
  const effectivePayee = customPayee.trim() || defaultPayee;

  const availableBankAccounts = primaryCompany?.bankAccounts || [];

  const handleBankSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedBankAccountId(val);
    if (val !== "OTHER") {
      setCustomBankName("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (hasMixedCompanies) {
      toast.error("All selected items must belong to the same company.");
      return;
    }

    if (hasMixedAgencies) {
      toast.error("All selected items must belong to the same government agency.");
      return;
    }

    if (!checkNumber.trim()) {
      toast.error("Please enter a check number.");
      return;
    }

    if (!referenceNumber.trim()) {
      toast.error("Please enter the agency reference number (PRN, SPA, or PIS).");
      return;
    }

    if (!primaryCompany) {
      toast.error("Company not found for selected items.");
      return;
    }

    let bankName = customBankName.trim();
    if (selectedBankAccountId && selectedBankAccountId !== "OTHER") {
      const b = availableBankAccounts.find((acc) => acc.id === selectedBankAccountId);
      if (b) bankName = b.bankName;
    }

    setSubmitting(true);

    try {
      const payload = {
        companyId: primaryCompany.id,
        agency: primaryAgency,
        checkNumber: checkNumber.trim(),
        checkDate,
        bankAccountId: selectedBankAccountId && selectedBankAccountId !== "OTHER" ? selectedBankAccountId : null,
        bankName: bankName || null,
        payee: effectivePayee,
        referenceNumber: referenceNumber.trim(),
        notes: notes.trim() || null,
        items: selectedItems.map((item) => ({
          itemType: item.itemType,
          id: item.id,
          amount: item.totalAmount,
          payrollRunId: item.payrollRunId,
          periodYear: item.periodYear,
          periodMonth: item.periodMonth,
          eeAmount: item.eeAmount,
          erAmount: item.erAmount,
          loanDeductionId: item.loanDeductionId,
          description: item.description,
        })),
      };

      const res = await fetch("/api/remittances/disburse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to disburse remittance check.");
        setSubmitting(false);
        return;
      }

      toast.success(
        `Check #${checkNumber} for ${formatCurrency(totalAmount)} disbursed successfully!`
      );

      // Reset form
      setCheckNumber("");
      setReferenceNumber("");
      setNotes("");
      setCustomPayee("");
      onOpenChange(false);
      onSuccess(data.check);
    } catch (err: any) {
      console.error(err);
      toast.error("An unexpected error occurred while issuing the check.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl bg-slate-900 border-slate-800 text-slate-100 max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
              <LandmarkIcon className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-100">
                Disburse Statutory Remittance Check
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Bundle {selectedItems.length} selected statutory items into a single corporate disbursement check.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Validation Errors & Alerts */}
        {hasMixedCompanies && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3.5 flex items-start gap-2.5 text-xs text-rose-300">
            <AlertTriangleIcon className="size-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-200">Multiple Companies Selected</p>
              <p className="mt-0.5 text-rose-300/90 leading-relaxed">
                A physical bank check can only be drawn against one company&apos;s corporate bank account.
                You have selected items across {uniqueCompanyIds.length} different companies. Please filter by a single company before issuing.
              </p>
            </div>
          </div>
        )}

        {hasMixedAgencies && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3.5 flex items-start gap-2.5 text-xs text-rose-300">
            <AlertTriangleIcon className="size-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-200">Multiple Agencies Selected</p>
              <p className="mt-0.5 text-rose-300/90 leading-relaxed">
                Checks must be made out to a single government agency (e.g. SSS or PhilHealth).
                You have selected items for multiple agencies: {uniqueAgencies.join(", ")}. Please select items for one agency at a time.
              </p>
            </div>
          </div>
        )}

        {hasMixedSssTypes && !hasMixedAgencies && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-950/40 p-3.5 flex items-start gap-2.5 text-xs text-amber-300">
            <AlertTriangleIcon className="size-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-200">SSS Compliance Advisory: Contributions vs Member Loans</p>
              <p className="mt-0.5 text-amber-300/90 leading-relaxed">
                SSS strictly segregates collections for Regular Contributions and Member Loans (Salary/Calamity) with distinct PRNs.
                Issuing separate checks per PRN is standard banking compliance.
              </p>
            </div>
          </div>
        )}

        {/* Main Check Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Company & Agency Readonly Header */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Drawn On Company</span>
              <span className="font-bold text-slate-200 text-sm flex items-center gap-1.5 mt-0.5">
                <Building2Icon className="size-3.5 text-blue-400" />
                {primaryCompany?.legalName || "—"}
              </span>
              <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                TIN: {primaryCompany?.tin || "—"} • Code: {primaryCompany?.companyCode}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Statutory Payee</span>
              <span className="font-bold text-emerald-400 text-sm flex items-center gap-1.5 mt-0.5">
                <LandmarkIcon className="size-3.5" />
                {primaryAgency} — {defaultPayee}
              </span>
              <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                Official Government Entity
              </span>
            </div>
          </div>

          {/* Amount Callout Banner */}
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <CoinsIcon className="size-3.5" /> Total Check Amount
              </span>
              <p className="text-[11px] text-slate-400">
                Sum of {selectedItems.length} selected obligation line items
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black font-mono text-emerald-400">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Check Number */}
            <div className="space-y-1.5">
              <Label htmlFor="checkNumber" className="text-xs font-semibold text-slate-300">
                Check Number <span className="text-rose-400">*</span>
              </Label>
              <Input
                id="checkNumber"
                placeholder="e.g. 00018492"
                value={checkNumber}
                onChange={(e) => setCheckNumber(e.target.value)}
                required
                className="bg-slate-950 border-slate-800 text-xs h-9 font-mono text-slate-100"
              />
            </div>

            {/* Check Date */}
            <div className="space-y-1.5">
              <Label htmlFor="checkDate" className="text-xs font-semibold text-slate-300">
                Check Date <span className="text-rose-400">*</span>
              </Label>
              <Input
                id="checkDate"
                type="date"
                value={checkDate}
                onChange={(e) => setCheckDate(e.target.value)}
                required
                className="bg-slate-950 border-slate-800 text-xs h-9 text-slate-100"
              />
            </div>

            {/* Reference Number / PRN / SPA / PIS */}
            <div className="space-y-1.5">
              <Label htmlFor="referenceNumber" className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Agency Reference No. / PRN / SPA / PIS <span className="text-rose-400">*</span></span>
              </Label>
              <Input
                id="referenceNumber"
                placeholder="e.g. SSS PRN #, PhilHealth SPA, HDMF PIS"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                required
                className="bg-slate-950 border-slate-800 text-xs h-9 font-mono text-emerald-400"
              />
              <p className="text-[10px] text-slate-500">
                Payment Reference Number generated from agency online portal.
              </p>
            </div>

            {/* Bank Account Selection */}
            <div className="space-y-1.5">
              <Label htmlFor="bankAccount" className="text-xs font-semibold text-slate-300">
                Disbursement Bank Account
              </Label>
              <select
                id="bankAccount"
                value={selectedBankAccountId}
                onChange={handleBankSelect}
                className="w-full bg-slate-950 border border-slate-800 text-xs h-9 px-2.5 rounded-md text-slate-100 focus:outline-hidden focus:border-blue-500"
              >
                <option value="">— Select Company Bank Account —</option>
                {availableBankAccounts.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bankName} - {b.accountNumber} {b.nickname ? `(${b.nickname})` : ""}
                  </option>
                ))}
                <option value="OTHER">Other Bank (Type Name Below)</option>
              </select>
              {selectedBankAccountId === "OTHER" && (
                <Input
                  placeholder="Enter Bank Name (e.g. BDO, BPI, Metrobank)"
                  value={customBankName}
                  onChange={(e) => setCustomBankName(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-xs h-9 mt-1 text-slate-100"
                />
              )}
            </div>

            {/* Custom Payee Override (Optional) */}
            <div className="space-y-1.5">
              <Label htmlFor="customPayee" className="text-xs font-semibold text-slate-300">
                Payee on Check (Defaults to Official Agency)
              </Label>
              <Input
                id="customPayee"
                placeholder={defaultPayee}
                value={customPayee}
                onChange={(e) => setCustomPayee(e.target.value)}
                className="bg-slate-950 border-slate-800 text-xs h-9 text-slate-100 font-mono"
              />
            </div>

            {/* Transmittal Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs font-semibold text-slate-300">
                Transmittal Notes / Memo
              </Label>
              <Input
                id="notes"
                placeholder="e.g. October 2026 Remittance for Head Office"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-slate-950 border-slate-800 text-xs h-9 text-slate-100"
              />
            </div>
          </div>

          {/* Covered Items Breakdown Preview */}
          <div className="space-y-1.5 pt-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Bundled Line Items ({selectedItems.length})
            </span>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/60 divide-y divide-slate-800/80 text-[11px]">
              {selectedItems.map((item, idx) => (
                <div key={item.id || idx} className="p-2.5 flex items-center justify-between hover:bg-slate-900/50">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[9px] px-1 py-0 border-slate-700">
                        {item.itemType}
                      </Badge>
                      <span className="font-semibold text-slate-200">{item.description}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {item.companyName} • Period: {item.periodMonth}/{item.periodYear}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-slate-200">
                      {formatCurrency(item.totalAmount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-slate-900 border-slate-800 text-slate-300 text-xs h-9 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || hasMixedCompanies || hasMixedAgencies || selectedItems.length === 0}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-9 px-4 shadow-md shadow-emerald-950/50"
            >
              {submitting ? "Issuing Check..." : `Confirm & Issue Check (${formatCurrency(totalAmount)})`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
