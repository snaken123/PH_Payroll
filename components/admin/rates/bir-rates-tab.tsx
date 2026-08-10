"use client";

import { PayPeriodType } from "@/lib/generated/prisma/enums";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface BirBracketItem {
  id: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  payPeriodType: PayPeriodType;
  bracketFloor: number | string;
  bracketCeiling: number | string | null;
  baseTax: number | string;
  excessRate: number | string;
  sourceReference: string;
}

export function BirRatesTab({ brackets }: { brackets: BirBracketItem[]; onRefresh: () => void }) {
  // Group by PayPeriodType then by EffectiveFrom
  const periods: PayPeriodType[] = [PayPeriodType.SEMI_MONTHLY, PayPeriodType.MONTHLY, PayPeriodType.ANNUAL];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">BIR Revised Withholding Tax Tables (TRAIN Law)</h2>
        <p className="text-sm text-muted-foreground">
          Progressive withholding tax brackets under BIR RR 11-2018 (RA 10963). Semi-monthly tables govern regular cutoff withholding; Annual tables govern year-end 2316 tax annualization.
        </p>
      </div>

      {periods.map((period) => {
        const periodBrackets = brackets.filter((b) => b.payPeriodType === period);
        if (periodBrackets.length === 0) return null;

        // Group by effectiveFrom
        const dateGroups = new Map<string, BirBracketItem[]>();
        for (const b of periodBrackets) {
          const key = new Date(b.effectiveFrom).toISOString().slice(0, 10);
          if (!dateGroups.has(key)) dateGroups.set(key, []);
          dateGroups.get(key)!.push(b);
        }

        return (
          <div key={period} className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Badge variant="outline" className="text-sm">
                {period}
              </Badge>
              Schedule Brackets
            </h3>

            {Array.from(dateGroups.entries()).map(([dateKey, items]) => {
              const isActive = !items[0]?.effectiveTo;
              const sourceRef = items[0]?.sourceReference;

              return (
                <Card key={dateKey}>
                  <CardHeader className="py-3 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        Effective From: {new Date(dateKey).toLocaleDateString()}
                        <Badge variant={isActive ? "default" : "secondary"}>
                          {isActive ? "Active" : "Historical"}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="text-xs">{sourceRef}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="py-2">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Taxable Income Range (₱)</TableHead>
                          <TableHead>Base Tax (₱)</TableHead>
                          <TableHead>Excess Rate (%)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((b) => {
                          const floor = Number(b.bracketFloor);
                          const ceiling = b.bracketCeiling ? Number(b.bracketCeiling) : null;
                          const rangeStr = ceiling ? `${floor.toLocaleString()} – ${ceiling.toLocaleString()}` : `${floor.toLocaleString()} & above`;

                          return (
                            <TableRow key={b.id}>
                              <TableCell className="font-mono text-xs">{rangeStr}</TableCell>
                              <TableCell className="font-semibold">₱{Number(b.baseTax).toLocaleString()}</TableCell>
                              <TableCell>{(Number(b.excessRate) * 100).toFixed(1)}%</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
