"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheckIcon, FileTextIcon } from "lucide-react";
import { ContributionsTracker } from "./contributions-tracker";
import type { CompanyBankOption } from "@/components/payroll/record-check-dialog";

interface ReportsTabsClientProps {
  officialReportsContent: React.ReactNode;
  companyBankAccounts?: CompanyBankOption[];
  canManage?: boolean;
}

export function ReportsTabsClient({
  officialReportsContent,
  companyBankAccounts = [],
  canManage = true,
}: ReportsTabsClientProps) {
  const [activeTab, setActiveTab] = useState("contributions");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
      <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
        <TabsTrigger
          value="contributions"
          className="text-xs font-bold gap-2 px-4 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-xs"
        >
          <ShieldCheckIcon className="size-3.5 text-blue-600" />
          Statutory Contributions &amp; Remittance Tracker
        </TabsTrigger>
        <TabsTrigger
          value="official-filings"
          className="text-xs font-bold gap-2 px-4 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-xs"
        >
          <FileTextIcon className="size-3.5 text-blue-600" />
          Official Filing PDFs &amp; Tax Declarations
        </TabsTrigger>
      </TabsList>

      <TabsContent value="contributions" className="mt-0 space-y-6">
        <ContributionsTracker
          companyBankAccounts={companyBankAccounts}
          canManage={canManage}
        />
      </TabsContent>

      <TabsContent value="official-filings" className="mt-0 space-y-6">
        {officialReportsContent}
      </TabsContent>
    </Tabs>
  );
}
