"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  PrinterIcon,
  BanIcon,
  CheckCircle2Icon,
  LandmarkIcon,
  Building2Icon,
  RefreshCwIcon,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { CheckVoucherModal } from "./check-voucher-modal";

interface RemittanceChecksTableProps {
  checks: any[];
  loading: boolean;
  onRefresh: () => void;
}

export function RemittanceChecksTable({
  checks,
  loading,
  onRefresh,
}: RemittanceChecksTableProps) {
  const [selectedCheckForVoucher, setSelectedCheckForVoucher] = useState<any | null>(null);
  const [voucherOpen, setVoucherOpen] = useState(false);
  const [voidingId, setVoidingId] = useState<string | null>(null);

  const handleOpenVoucher = (check: any) => {
    setSelectedCheckForVoucher(check);
    setVoucherOpen(true);
  };

  const handleVoidCheck = async (checkId: string, checkNumber: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to VOID check #${checkNumber}? All linked statutory payables and loan deductions will be reverted to UNPAID.`
    );
    if (!confirmed) return;

    setVoidingId(checkId);
    try {
      const res = await fetch(`/api/remittances/checks/${checkId}/void`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to void check.");
        setVoidingId(null);
        return;
      }

      toast.success(`Check #${checkNumber} has been voided. Line items reverted to UNPAID.`);
      onRefresh();
    } catch (err) {
      console.error(err);
      toast.error("Failed to void check.");
    } finally {
      setVoidingId(null);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Disbursed Statutory Checks Register
            </h3>
            <Badge variant="outline" className="text-xs font-mono text-emerald-700 dark:text-emerald-400 border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40">
              {checks.length} checks
            </Badge>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={onRefresh}
            disabled={loading}
            className="text-xs h-8 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 gap-1.5"
          >
            <RefreshCwIcon className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-hidden shadow-sm">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-500 dark:text-slate-400">
              <RefreshCwIcon className="size-5 animate-spin mx-auto text-emerald-600 dark:text-emerald-500 mb-2" />
              Loading remittance checks register...
            </div>
          ) : checks.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500 dark:text-slate-400">
              <LandmarkIcon className="size-8 text-slate-400 dark:text-slate-600 mx-auto mb-2" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">No statutory checks disbursed yet</p>
              <p className="text-slate-500 mt-1">
                Select line items in Consolidated Payables and click &quot;Issue Remittance Check&quot; to disburse.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Check #</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Date</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Company</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Payee / Agency</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Bank &amp; Ref #</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Bundled Items</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 text-right">Amount</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 text-center">Status</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checks.map((chk) => {
                  const isVoid = chk.status === "VOID";
                  const primaryAgency = chk.remittanceBatchItems?.[0]?.agency || "STATUTORY";
                  const refNum =
                    chk.remittanceBatchItems?.[0]?.statutoryPaymentRecord?.referenceNumber ||
                    chk.remittanceBatchItems?.[0]?.loanDeduction?.remittanceReference ||
                    "—";

                  return (
                    <TableRow
                      key={chk.id}
                      className={`border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${isVoid ? "opacity-60 bg-rose-50/50 dark:bg-rose-950/10" : ""}`}
                    >
                      <TableCell className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                        {chk.checkNumber}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-300 font-mono">
                        {new Date(chk.checkDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 block truncate max-w-[150px]">
                            {chk.company?.legalName}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {chk.company?.companyCode}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <Badge variant="outline" className="text-[10px] font-mono border-slate-300 dark:border-slate-700">
                            {primaryAgency}
                          </Badge>
                          <span className="text-[11px] text-slate-700 dark:text-slate-300 block truncate max-w-[170px]">
                            {chk.payee}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-300">
                            {chk.bankName || chk.bankAccount?.bankName || "—"}
                          </span>
                          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 block truncate max-w-[140px]">
                            Ref: {refNum}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-700 dark:text-slate-300">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px]">
                          {chk.remittanceBatchItems?.length || 1} items
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(chk.amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        {isVoid ? (
                          <Badge variant="outline" className="text-[10px] bg-rose-50 dark:bg-rose-950/60 border-rose-400 dark:border-rose-500 text-rose-700 dark:text-rose-400">
                            VOID
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-500 text-emerald-700 dark:text-emerald-400">
                            ISSUED
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenVoucher(chk)}
                            className="text-[11px] h-7 px-2 bg-white dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 gap-1"
                          >
                            <PrinterIcon className="size-3" /> Voucher
                          </Button>
                          {!isVoid && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleVoidCheck(chk.id, chk.checkNumber)}
                              disabled={voidingId === chk.id}
                              className="text-[11px] h-7 px-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800/60 gap-1"
                            >
                              <BanIcon className="size-3" /> Void
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <CheckVoucherModal
        open={voucherOpen}
        onOpenChange={setVoucherOpen}
        check={selectedCheckForVoucher}
      />
    </>
  );
}
