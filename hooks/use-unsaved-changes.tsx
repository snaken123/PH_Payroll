"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2Icon, AlertTriangleIcon } from "lucide-react";

interface UseUnsavedChangesOptions {
  isDirty: boolean;
  onSave?: () => Promise<boolean | void> | boolean | void;
}

export function useUnsavedChanges({ isDirty, onSave }: UseUnsavedChangesOptions) {
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 1. Intercept browser window tab close / refresh
  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // 2. Intercept link clicks (Sidebar, Header, Breadcrumbs, Table Links, etc.)
  useEffect(() => {
    if (!isDirty) return;

    const handleClick = (e: MouseEvent) => {
      // Don't intercept if modifier key pressed
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) {
        return;
      }

      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a") as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("javascript:") || anchor.target === "_blank") {
        return;
      }

      try {
        const currentUrl = new URL(window.location.href);
        const targetUrl = new URL(anchor.href, window.location.origin);

        if (currentUrl.pathname === targetUrl.pathname && currentUrl.search === targetUrl.search) {
          return; // Same page location
        }

        e.preventDefault();
        e.stopPropagation();

        setPendingUrl(targetUrl.pathname + targetUrl.search + targetUrl.hash);
        setShowDialog(true);
      } catch {
        // Ignore invalid URLs
      }
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [isDirty]);

  // 3. Intercept browser Back / Forward buttons (popstate)
  useEffect(() => {
    if (!isDirty) return;

    window.history.pushState({ unsavedGuard: true }, "", window.location.href);

    const handlePopState = () => {
      window.history.pushState({ unsavedGuard: true }, "", window.location.href);
      setPendingUrl("__BACK__");
      setShowDialog(true);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isDirty]);

  const handleProceed = useCallback((destinationUrl?: string | null) => {
    const dest = destinationUrl !== undefined ? destinationUrl : pendingUrl;
    setShowDialog(false);
    setPendingUrl(null);

    if (dest === "__BACK__") {
      window.history.go(-2);
    } else if (dest) {
      router.push(dest);
    }
  }, [pendingUrl, router]);

  const handleSaveAndContinue = async () => {
    if (!onSave) {
      handleProceed();
      return;
    }

    setIsSaving(true);
    try {
      const result = await onSave();
      setIsSaving(false);
      if (result !== false) {
        handleProceed();
      }
    } catch {
      setIsSaving(false);
    }
  };

  const handleIgnore = () => {
    handleProceed();
  };

  const handleCancel = () => {
    setShowDialog(false);
    setPendingUrl(null);
  };

  const DialogComponent = (
    <Dialog open={showDialog} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="max-w-md p-6" showCloseButton={false}>
        <DialogHeader className="space-y-2">
          <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-500 font-bold text-lg">
            <AlertTriangleIcon className="size-5 shrink-0 text-amber-500" />
            Unsaved Changes
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-600 dark:text-slate-400">
            You have modified fields on this page. If you leave now without saving, your changes will be discarded.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-4 flex flex-col sm:flex-row-reverse gap-2">
          {onSave && (
            <Button
              type="button"
              onClick={handleSaveAndContinue}
              disabled={isSaving}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            >
              {isSaving ? (
                <>
                  <Loader2Icon className="mr-2 size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save & Continue"
              )}
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={handleIgnore}
            disabled={isSaving}
            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 dark:border-rose-900/50 dark:hover:bg-rose-950/30 font-medium"
          >
            Ignore & Discard
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={handleCancel}
            disabled={isSaving}
            className="text-slate-600 dark:text-slate-400 font-medium"
          >
            Stay on page
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return {
    UnsavedChangesDialog: DialogComponent,
    confirmDiscard: (onConfirmed: () => void) => {
      if (isDirty) {
        setPendingUrl(null);
        setShowDialog(true);
      } else {
        onConfirmed();
      }
    },
  };
}
