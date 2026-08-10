"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  BookOpenIcon,
  FileTextIcon,
  CalculatorIcon,
  ShieldCheckIcon,
  DownloadIcon,
  ExternalLinkIcon,
  LandmarkIcon,
  InfoIcon,
  SearchIcon,
} from "lucide-react";

interface SssBracket {
  id: string;
  mscFloor: number;
  mscCeiling: number;
  msc: number;
  eeShare: number;
  erShare: number;
  mpfEeShare: number;
  mpfErShare: number;
  ecAmount: number;
}

interface PhilhealthConfig {
  premiumRate: number;
  eeShareRate: number;
  erShareRate: number;
  floorSalary: number;
  ceilingSalary: number;
}

interface PagibigBracket {
  salaryThreshold: number;
  eeRateBelowThreshold: number;
  erRateBelowThreshold: number;
  eeRateAboveThreshold: number;
  erRateAboveThreshold: number;
  maxFundSalary: number;
  eeCap: number;
  erCap: number;
}

interface BirBracket {
  id: string;
  payPeriodType: string;
  minCompensation: number;
  maxCompensation: number | null;
  baseTaxAmount: number;
  percentageOverMin: number;
}

interface DeMinimisCeiling {
  id: string;
  category: string;
  ceilingAmount: number;
  frequency: string;
  sourceReference: string;
}

const OFFICIAL_CIRCULARS = [
  {
    agency: "SSS",
    title: "SSS Circular No. 2024-006",
    subtitle: "New Schedule of Social Security Contributions (Effective 2025-2026)",
    description: "Official SSS contribution table with 14% total rate (9.5% ER, 4.5% EE) and Mandatory Provident Fund (MPF/WISP) tiers up to ₱35,000 MSC.",
    pdfUrl: "https://www.sss.gov.ph/sss/DownloadContent?fileName=2024-006-Schedule-of-SS-Contributions.pdf",
    badge: "Official SSS Circular",
  },
  {
    agency: "PhilHealth",
    title: "PhilHealth Circular 2026",
    subtitle: "Revised Premium Rate & Salary Ceiling Schedule",
    description: "Official 5.0% premium rate schedule with ₱10,000 monthly floor and ₱100,000 monthly ceiling, split equally (2.5% EE / 2.5% ER).",
    pdfUrl: "https://www.philhealth.gov.ph/circulars/",
    badge: "Official PhilHealth Circular",
  },
  {
    agency: "Pag-IBIG",
    title: "Pag-IBIG Circular No. 460",
    subtitle: "Mandatory Monthly Contribution Ceiling Increase",
    description: "Adjusted Maximum Fund Salary (MFS) cap to ₱10,000, setting max mandatory contribution to ₱200 EE and ₱200 ER.",
    pdfUrl: "https://www.pagibigfund.gov.ph/document/pdf/circulars/provident/Circular%20No.%20460%20-%20Adjusted%20Maximum%20Monthly%20Compensation%20Rate.pdf",
    badge: "Official Pag-IBIG Circular",
  },
  {
    agency: "BIR",
    title: "BIR Revenue Regulations (TRAIN Law)",
    subtitle: "Revised Withholding Tax Rates under Republic Act No. 10963",
    description: "Official revised semi-monthly and monthly withholding tax tables for compensation earners.",
    pdfUrl: "https://www.bir.gov.ph/index.php/revenue-issuances/revenue-regulations.html",
    badge: "BIR Tax Issuance",
  },
  {
    agency: "DOLE",
    title: "DOLE Handbook on Workers' Statutory Monetary Benefits",
    subtitle: "Official Labor Code & Statutory Pay Guidelines",
    description: "Official guidance on overtime, night differential, holiday premiums, service incentive leave, 13th month pay, and retirement pay.",
    pdfUrl: "https://bwc.dole.gov.ph/images/Handbooks/2023_Handbook_StatutoryMonetaryBenefits.pdf",
    badge: "DOLE Official Handbook",
  },
];

export function HelpClient({
  sssBrackets,
  philhealthConfig,
  pagibigBracket,
  birBrackets,
  deMinimisCeilings,
}: {
  sssBrackets: SssBracket[];
  philhealthConfig: PhilhealthConfig | null;
  pagibigBracket: PagibigBracket | null;
  birBrackets: BirBracket[];
  deMinimisCeilings: DeMinimisCeiling[];
}) {
  const [calcSalary, setCalcSalary] = useState<number>(15200);

  // Live Calculator Logic
  const matchedSss = sssBrackets.find((b) => calcSalary >= b.mscFloor && calcSalary <= b.mscCeiling) ?? sssBrackets[0];
  const sssEe = matchedSss ? matchedSss.eeShare + matchedSss.mpfEeShare : 0;
  const sssEr = matchedSss ? matchedSss.erShare + matchedSss.mpfErShare + matchedSss.ecAmount : 0;

  const phRate = philhealthConfig ? philhealthConfig.eeShareRate : 0.025;
  const phBase = philhealthConfig
    ? Math.max(philhealthConfig.floorSalary, Math.min(calcSalary, philhealthConfig.ceilingSalary))
    : calcSalary;
  const phEe = Math.round(phBase * phRate * 100) / 100;
  const phEr = phEe;

  const pagibigCap = pagibigBracket ? pagibigBracket.eeCap : 200;
  const pagibigEe = Math.min(calcSalary * 0.02, pagibigCap);
  const pagibigEr = pagibigEe;

  const semiMonthlySalary = calcSalary / 2;
  const semiMonthlyTaxable = Math.max(0, semiMonthlySalary - (sssEe + phEe + pagibigEe));
  const semiBrackets = birBrackets.filter((b) => b.payPeriodType === "SEMI_MONTHLY");
  const matchedTaxBracket = semiBrackets.find(
    (b) => semiMonthlyTaxable >= b.minCompensation && (b.maxCompensation === null || semiMonthlyTaxable <= b.maxCompensation)
  );
  const semiTax = matchedTaxBracket
    ? matchedTaxBracket.baseTaxAmount + (semiMonthlyTaxable - matchedTaxBracket.minCompensation) * (matchedTaxBracket.percentageOverMin / 100)
    : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border bg-gradient-to-r from-slate-900 via-primary/95 to-slate-900 text-white shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="size-6 text-emerald-400" />
            <h1 className="text-2xl font-bold tracking-tight">Payroll Compliance &amp; Help Center</h1>
          </div>
          <p className="text-sm text-slate-300 max-w-2xl">
            Official Philippine statutory contribution schedules, government circular references, BIR tax tables, and DOLE payroll compliance guidelines.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="border-emerald-400/40 text-emerald-300 px-3 py-1 text-xs">
            Official 2026 Statutory Rate Tables
          </Badge>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="calculator" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto p-1 bg-muted/80 rounded-xl gap-1">
          <TabsTrigger value="calculator" className="gap-1.5 text-xs font-semibold py-2">
            <CalculatorIcon className="size-3.5" /> Rate Calculator
          </TabsTrigger>
          <TabsTrigger value="sss" className="gap-1.5 text-xs font-semibold py-2">
            <LandmarkIcon className="size-3.5" /> SSS Schedule
          </TabsTrigger>
          <TabsTrigger value="philhealth" className="gap-1.5 text-xs font-semibold py-2">
            <ShieldCheckIcon className="size-3.5" /> PhilHealth Schedule
          </TabsTrigger>
          <TabsTrigger value="pagibig" className="gap-1.5 text-xs font-semibold py-2">
            <LandmarkIcon className="size-3.5" /> Pag-IBIG Schedule
          </TabsTrigger>
          <TabsTrigger value="tax" className="gap-1.5 text-xs font-semibold py-2">
            <FileTextIcon className="size-3.5" /> BIR Tax Tables
          </TabsTrigger>
          <TabsTrigger value="deminimis" className="gap-1.5 text-xs font-semibold py-2">
            <InfoIcon className="size-3.5" /> De Minimis Ceilings
          </TabsTrigger>
          <TabsTrigger value="circulars" className="gap-1.5 text-xs font-semibold py-2">
            <BookOpenIcon className="size-3.5" /> Government Circulars &amp; PDFs
          </TabsTrigger>
        </TabsList>

        {/* 1. Calculator Tab */}
        <TabsContent value="calculator" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalculatorIcon className="size-5 text-primary" /> Interactive Salary Deduction &amp; Statutory Rate Lookup
              </CardTitle>
              <CardDescription>
                Enter any monthly basic salary to inspect the exact SSS MSC bracket, PhilHealth 2.5% split, Pag-IBIG cap, and BIR semi-monthly tax computation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="max-w-sm space-y-2">
                <Label htmlFor="calcSalary" className="text-sm font-semibold">Monthly Basic Salary (₱)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm text-muted-foreground font-semibold">₱</span>
                  <Input
                    id="calcSalary"
                    type="number"
                    min={0}
                    step={100}
                    value={calcSalary}
                    onChange={(e) => setCalcSalary(Number(e.target.value))}
                    className="pl-7 font-semibold text-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                <div className="p-4 rounded-xl border bg-card space-y-2 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                    <span>SSS EE Share</span>
                    <Badge variant="secondary">MSC ₱{matchedSss?.msc.toLocaleString()}</Badge>
                  </div>
                  <p className="text-2xl font-bold text-primary">₱{sssEe.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    ER Share: ₱{sssEr.toLocaleString()} (SS + WISP + EC)
                  </p>
                </div>

                <div className="p-4 rounded-xl border bg-card space-y-2 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                    <span>PhilHealth EE Share</span>
                    <Badge variant="secondary">2.5% Rate</Badge>
                  </div>
                  <p className="text-2xl font-bold text-primary">₱{phEe.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    ER Share: ₱{phEr.toLocaleString()} (5.0% Total)
                  </p>
                </div>

                <div className="p-4 rounded-xl border bg-card space-y-2 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                    <span>Pag-IBIG EE Share</span>
                    <Badge variant="secondary">Capped ₱200</Badge>
                  </div>
                  <p className="text-2xl font-bold text-primary">₱{pagibigEe.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    ER Share: ₱{pagibigEr.toLocaleString()} (2% Cap)
                  </p>
                </div>

                <div className="p-4 rounded-xl border bg-card space-y-2 shadow-sm border-primary/20 bg-primary/5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                    <span>Est. Semi-Monthly Tax</span>
                    <Badge variant="default" className="text-[10px]">1st / 2nd Cutoff</Badge>
                  </div>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    ₱{semiTax.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Taxable Pay: ₱{semiMonthlyTaxable.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. SSS Table Tab */}
        <TabsContent value="sss" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">SSS Contribution Schedule (Circular 2024-006)</CardTitle>
                <CardDescription>
                  Official Monthly Salary Credit (MSC) compensation brackets, Regular SS EE/ER shares, Mandatory Provident Fund (WISP), and EC contributions.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">14% Total Rate (9.5% ER / 4.5% EE)</Badge>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Compensation Range</TableHead>
                    <TableHead>Monthly Salary Credit (MSC)</TableHead>
                    <TableHead>Regular SS EE (4.5%)</TableHead>
                    <TableHead>Regular SS ER (9.5%)</TableHead>
                    <TableHead>WISP / MPF EE</TableHead>
                    <TableHead>WISP / MPF ER</TableHead>
                    <TableHead>EC (ER)</TableHead>
                    <TableHead className="font-semibold text-primary">Total EE Share</TableHead>
                    <TableHead className="font-semibold">Total ER Share</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sssBrackets.map((b) => {
                    const totalEe = b.eeShare + b.mpfEeShare;
                    const totalEr = b.erShare + b.mpfErShare + b.ecAmount;
                    const isMatched = calcSalary >= b.mscFloor && calcSalary <= b.mscCeiling;
                    return (
                      <TableRow key={b.id} className={isMatched ? "bg-primary/10 font-medium" : undefined}>
                        <TableCell className="font-mono text-xs">
                          ₱{b.mscFloor.toLocaleString()} – {b.mscCeiling > 900000 ? "AND ABOVE" : `₱${b.mscCeiling.toLocaleString()}`}
                        </TableCell>
                        <TableCell className="font-bold">₱{b.msc.toLocaleString()}</TableCell>
                        <TableCell>₱{b.eeShare.toLocaleString()}</TableCell>
                        <TableCell>₱{b.erShare.toLocaleString()}</TableCell>
                        <TableCell>{b.mpfEeShare > 0 ? `₱${b.mpfEeShare.toLocaleString()}` : "—"}</TableCell>
                        <TableCell>{b.mpfErShare > 0 ? `₱${b.mpfErShare.toLocaleString()}` : "—"}</TableCell>
                        <TableCell>₱{b.ecAmount.toLocaleString()}</TableCell>
                        <TableCell className="font-bold text-primary">₱{totalEe.toLocaleString()}</TableCell>
                        <TableCell className="font-bold">₱{totalEr.toLocaleString()}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. PhilHealth Table Tab */}
        <TabsContent value="philhealth" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">PhilHealth Premium Rate Schedule (2026)</CardTitle>
              <CardDescription>
                Republic Act 11223 (Universal Health Care Act) 5.0% premium contribution schedule with salary floor and ceiling limits.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border space-y-1">
                  <p className="text-xs text-muted-foreground font-semibold">Total Premium Rate</p>
                  <p className="text-2xl font-bold text-primary">5.0%</p>
                  <p className="text-xs text-muted-foreground">Split 50% Employee (2.5%) / 50% Employer (2.5%)</p>
                </div>
                <div className="p-4 rounded-xl border space-y-1">
                  <p className="text-xs text-muted-foreground font-semibold">Monthly Salary Floor</p>
                  <p className="text-2xl font-bold">₱10,000.00</p>
                  <p className="text-xs text-muted-foreground">Minimum monthly contribution = ₱500.00 (₱250 EE / ₱250 ER)</p>
                </div>
                <div className="p-4 rounded-xl border space-y-1">
                  <p className="text-xs text-muted-foreground font-semibold">Monthly Salary Ceiling</p>
                  <p className="text-2xl font-bold">₱100,000.00</p>
                  <p className="text-xs text-muted-foreground">Maximum monthly contribution = ₱5,000.00 (₱2,500 EE / ₱2,500 ER)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. Pag-IBIG Table Tab */}
        <TabsContent value="pagibig" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pag-IBIG (HDMF) Contribution Schedule (Circular No. 460)</CardTitle>
              <CardDescription>
                Mandatory employee and employer contribution rates and maximum ceiling parameters under Republic Act No. 9679.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border space-y-2">
                  <p className="text-sm font-semibold">Monthly Salary ≤ ₱1,500.00</p>
                  <p className="text-xs text-muted-foreground">Employee Rate: 1.0% | Employer Rate: 2.0%</p>
                </div>
                <div className="p-4 rounded-xl border space-y-2 border-primary/20 bg-primary/5">
                  <p className="text-sm font-semibold">Monthly Salary &gt; ₱1,500.00</p>
                  <p className="text-xs text-muted-foreground">
                    Employee Rate: 2.0% (Capped at ₱200.00/mo) | Employer Rate: 2.0% (Capped at ₱200.00/mo)
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl border bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 space-y-2 text-amber-900 dark:text-amber-200">
                <p className="text-xs font-semibold uppercase tracking-wider">Voluntary MP2 &amp; Additional Contributions</p>
                <p className="text-xs">
                  Employees can voluntarily increase their Pag-IBIG monthly savings above ₱200 or contribute to the <strong>Modified Pag-IBIG II (MP2)</strong> savings program. MP2 dividend rates are 100% tax-free and yield 6.5%–7.5%+ per year.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. BIR Tax Table Tab */}
        <TabsContent value="tax" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">BIR Withholding Tax Tables (Revised TRAIN Law)</CardTitle>
              <CardDescription>
                Official Revised Withholding Tax brackets under Republic Act No. 10963 (TRAIN Law) for Semi-Monthly compensation earners.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Semi-Monthly Taxable Compensation</TableHead>
                    <TableHead>Base Tax Amount</TableHead>
                    <TableHead>Percentage Rate Over Minimum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {birBrackets
                    .filter((b) => b.payPeriodType === "SEMI_MONTHLY")
                    .map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-mono text-xs">
                          ₱{b.minCompensation.toLocaleString()} – {b.maxCompensation ? `₱${b.maxCompensation.toLocaleString()}` : "AND ABOVE"}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {b.baseTaxAmount > 0 ? `₱${b.baseTaxAmount.toLocaleString()}` : "₱0.00 (Exempt)"}
                        </TableCell>
                        <TableCell className="font-bold text-primary">
                          {b.percentageOverMin > 0 ? `+ ${b.percentageOverMin}% over ₱${b.minCompensation.toLocaleString()}` : "0% (Exempt)"}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 6. De Minimis Tab */}
        <TabsContent value="deminimis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">BIR Statutory De Minimis Tax-Exempt Ceilings</CardTitle>
              <CardDescription>
                Non-taxable fringe benefits and allowances exempt from Income Tax and SSS/PhilHealth/Pag-IBIG contribution bases.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Benefit Category</TableHead>
                    <TableHead>Tax-Free Ceiling Amount</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Source Regulation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deMinimisCeilings.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-semibold">{c.category.replaceAll("_", " ")}</TableCell>
                      <TableCell className="font-bold text-emerald-600 dark:text-emerald-400">
                        ₱{c.ceilingAmount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px]">{c.frequency}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.sourceReference}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 7. Government Circulars & PDFs Tab */}
        <TabsContent value="circulars" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {OFFICIAL_CIRCULARS.map((c) => (
              <Card key={c.title} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant="default" className="text-[10px]">{c.badge}</Badge>
                    <Badge variant="outline" className="text-[10px] font-mono">{c.agency}</Badge>
                  </div>
                  <CardTitle className="text-base pt-1">{c.title}</CardTitle>
                  <CardDescription className="text-xs font-medium text-foreground">{c.subtitle}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">{c.description}</p>
                  <div className="pt-2 flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs" render={<a href={c.pdfUrl} target="_blank" rel="noreferrer" />}>
                      <DownloadIcon className="size-3.5 text-primary" /> View / Download PDF
                      <ExternalLinkIcon className="size-3 text-muted-foreground ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
