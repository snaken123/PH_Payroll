"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PhilhealthRatesTab } from "@/components/admin/rates/philhealth-rates-tab";
import { PagibigRatesTab } from "@/components/admin/rates/pagibig-rates-tab";
import { DeminimisRatesTab } from "@/components/admin/rates/deminimis-rates-tab";
import { ThirteenthMonthRatesTab } from "@/components/admin/rates/thirteenth-month-rates-tab";
import { MinwageRatesTab } from "@/components/admin/rates/minwage-rates-tab";
import { SssRatesTab } from "@/components/admin/rates/sss-rates-tab";
import { BirRatesTab } from "@/components/admin/rates/bir-rates-tab";

import type { ComponentProps } from "react";

export interface StatutoryRatesData {
  sssBrackets: ComponentProps<typeof SssRatesTab>["brackets"];
  philhealthConfigs: ComponentProps<typeof PhilhealthRatesTab>["configs"];
  pagibigBrackets: ComponentProps<typeof PagibigRatesTab>["configs"];
  birBrackets: ComponentProps<typeof BirRatesTab>["brackets"];
  deMinimisCeilings: ComponentProps<typeof DeminimisRatesTab>["ceilings"];
  minimumWageRates: ComponentProps<typeof MinwageRatesTab>["rates"];
  thirteenthMonthConfigs: ComponentProps<typeof ThirteenthMonthRatesTab>["configs"];
}

export function RatesAdminClient({ initialData }: { initialData: StatutoryRatesData }) {
  const [data, setData] = useState<StatutoryRatesData>(initialData);
  const [loading, setLoading] = useState(false);

  async function refreshData() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/rates");
      if (res.ok) {
        const body = await res.json();
        setData(body);
      }
    } catch (err) {
      console.error("Failed to refresh statutory rates:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Statutory Rate Governance</h1>
          <p className="text-sm text-muted-foreground">
            Platform-level, effective-dated statutory tables (SSS, PhilHealth, Pag-IBIG, BIR Tax, De Minimis, Minimum Wage, 13th Month).
          </p>
        </div>
        {loading && <span className="text-xs text-muted-foreground animate-pulse">Refreshing rates...</span>}
      </div>

      <Tabs defaultValue="philhealth" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="philhealth">PhilHealth</TabsTrigger>
          <TabsTrigger value="pagibig">Pag-IBIG</TabsTrigger>
          <TabsTrigger value="deminimis">De Minimis</TabsTrigger>
          <TabsTrigger value="thirteenth-month">13th Month</TabsTrigger>
          <TabsTrigger value="minwage">Minimum Wage</TabsTrigger>
          <TabsTrigger value="sss">SSS</TabsTrigger>
          <TabsTrigger value="bir">BIR Tax Brackets</TabsTrigger>
        </TabsList>

        <TabsContent value="philhealth" className="pt-4">
          <PhilhealthRatesTab configs={data.philhealthConfigs ?? []} onRefresh={refreshData} />
        </TabsContent>

        <TabsContent value="pagibig" className="pt-4">
          <PagibigRatesTab configs={data.pagibigBrackets ?? []} onRefresh={refreshData} />
        </TabsContent>

        <TabsContent value="deminimis" className="pt-4">
          <DeminimisRatesTab ceilings={data.deMinimisCeilings ?? []} onRefresh={refreshData} />
        </TabsContent>

        <TabsContent value="thirteenth-month" className="pt-4">
          <ThirteenthMonthRatesTab configs={data.thirteenthMonthConfigs ?? []} onRefresh={refreshData} />
        </TabsContent>

        <TabsContent value="minwage" className="pt-4">
          <MinwageRatesTab rates={data.minimumWageRates ?? []} onRefresh={refreshData} />
        </TabsContent>

        <TabsContent value="sss" className="pt-4">
          <SssRatesTab brackets={data.sssBrackets ?? []} onRefresh={refreshData} />
        </TabsContent>

        <TabsContent value="bir" className="pt-4">
          <BirRatesTab brackets={data.birBrackets ?? []} onRefresh={refreshData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
