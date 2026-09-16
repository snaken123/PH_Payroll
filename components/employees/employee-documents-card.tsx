"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileTextIcon,
  DownloadIcon,
  Trash2Icon,
  SearchIcon,
  ExternalLinkIcon,
  ShieldCheckIcon,
  AlertCircleIcon,
  FileCheckIcon,
  UserCheckIcon,
  ScaleIcon,
  StethoscopeIcon,
  FolderOpenIcon,
  CalendarIcon,
  UserIcon,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UploadEmployeeDocumentDialog } from "@/components/employees/upload-employee-document-dialog";
import { toast } from "sonner";
import { EmployeeDocumentCategory } from "@/lib/generated/prisma/enums";

export interface SerializedEmployeeDocument {
  id: string;
  employeeId: string;
  title: string;
  category: EmployeeDocumentCategory;
  description: string | null;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedByName: string | null;
  documentDate: string | Date | null;
  createdAt: string | Date;
}

interface EmployeeDocumentsCardProps {
  employeeId: string;
  employeeName: string;
  initialDocuments: SerializedEmployeeDocument[];
}

const CATEGORY_TABS: { key: string; label: string; icon: React.ElementType }[] = [
  { key: "ALL", label: "All Documents", icon: FolderOpenIcon },
  { key: EmployeeDocumentCategory.ATTENDANCE_MEMO, label: "Attendance Memos", icon: AlertCircleIcon },
  { key: EmployeeDocumentCategory.WAIVER, label: "Waivers & Quitclaims", icon: ShieldCheckIcon },
  { key: EmployeeDocumentCategory.COACHING_PERFORMANCE, label: "Coaching & Performance", icon: UserCheckIcon },
  { key: EmployeeDocumentCategory.LEGAL_CONTRACT, label: "Contracts & Legal", icon: ScaleIcon },
  { key: EmployeeDocumentCategory.MEDICAL_CLEARANCE, label: "Medical Clearances", icon: StethoscopeIcon },
  { key: EmployeeDocumentCategory.GOVERNMENT_IDENT, label: "Government IDs", icon: FileCheckIcon },
  { key: EmployeeDocumentCategory.OTHER, label: "Other Attachments", icon: FileTextIcon },
];

export function EmployeeDocumentsCard({
  employeeId,
  employeeName,
  initialDocuments,
}: EmployeeDocumentsCardProps) {
  const router = useRouter();
  const [documents, setDocuments] = useState<SerializedEmployeeDocument[]>(initialDocuments);
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter documents by tab and search term
  const filteredDocuments = documents.filter((doc) => {
    const matchesCategory = activeCategory === "ALL" || doc.category === activeCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.description && doc.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Calculate counts per category
  const categoryCounts = documents.reduce<Record<string, number>>((acc, doc) => {
    acc[doc.category] = (acc[doc.category] || 0) + 1;
    return acc;
  }, {});

  async function handleDeleteDocument(docId: string, title: string) {
    if (!confirm(`Are you sure you want to delete "${title}" from this 201 File?`)) return;

    setDeletingId(docId);
    try {
      const res = await fetch(`/api/employees/${employeeId}/documents/${docId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete document");
      }

      toast.success(`Document "${title}" removed.`);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function getCategoryBadge(category: EmployeeDocumentCategory) {
    switch (category) {
      case EmployeeDocumentCategory.ATTENDANCE_MEMO:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40">
            Attendance Memo
          </span>
        );
      case EmployeeDocumentCategory.WAIVER:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-900/40">
            Waiver / Quitclaim
          </span>
        );
      case EmployeeDocumentCategory.COACHING_PERFORMANCE:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40">
            Coaching / Performance
          </span>
        );
      case EmployeeDocumentCategory.LEGAL_CONTRACT:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            Contract / Legal
          </span>
        );
      case EmployeeDocumentCategory.MEDICAL_CLEARANCE:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40">
            Medical Clearance
          </span>
        );
      case EmployeeDocumentCategory.GOVERNMENT_IDENT:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/40">
            Government ID
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
            Other
          </span>
        );
    }
  }

  return (
    <Card className="border-slate-200/80 shadow-xs dark:border-slate-800 col-span-full">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-3">
        <div>
          <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileTextIcon className="size-4 text-blue-600" /> 201 Digital Document Vault &amp; Employee Records
          </CardTitle>
          <CardDescription className="text-xs">
            Comprehensive repository for attendance memos, quitclaims, waivers, coaching logs, legal contracts, medical clearances, and IDs.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <UploadEmployeeDocumentDialog
            employeeId={employeeId}
            employeeName={employeeName}
            onSuccess={() => {
              // Refresh documents via page reload or router.refresh
              router.refresh();
            }}
          />
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4 text-xs">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-100 dark:border-slate-800/80">
          {CATEGORY_TABS.map((tab) => {
            const Icon = tab.icon;
            const count = tab.key === "ALL" ? documents.length : categoryCounts[tab.key] || 0;
            const isActive = activeCategory === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveCategory(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Icon className="size-3.5" />
                <span>{tab.label}</span>
                <span
                  className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? "bg-blue-700 text-white" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filter Bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <SearchIcon className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents by title or file name..."
              className="pl-8 h-8 text-xs"
            />
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Showing {filteredDocuments.length} of {documents.length} document{documents.length === 1 ? "" : "s"}
          </span>
        </div>

        {/* Documents Roster List / Table */}
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg space-y-2">
            <FileTextIcon className="size-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">No 201 documents found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || activeCategory !== "ALL"
                ? "No document matches your search criteria or category filter."
                : "No documents have been uploaded to this employee's 201 File yet. Click 'Upload 201 Document' above to attach attendance memos, waivers, or coaching records."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80 border border-slate-200/80 dark:border-slate-800 rounded-lg overflow-hidden">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-900/50 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0 mt-0.5">
                    <FileTextIcon className="size-5 text-blue-600" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                        {doc.title}
                      </span>
                      {getCategoryBadge(doc.category)}
                    </div>
                    {doc.description && (
                      <p className="text-slate-600 dark:text-slate-400 text-xs line-clamp-2">
                        {doc.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap font-mono">
                      <span className="truncate">File: {doc.fileName}</span>
                      <span>•</span>
                      <span>{formatFileSize(doc.fileSize)}</span>
                      {doc.documentDate && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-sans">
                            <CalendarIcon className="size-3 text-slate-400" /> Doc Date: {new Date(doc.documentDate).toLocaleDateString()}
                          </span>
                        </>
                      )}
                      <span>•</span>
                      <span className="flex items-center gap-1 font-sans">
                        <UserIcon className="size-3 text-slate-400" /> By {doc.uploadedByName || "HR"} on {new Date(doc.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={doc.fileName}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    <ExternalLinkIcon className="size-3.5 text-blue-600" /> View / Download
                  </a>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDeleteDocument(doc.id, doc.title)}
                    disabled={deletingId === doc.id}
                    className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    title="Delete document from 201 File"
                  >
                    <Trash2Icon className="size-3.5" />
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
