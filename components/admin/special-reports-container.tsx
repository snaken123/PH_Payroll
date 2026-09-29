"use client";

import { useState } from "react";
import { CompanyPayoutReport } from "@/components/admin/company-payout-report";
import { BdoBobReport } from "@/components/admin/bdo-bob-report";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileSpreadsheetIcon, LandmarkIcon } from "lucide-react";

export function SpecialReportsContainer() {
  const [activeTab, setActiveTab] = useState<string>("bdo-bob");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Platform Special Reports</h1>
          <p className="text-xs text-slate-400">Superadmin executive analytics &amp; automated bank ATM converter reports.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <TabsTrigger value="bdo-bob" className="text-xs font-bold gap-2 px-4 py-2 data-[state=active]:bg-amber-950/60 data-[state=active]:text-amber-300 data-[state=active]:border-amber-500/50">
            <LandmarkIcon className="size-4 text-amber-400" />
            BDO BOB Converter (.xls)
          </TabsTrigger>
          <TabsTrigger value="company-payout" className="text-xs font-bold gap-2 px-4 py-2 data-[state=active]:bg-blue-950/60 data-[state=active]:text-blue-300 data-[state=active]:border-blue-500/50">
            <FileSpreadsheetIcon className="size-4 text-blue-400" />
            Company Payout Report
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bdo-bob" className="mt-0">
          <BdoBobReport />
        </TabsContent>

        <TabsContent value="company-payout" className="mt-0">
          <CompanyPayoutReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}
