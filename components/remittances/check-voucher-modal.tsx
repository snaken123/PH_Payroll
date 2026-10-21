"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PrinterIcon, CheckCircle2Icon, LandmarkIcon, Building2Icon } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface CheckVoucherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  check: {
    id: string;
    checkNumber: string;
    checkDate: string | Date;
    amount: number | string | any;
    payee?: string | null;
    bankName?: string | null;
    notes?: string | null;
    status: string;
    company?: {
      legalName: string;
      companyCode: string;
      tin: string;
      registeredAddress?: string | null;
      sssEmployerNumber?: string | null;
      philhealthEmployerNumber?: string | null;
      pagibigEmployerId?: string | null;
    } | null;
    bankAccount?: {
      bankName: string;
      accountNumber: string;
    } | null;
    remittanceBatchItems?: Array<{
      id: string;
      itemType: string;
      agency: string;
      amount: number | string | any;
      description?: string | null;
      statutoryPaymentRecord?: {
        periodMonth: number;
        periodYear: number;
        referenceNumber?: string | null;
        computedEeAmount: number | string | any;
        computedErAmount: number | string | any;
        payrollRun?: {
          runNumber: number;
          payrollPeriod?: {
            cutoffStart: string | Date;
            cutoffEnd: string | Date;
          } | null;
        } | null;
      } | null;
      loanDeduction?: {
        cutoffDate: string | Date;
        remittanceReference?: string | null;
        loan: {
          name: string;
          category: string;
          referenceNumber?: string | null;
          employee: {
            employeeNumber: string;
            lastName: string;
            firstName: string;
            sssNumber?: string | null;
            pagibigNumber?: string | null;
          };
        };
      } | null;
    }>;
  } | null;
}

// Convert number to English words for Philippine check voucher
function numberToWords(num: number): string {
  if (num === 0) return "ZERO PESOS ONLY";

  const a = [
    "",
    "ONE",
    "TWO",
    "THREE",
    "FOUR",
    "FIVE",
    "SIX",
    "SEVEN",
    "EIGHT",
    "NINE",
    "TEN",
    "ELEVEN",
    "TWELVE",
    "THIRTEEN",
    "FOURTEEN",
    "FIFTEEN",
    "SIXTEEN",
    "SEVENTEEN",
    "EIGHTEEN",
    "NINETEEN",
  ];
  const b = [
    "",
    "",
    "TWENTY",
    "THIRTY",
    "FORTY",
    "FIFTY",
    "SIXTY",
    "SEVENTY",
    "EIGHTY",
    "NINETY",
  ];

  function convertGroup(n: number): string {
    let group = "";
    if (n >= 100) {
      group += a[Math.floor(n / 100)] + " HUNDRED ";
      n %= 100;
    }
    if (n >= 20) {
      group += b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : "");
    } else if (n > 0) {
      group += a[n];
    }
    return group.trim();
  }

  const whole = Math.floor(num);
  const cents = Math.round((num - whole) * 100);

  let res = "";
  if (whole >= 1000000) {
    res += convertGroup(Math.floor(whole / 1000000)) + " MILLION ";
  }
  const thousands = Math.floor((whole % 1000000) / 1000);
  if (thousands > 0) {
    res += convertGroup(thousands) + " THOUSAND ";
  }
  const remainder = whole % 1000;
  if (remainder > 0) {
    res += convertGroup(remainder);
  }

  res = res.trim() + " PESOS";
  if (cents > 0) {
    res += " & " + cents + "/100";
  } else {
    res += " ONLY";
  }

  return res.toUpperCase();
}

export function CheckVoucherModal({ open, onOpenChange, check }: CheckVoucherModalProps) {
  if (!check) return null;

  const rawAmount = typeof check.amount === "number" ? check.amount : Number(check.amount);
  const amountWords = numberToWords(rawAmount);

  const formattedDate = new Date(check.checkDate).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const primaryAgency = check.remittanceBatchItems?.[0]?.agency || "STATUTORY";
  const primaryRef =
    check.remittanceBatchItems?.[0]?.statutoryPaymentRecord?.referenceNumber ||
    check.remittanceBatchItems?.[0]?.loanDeduction?.remittanceReference ||
    "N/A";

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 max-h-[92vh] overflow-y-auto print:bg-white print:text-black print:border-none print:shadow-none print:p-0 print:max-h-none">
        <DialogHeader className="print:hidden">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <div>
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <LandmarkIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
                Check Disbursement Voucher &amp; Transmittal Slip
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                Official statutory remittance voucher for check #{check.checkNumber}
              </DialogDescription>
            </div>
            <Button
              onClick={handlePrint}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5 shadow-sm"
            >
              <PrinterIcon className="size-3.5" /> Print Voucher
            </Button>
          </div>
        </DialogHeader>

        {/* Printable Voucher Paper */}
        <div id="printable-voucher" className="p-6 bg-white text-slate-900 rounded-xl space-y-5 text-xs shadow-inner print:p-0 print:shadow-none">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-black tracking-tight text-slate-950 uppercase">
                {check.company?.legalName || "COMPANY NAME"}
              </h2>
              <p className="text-[11px] text-slate-600">
                {check.company?.registeredAddress || "Registered Business Address"}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-700 font-mono pt-1">
                <span>TIN: {check.company?.tin || "—"}</span>
                {check.company?.sssEmployerNumber && <span>SSS ID: {check.company.sssEmployerNumber}</span>}
                {check.company?.philhealthEmployerNumber && <span>PHIC ID: {check.company.philhealthEmployerNumber}</span>}
                {check.company?.pagibigEmployerId && <span>HDMF ID: {check.company.pagibigEmployerId}</span>}
              </div>
            </div>

            <div className="text-right space-y-1">
              <span className="text-xs font-black uppercase tracking-wider px-2.5 py-1 bg-slate-900 text-white rounded">
                Check Voucher
              </span>
              <p className="font-mono text-xs font-bold pt-1">VOUCHER NO: CDV-{check.checkNumber}</p>
              <p className="text-[11px] text-slate-600">Date: {formattedDate}</p>
            </div>
          </div>

          {/* Check Information Box */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-100 p-3.5 rounded-lg border border-slate-300 font-sans">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Bank Name</span>
              <span className="font-semibold text-xs text-slate-900">{check.bankName || check.bankAccount?.bankName || "—"}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Check Number</span>
              <span className="font-mono font-bold text-xs text-slate-900">{check.checkNumber}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Check Date</span>
              <span className="font-semibold text-xs text-slate-900">{formattedDate}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Agency Ref / PRN</span>
              <span className="font-mono font-bold text-xs text-emerald-800">{primaryRef}</span>
            </div>
          </div>

          {/* Payee & Amount Words */}
          <div className="space-y-2 border border-slate-300 p-3.5 rounded-lg">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-600 uppercase">Payee:</span>
              <span className="text-sm font-black text-slate-950 font-mono tracking-wide">{check.payee || "—"}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-600 uppercase">Amount in Words:</span>
              <span className="text-xs font-bold text-slate-900 italic font-mono text-right max-w-xl">{amountWords}</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-bold text-slate-600 uppercase">Check Amount:</span>
              <span className="text-lg font-black text-emerald-800 font-mono">
                {formatCurrency(rawAmount)}
              </span>
            </div>
          </div>

          {/* Particulars / Items Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Particulars &amp; Covered Statutory Remittance Items ({check.remittanceBatchItems?.length || 0})
            </h4>
            <div className="border border-slate-300 rounded-lg overflow-hidden">
              <table className="w-full text-[11px] text-left">
                <thead className="bg-slate-200 text-slate-800 font-bold uppercase border-b border-slate-300">
                  <tr>
                    <th className="p-2">Item Type</th>
                    <th className="p-2">Agency</th>
                    <th className="p-2">Description / Employee Details</th>
                    <th className="p-2">Period / Cutoff</th>
                    <th className="p-2 text-right">Amount (PHP)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {check.remittanceBatchItems && check.remittanceBatchItems.length > 0 ? (
                    check.remittanceBatchItems.map((item, idx) => {
                      const isLoan = item.itemType === "LOAN";
                      const period = isLoan
                        ? item.loanDeduction?.cutoffDate
                          ? new Date(item.loanDeduction.cutoffDate).toLocaleDateString()
                          : "—"
                        : item.statutoryPaymentRecord?.payrollRun?.payrollPeriod
                        ? `Cutoff ${new Date(item.statutoryPaymentRecord.payrollRun.payrollPeriod.cutoffStart).toISOString().slice(5, 10)} to ${new Date(item.statutoryPaymentRecord.payrollRun.payrollPeriod.cutoffEnd).toISOString().slice(5, 10)} (Run #${item.statutoryPaymentRecord.payrollRun.runNumber})`
                        : item.statutoryPaymentRecord
                        ? `${item.statutoryPaymentRecord.periodMonth}/${item.statutoryPaymentRecord.periodYear}`
                        : "—";

                      const empDetails = isLoan && item.loanDeduction?.loan?.employee
                        ? `${item.loanDeduction.loan.employee.lastName}, ${item.loanDeduction.loan.employee.firstName} (${item.loanDeduction.loan.name})`
                        : item.description || "Statutory Contribution";

                      const itemAmt = typeof item.amount === "number" ? item.amount : Number(item.amount);

                      return (
                        <tr key={item.id || idx} className="hover:bg-slate-50">
                          <td className="p-2 font-semibold">
                            <span className="px-1.5 py-0.5 rounded bg-slate-200 text-[10px] font-mono">
                              {item.itemType}
                            </span>
                          </td>
                          <td className="p-2 font-bold font-mono">{item.agency}</td>
                          <td className="p-2 text-slate-800">{empDetails}</td>
                          <td className="p-2 font-mono text-slate-700">{period}</td>
                          <td className="p-2 font-mono text-right font-semibold">
                            {formatCurrency(itemAmt)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-500 italic">
                        {check.notes || "Statutory Remittance Payment"}
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-slate-100 font-bold border-t border-slate-300">
                  <tr>
                    <td colSpan={4} className="p-2 text-right uppercase text-xs">Total Check Amount:</td>
                    <td className="p-2 text-right font-mono text-sm text-emerald-900 font-black">
                      {formatCurrency(rawAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Memo / Notes */}
          {check.notes && (
            <div className="text-[11px] text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-200">
              <span className="font-bold">Memo / Transmittal Note:</span> {check.notes}
            </div>
          )}

          {/* Signatory Grid */}
          <div className="pt-6 grid grid-cols-3 gap-6 text-center border-t border-slate-300">
            <div className="space-y-8">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Prepared By (Remittance Officer):
              </span>
              <div className="border-b border-slate-900 mx-4" />
              <span className="text-[11px] font-semibold text-slate-800 block">Liaison / Treasury Officer</span>
            </div>
            <div className="space-y-8">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Verified &amp; Audited By:
              </span>
              <div className="border-b border-slate-900 mx-4" />
              <span className="text-[11px] font-semibold text-slate-800 block">Payroll Master / Accounting</span>
            </div>
            <div className="space-y-8">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Approved For Check Release:
              </span>
              <div className="border-b border-slate-900 mx-4" />
              <span className="text-[11px] font-semibold text-slate-800 block">Authorized Signatory / Treasurer</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
