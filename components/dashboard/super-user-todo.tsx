"use client";

import { useState } from "react";
import Link from "next/link";
import type { TodoItem, TodoSummary } from "@/lib/services/todoService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Clock,
  Wallet,
  Banknote,
  CalendarDays,
  FileCheck2,
  ArrowRight,
  ClipboardList,
  AlertCircle,
  Briefcase,
} from "lucide-react";

type FilterTab = "ALL" | "PAYROLL" | "LOANS" | "LEAVE" | "CONTRACTORS";

export function SuperUserTodo({ summary }: { summary: TodoSummary }) {
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");

  const filteredItems = summary.items.filter((item) => {
    if (activeTab === "ALL") return true;
    if (activeTab === "PAYROLL") return item.category === "PAYROLL" || item.category === "FINAL_PAY";
    if (activeTab === "LOANS") return item.category === "LOAN";
    if (activeTab === "LEAVE") return item.category === "LEAVE";
    if (activeTab === "CONTRACTORS") return item.category === "CONTRACTOR_PAYMENT";
    return true;
  });

  const getCategoryIcon = (category: TodoItem["category"]) => {
    switch (category) {
      case "PAYROLL":
        return <Wallet className="size-4 text-blue-600 dark:text-blue-400" />;
      case "FINAL_PAY":
        return <FileCheck2 className="size-4 text-purple-600 dark:text-purple-400" />;
      case "LOAN":
        return <Banknote className="size-4 text-indigo-600 dark:text-indigo-400" />;
      case "LEAVE":
        return <CalendarDays className="size-4 text-emerald-600 dark:text-emerald-400" />;
      case "CONTRACTOR_PAYMENT":
        return <Briefcase className="size-4 text-amber-600 dark:text-amber-400" />;
    }
  };

  const getBadgeStyle = (variant: TodoItem["badgeVariant"]) => {
    switch (variant) {
      case "amber":
        return "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
      case "blue":
        return "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800";
      case "emerald":
        return "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
      case "purple":
        return "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800";
      case "indigo":
        return "bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800";
    }
  };

  const payrollCount = summary.counts.payroll + summary.counts.finalPay;

  return (
    <Card className="border-slate-200/80 shadow-xs dark:border-slate-800">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 flex items-center justify-center font-bold shrink-0">
              <ClipboardList className="size-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                Super User To-Do List
                {summary.counts.total > 0 ? (
                  <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800 text-xs font-semibold px-2 py-0.5">
                    {summary.counts.total} Pending Item{summary.counts.total > 1 ? "s" : ""}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 text-xs font-semibold px-2 py-0.5">
                    All Clear
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Centralized action items requiring Super User or Administrator approval, review, or posting.
              </CardDescription>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 pt-3 overflow-x-auto text-xs font-medium scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
              activeTab === "ALL"
                ? "bg-slate-900 text-white font-semibold dark:bg-slate-100 dark:text-slate-900"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
            }`}
          >
            All Action Items ({summary.counts.total})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("PAYROLL")}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "PAYROLL"
                ? "bg-blue-600 text-white font-semibold"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
            }`}
          >
            <Wallet className="size-3.5" /> Payroll &amp; Final Pay ({payrollCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("LOANS")}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "LOANS"
                ? "bg-indigo-600 text-white font-semibold"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
            }`}
          >
            <Banknote className="size-3.5" /> Loans &amp; Advances ({summary.counts.loans})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("LEAVE")}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "LEAVE"
                ? "bg-emerald-600 text-white font-semibold"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
            }`}
          >
            <CalendarDays className="size-3.5" /> Leave Requests ({summary.counts.leave})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("CONTRACTORS")}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "CONTRACTORS"
                ? "bg-amber-600 text-white font-semibold"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
            }`}
          >
            <Briefcase className="size-3.5" /> Contractor Vouchers ({summary.counts.contractors})
          </button>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {filteredItems.length === 0 ? (
          <div className="py-8 px-4 text-center border border-dashed rounded-lg bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
            <CheckCircle2 className="size-8 text-emerald-500 mx-auto" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              No Pending Action Items
            </h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              All payroll runs, loans, leave requests, and contractor vouchers are up to date for this category.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-background hover:bg-slate-50/80 dark:hover:bg-slate-900/60 transition-colors gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="size-8 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                    {getCategoryIcon(item.category)}
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {item.title}
                      </span>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${getBadgeStyle(item.badgeVariant)}`}>
                        {item.badgeLabel}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800">
                  {item.amount !== undefined && (
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        PHP {item.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{item.date}</div>
                    </div>
                  )}
                  <Button variant="outline" size="sm" className="h-8 text-xs font-semibold gap-1.5 hover:bg-primary hover:text-primary-foreground" render={<Link href={item.actionUrl} />}>
                    {item.actionLabel}
                    <ArrowRight className="size-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
