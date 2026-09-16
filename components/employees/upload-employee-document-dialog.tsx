"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  UploadIcon,
  FileTextIcon,
  AlertCircleIcon,
  CheckCircle2Icon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { EmployeeDocumentCategory } from "@/lib/generated/prisma/enums";

interface UploadEmployeeDocumentDialogProps {
  employeeId: string;
  employeeName: string;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

const CATEGORY_OPTIONS: { value: EmployeeDocumentCategory; label: string; description: string }[] = [
  {
    value: EmployeeDocumentCategory.ATTENDANCE_MEMO,
    label: "Attendance Memo / NTE",
    description: "Tardiness notices, absenteeism memos, Notice to Explain (NTE), IRs",
  },
  {
    value: EmployeeDocumentCategory.WAIVER,
    label: "Waiver / Quitclaim / NDA",
    description: "Liability waivers, quitclaims, confidentiality & non-disclosure agreements",
  },
  {
    value: EmployeeDocumentCategory.COACHING_PERFORMANCE,
    label: "Coaching & Performance",
    description: "1-on-1 coaching logs, performance evaluation forms, PIP plans, KPIs",
  },
  {
    value: EmployeeDocumentCategory.LEGAL_CONTRACT,
    label: "Contract & Legal Document",
    description: "Employment contracts, job offer letters, non-compete agreements",
  },
  {
    value: EmployeeDocumentCategory.MEDICAL_CLEARANCE,
    label: "Medical Clearance / Health",
    description: "Fit-to-work certificates, medical exam results, drug test reports",
  },
  {
    value: EmployeeDocumentCategory.GOVERNMENT_IDENT,
    label: "Government ID Copy",
    description: "TIN card, SSS ID, PhilHealth card, Pag-IBIG ID, Passport, Driver's License",
  },
  {
    value: EmployeeDocumentCategory.OTHER,
    label: "Other 201 Attachment",
    description: "General employee records, certificates, awards, or supporting docs",
  },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function UploadEmployeeDocumentDialog({
  employeeId,
  employeeName,
  onSuccess,
  trigger,
}: UploadEmployeeDocumentDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<EmployeeDocumentCategory>(EmployeeDocumentCategory.ATTENDANCE_MEMO);
  const [description, setDescription] = useState("");
  const [documentDate, setDocumentDate] = useState("");
  
  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  function resetForm() {
    setTitle("");
    setCategory(EmployeeDocumentCategory.ATTENDANCE_MEMO);
    setDescription("");
    setDocumentDate("");
    setSelectedFile(null);
    setFileDataUrl(null);
    setDragOver(false);
  }

  function handleFileSelected(file: File) {
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File size exceeds 10MB limit. Please select a smaller document.");
      return;
    }

    setSelectedFile(file);
    if (!title) {
      // Auto-populate title from filename excluding extension
      const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
      setTitle(nameWithoutExt.replaceAll("_", " ").replaceAll("-", " "));
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setFileDataUrl(reader.result);
      }
    };
    reader.onerror = () => {
      toast.error("Failed to read selected file.");
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please provide a document title.");
      return;
    }
    if (!selectedFile || !fileDataUrl) {
      toast.error("Please attach a document file.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/employees/${employeeId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          category,
          description: description.trim() || undefined,
          fileUrl: fileDataUrl,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          mimeType: selectedFile.type || "application/pdf",
          documentDate: documentDate || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || err.error || "Failed to upload document");
      }

      toast.success("Document uploaded successfully to 201 File.");
      setOpen(false);
      resetForm();
      router.refresh();
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        setOpen(val);
        if (!val) resetForm();
      }}
    >
      <DialogTrigger
        render={
          trigger ? (
            (trigger as any)
          ) : (
            <Button size="sm" className="gap-1.5 text-xs font-semibold shadow-xs">
              <UploadIcon className="size-3.5" /> Upload 201 Document
            </Button>
          )
        }
      />

      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <FileTextIcon className="size-4 text-blue-600" /> Upload 201 File Document
          </DialogTitle>
          <DialogDescription className="text-xs">
            Add a new document record for <strong className="text-slate-900 dark:text-slate-100">{employeeName}</strong>. Attach attendance memos, waivers, coaching logs, legal contracts, medical clearances, or IDs.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs py-2">
          {/* Document Title */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Document Title <span className="text-rose-500">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Notice to Explain - Feb 2026 Attendance"
              className="text-xs"
              required
            />
          </div>

          {/* Category Dropdown */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Document Category <span className="text-rose-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as EmployeeDocumentCategory)}
              className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs text-slate-900 shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} — {opt.description}
                </option>
              ))}
            </select>
          </div>

          {/* Document Reference Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Document / Issue Date
              </label>
              <Input
                type="date"
                value={documentDate}
                onChange={(e) => setDocumentDate(e.target.value)}
                className="text-xs"
              />
              <span className="text-[10px] text-slate-500 block">Date of memo, waiver, or contract signing</span>
            </div>
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Max Allowed File Size
              </label>
              <div className="h-9 rounded-md bg-slate-50 border border-slate-200 px-3 py-2 text-[11px] font-mono text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 flex items-center">
                10 MB (PDF, Image, Word/Docx)
              </div>
            </div>
          </div>

          {/* Description Notes */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Description / HR Notes <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add supplementary notes, case reference numbers, or resolution details..."
              className="text-xs min-h-[60px]"
            />
          </div>

          {/* File Dropzone */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Attach File <span className="text-rose-500">*</span>
            </label>

            {selectedFile ? (
              <div className="flex items-center justify-between p-3 rounded-lg border border-blue-200 bg-blue-50/60 dark:border-blue-900/60 dark:bg-blue-950/40">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 shrink-0">
                    <FileTextIcon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-slate-100 truncate text-xs">
                      {selectedFile.name}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || "Document"}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    setSelectedFile(null);
                    setFileDataUrl(null);
                  }}
                  className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 shrink-0"
                >
                  <XIcon className="size-4" />
                </Button>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFileSelected(file);
                }}
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragOver
                    ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/50"
                    : "border-slate-200 hover:border-slate-300 dark:border-slate-800"
                }`}
              >
                <UploadIcon className="size-8 text-slate-400 mx-auto mb-2" />
                <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                  Drag and drop file here, or click to browse
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Supports PDF documents, JPG/PNG scans, or Word files (up to 10MB)
                </p>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelected(file);
                  }}
                  className="hidden"
                  id="201-file-input"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 text-xs"
                  onClick={() => document.getElementById("201-file-input")?.click()}
                >
                  Select File from Computer
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving || !selectedFile} className="gap-1.5 font-semibold">
              {saving ? "Uploading..." : "Save Document to 201 File"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
