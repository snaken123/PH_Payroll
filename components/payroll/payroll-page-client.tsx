"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WalletIcon, CreditCardIcon } from "lucide-react";
import { CheckRegisterTab } from "./check-register-tab";

interface PayrollPageClientProps {
  runsContent: React.ReactNode;
  initialTab?: string;
}

export function PayrollPageClient({ runsContent, initialTab = "runs" }: PayrollPageClientProps) {
  const [activeTab, setActiveTab] = useState(initialTab);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
      <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
        <TabsTrigger
          value="runs"
          className="text-xs font-bold gap-2 px-4 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-xs"
        >
          <WalletIcon className="size-3.5 text-blue-600" />
          Payroll Runs &amp; Register
        </TabsTrigger>
        <TabsTrigger
          value="checks"
          className="text-xs font-bold gap-2 px-4 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-xs"
        >
          <CreditCardIcon className="size-3.5 text-blue-600" />
          Check Register
        </TabsTrigger>
      </TabsList>

      <TabsContent value="runs" className="mt-0 space-y-6">
        {runsContent}
      </TabsContent>

      <TabsContent value="checks" className="mt-0">
        <CheckRegisterTab />
      </TabsContent>
    </Tabs>
  );
}
