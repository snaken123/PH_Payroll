"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface SssBracketItem {
  id: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  mscFloor: number | string;
  mscCeiling: number | string;
  msc: number | string;
  eeShare: number | string;
  erShare: number | string;
  mpfEeShare: number | string | null;
  mpfErShare: number | string | null;
  ecAmount: number | string;
  sourceReference: string;
}

export function SssRatesTab({ brackets }: { brackets: SssBracketItem[]; onRefresh: () => void }) {
  // Group brackets by effectiveFrom date
  const versionGroups = new Map<string, SssBracketItem[]>();
  for (const b of brackets) {
    const key = new Date(b.effectiveFrom).toISOString().slice(0, 10);
    if (!versionGroups.has(key)) versionGroups.set(key, []);
    versionGroups.get(key)!.push(b);
  }

  const versions = Array.from(versionGroups.entries());

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">SSS Contribution Schedule</h2>
        <p className="text-sm text-muted-foreground">
          Monthly Salary Credit (MSC), EE/ER Regular Share, Mandatory Provident Fund (WISP), and EC contributions under SSS Circular 2024-006.
        </p>
      </div>

      {versions.map(([dateKey, items]) => {
        const isActive = !items[0]?.effectiveTo;
        const sourceRef = items[0]?.sourceReference;

        return (
          <Card key={dateKey}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  Effective From: {new Date(dateKey).toLocaleDateString()}
                  <Badge variant={isActive ? "default" : "secondary"}>
                    {isActive ? "Active Schedule" : "Historical"}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Source: {sourceRef}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Compensation Range (₱)</TableHead>
                      <TableHead>Monthly Salary Credit (MSC)</TableHead>
                      <TableHead>Regular EE Share</TableHead>
                      <TableHead>Regular ER Share</TableHead>
                      <TableHead>MPF (WISP) EE</TableHead>
                      <TableHead>MPF (WISP) ER</TableHead>
                      <TableHead>EC Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((b) => {
                      const floor = Number(b.mscFloor);
                      const ceiling = Number(b.mscCeiling);
                      const rangeStr = ceiling > 9000000 ? `${floor.toLocaleString()} & above` : `${floor.toLocaleString()} – ${ceiling.toLocaleString()}`;

                      return (
                        <TableRow key={b.id}>
                          <TableCell className="font-mono text-xs">{rangeStr}</TableCell>
                          <TableCell className="font-semibold">₱{Number(b.msc).toLocaleString()}</TableCell>
                          <TableCell>₱{Number(b.eeShare).toLocaleString()}</TableCell>
                          <TableCell>₱{Number(b.erShare).toLocaleString()}</TableCell>
                          <TableCell>{b.mpfEeShare ? `₱${Number(b.mpfEeShare).toLocaleString()}` : "—"}</TableCell>
                          <TableCell>{b.mpfErShare ? `₱${Number(b.mpfErShare).toLocaleString()}` : "—"}</TableCell>
                          <TableCell>₱{Number(b.ecAmount).toLocaleString()}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
