"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCardIcon, CheckCircle2Icon, AlertCircleIcon, PlusIcon, Trash2Icon, Loader2Icon } from "lucide-react";
import { RecordCheckDialog, type CompanyBankOption, type ExistingCheck } from "./record-check-dialog";
import { toast } from "sonner";

interface CheckItem extends ExistingCheck {
  createdAt: string;
  bankAccount?: {
    bankName: string;
    accountNumber: string;
  } | null;
}

interface RunChecksSectionProps {
  runId: string;
  runNumber: number;
  totalNetPay: number;
  payDate: string;
  companyBankAccounts: CompanyBankOption[];
  canManage: boolean;
}

export function RunChecksSection({
  runId,
  runNumber,
  totalNetPay,
  payDate,
  companyBankAccounts,
  canManage,
}: RunChecksSectionProps) {
  const [checks, setChecks] = useState<CheckItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChecks = useCallback(async () => {
    try {
      const res = await fetch(`/api/payroll/runs/${runId}/checks`);
      if (res.ok) {
        const data = await res.json();
        setChecks(data.checks || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    fetchChecks();
  }, [fetchChecks]);

  const handleVoidCheck = async (checkId: string, checkNumber: string) => {
    if (!confirm(`Are you sure you want to void Check #${checkNumber}?`)) return;
    try {
      const res = await fetch(`/api/payroll/checks/${checkId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to void check");
      }
      toast.success(`Check #${checkNumber} has been voided.`);
      fetchChecks();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error voiding check");
    }
  };

  const totalCheckAmount = checks
    .filter((c) => c.status !== "VOID")
    .reduce((sum, c) => sum + Number(c.amount), 0);

  return (
    <Card className="border-slate-200/90 shadow-xs dark:border-slate-800">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CreditCardIcon className="size-4 text-blue-600" />
            Payroll Disbursement &amp; Check Details
          </CardTitle>
          <CardDescription className="text-xs">
            Bank check numbers issued to pay or fund this posted payroll run.
          </CardDescription>
        </div>

        {canManage && (
          <RecordCheckDialog
            runId={runId}
            runNumber={runNumber}
            defaultAmount={totalNetPay}
            defaultDate={payDate}
            companyBankAccounts={companyBankAccounts}
            onSuccess={fetchChecks}
            triggerButton={
              <Button size="sm" className="gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white">
                <PlusIcon className="size-3.5" />
                {checks.length === 0 ? "Record Check Number" : "Add Another Check"}
              </Button>
            }
          />
        )}
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        {loading ? (
          <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-500">
            <Loader2Icon className="size-4 animate-spin text-blue-600" /> Loading check details...
          </div>
        ) : checks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-800 p-6 text-center space-y-2">
            <div className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
              <CreditCardIcon className="size-4" />
            </div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              No check recorded yet for this posted payroll
            </p>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Total Net Pay Due is{" "}
              <span className="font-bold font-mono text-slate-900 dark:text-slate-100">
                ₱{totalNetPay.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
              . Record the check number used to fund this payroll run for compliance and audit tracking.
            </p>
            {canManage && (
              <div className="pt-2">
                <RecordCheckDialog
                  runId={runId}
                  runNumber={runNumber}
                  defaultAmount={totalNetPay}
                  defaultDate={payDate}
                  companyBankAccounts={companyBankAccounts}
                  onSuccess={fetchChecks}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {checks.map((chk) => {
                const isVoid = chk.status === "VOID";
                const isCleared = chk.status === "CLEARED";
                return (
                  <div
                    key={chk.id}
                    className={`p-3.5 rounded-xl border transition-all space-y-2 relative ${
                      isVoid
                        ? "border-slate-200 bg-slate-50/50 opacity-60 dark:border-slate-800 dark:bg-slate-900/50"
                        : "border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                            Check #{chk.checkNumber}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 font-semibold ${
                              isCleared
                                ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : isVoid
                                  ? "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400"
                                  : "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300"
                            }`}
                          >
                            {chk.status}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium pt-0.5">
                          Dated: {new Date(chk.checkDate).toLocaleDateString()}
                        </p>
                      </div>

                      {canManage && !isVoid && (
                        <div className="flex items-center gap-1">
                          <RecordCheckDialog
                            runId={runId}
                            runNumber={runNumber}
                            companyBankAccounts={companyBankAccounts}
                            existingCheck={chk}
                            onSuccess={fetchChecks}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-slate-400 hover:text-red-600"
                            title="Void Check"
                            onClick={() => handleVoidCheck(chk.id, chk.checkNumber)}
                          >
                            <Trash2Icon className="size-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-baseline justify-between text-xs">
                      <span className="text-[11px] text-slate-500">Amount:</span>
                      <span
                        className={`font-mono font-bold text-sm ${
                          isVoid ? "line-through text-slate-400" : "text-slate-900 dark:text-slate-100"
                        }`}
                      >
                        ₱{Number(chk.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 space-y-0.5">
                      <p className="truncate">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Bank:</span>{" "}
                        {chk.bankName || chk.bankAccount?.bankName || "Unspecified"}
                      </p>
                      {chk.payee && (
                        <p className="truncate">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Payee:</span> {chk.payee}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800">
              <span>
                Total Active Checks:{" "}
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {checks.filter((c) => c.status !== "VOID").length} check(s)
                </span>
              </span>
              <span>
                Total Checked Payout:{" "}
                <span className="font-mono font-bold text-blue-700 dark:text-blue-400 text-sm">
                  ₱{totalCheckAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>{" "}
                <span className="text-[11px] text-slate-400">
                  (Run Net: ₱{totalNetPay.toLocaleString("en-US", { minimumFractionDigits: 2 })})
                </span>
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
