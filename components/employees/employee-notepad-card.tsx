"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { NotebookIcon, SaveIcon, CheckIcon } from "lucide-react";
import { toast } from "sonner";

interface EmployeeNotepadCardProps {
  employeeId: string;
  initialNotes?: string | null;
}

export function EmployeeNotepadCard({ employeeId, initialNotes = "" }: EmployeeNotepadCardProps) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      setSaving(false);

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error(body?.error ?? "Failed to save notes");
        return;
      }

      setSaved(true);
      toast.success("Employee notepad updated successfully");
      router.refresh();
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setSaving(false);
      toast.error("Failed to save notes");
    }
  }

  return (
    <Card className="border-slate-200/80 shadow-xs dark:border-slate-800 col-span-full mt-4">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-3">
        <div>
          <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <NotebookIcon className="size-4 text-amber-600" /> HR Reference Notepad &amp; Freeform Notes
          </CardTitle>
          <CardDescription className="text-xs">
            Type and save freeform notes, reminders, HR logs, or internal reference comments for this employee.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5 text-xs font-semibold"
          >
            {saved ? (
              <>
                <CheckIcon className="size-3.5" /> Saved
              </>
            ) : (
              <>
                <SaveIcon className="size-3.5" /> {saving ? "Saving..." : "Save Notepad"}
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        <Textarea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setSaved(false);
          }}
          placeholder="Type any freeform notes here (e.g. performance comments, interview observations, special arrangements, contract reminders)..."
          rows={5}
          className="font-sans text-xs min-h-[120px] resize-y bg-amber-50/30 border-amber-200/70 focus-visible:ring-amber-500 dark:bg-slate-900 dark:border-slate-800 dark:focus-visible:ring-amber-400"
        />
        <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
          <span>{notes.length} characters</span>
          {saved && <span className="text-emerald-600 dark:text-emerald-400 font-medium">Changes saved to employee 201 profile</span>}
        </div>
      </CardContent>
    </Card>
  );
}
