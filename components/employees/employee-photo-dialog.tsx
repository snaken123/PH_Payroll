"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CameraIcon,
  UploadIcon,
  Trash2Icon,
  RefreshCwIcon,
  CheckIcon,
  UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

interface EmployeePhotoDialogProps {
  employeeId: string;
  employeeName: string;
  currentPhotoUrl?: string | null;
  trigger?: React.ReactNode;
}

export function EmployeePhotoDialog({
  employeeId,
  employeeName,
  currentPhotoUrl,
  trigger,
}: EmployeePhotoDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"upload" | "camera">("upload");
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Camera state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setPreviewUrl(currentPhotoUrl || null);
      setActiveTab("upload");
      setCameraError(null);
    } else {
      stopCamera();
    }
  }, [open, currentPhotoUrl]);

  // Handle camera start/stop on tab change
  useEffect(() => {
    if (open && activeTab === "camera" && !previewUrl) {
      startCamera();
    } else {
      stopCamera();
    }
  }, [open, activeTab, previewUrl]);

  async function startCamera() {
    stopCamera();
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("Camera access is not supported by your browser or device.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);
    } catch (err) {
      console.error("Camera access error:", err);
      setCameraError(
        "Unable to access camera. Please check browser permissions or switch to File Upload."
      );
      setCameraActive(false);
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }

  // Compress image file or canvas to a optimized data URL (max 400x400)
  function processAndCompressImage(imageElement: HTMLImageElement | HTMLVideoElement): string {
    const canvas = document.createElement("canvas");
    const maxSize = 400;

    let width = imageElement instanceof HTMLVideoElement ? imageElement.videoWidth : imageElement.width;
    let height = imageElement instanceof HTMLVideoElement ? imageElement.videoHeight : imageElement.height;

    if (!width || !height) {
      width = 400;
      height = 400;
    }

    if (width > height) {
      if (width > maxSize) {
        height = Math.round((height * maxSize) / width);
        width = maxSize;
      }
    } else {
      if (height > maxSize) {
        width = Math.round((width * maxSize) / height);
        height = maxSize;
      }
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      // Mirror camera view if capturing from webcam
      if (imageElement instanceof HTMLVideoElement) {
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(imageElement, 0, 0, width, height);
    }

    return canvas.toDataURL("image/jpeg", 0.85);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (JPG, PNG, WEBP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const compressed = processAndCompressImage(img);
        setPreviewUrl(compressed);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  function handleCapturePhoto() {
    if (!videoRef.current || !cameraActive) return;

    const compressed = processAndCompressImage(videoRef.current);
    stopCamera();
    setPreviewUrl(compressed);
  }

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/employees/${employeeId}/photo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoUrl: previewUrl }),
    });
    setSaving(false);

    if (!res.ok) {
      toast.error("Failed to save employee photo");
      return;
    }

    toast.success("Employee photo updated");
    stopCamera();
    setOpen(false);
    router.refresh();
  }

  async function handleDeletePhoto() {
    setSaving(true);
    const res = await fetch(`/api/employees/${employeeId}/photo`, {
      method: "DELETE",
    });
    setSaving(false);

    if (!res.ok) {
      toast.error("Failed to remove photo");
      return;
    }

    toast.success("Photo removed");
    setPreviewUrl(null);
    stopCamera();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) stopCamera();
      }}
    >
      <DialogTrigger render={trigger ? (trigger as any) : <Button variant="outline" size="sm">Photo</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Employee Photo</DialogTitle>
          <DialogDescription>
            Upload a profile picture for {employeeName} or snap a photo using your camera.
          </DialogDescription>
        </DialogHeader>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            className={`flex-1 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === "upload"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
            onClick={() => {
              setActiveTab("upload");
            }}
          >
            <UploadIcon className="size-3.5" /> Upload File
          </button>
          <button
            type="button"
            className={`flex-1 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === "camera"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
            onClick={() => {
              setActiveTab("camera");
            }}
          >
            <CameraIcon className="size-3.5" /> Take Photo (Camera)
          </button>
        </div>

        {/* Tab Contents */}
        <div className="py-3 flex flex-col items-center justify-center">
          {activeTab === "upload" && (
            <div className="w-full flex flex-col items-center gap-3">
              {previewUrl ? (
                <div className="relative size-44 rounded-full overflow-hidden border-4 border-slate-100 dark:border-slate-800 shadow-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt={employeeName}
                    className="size-full object-cover"
                  />
                </div>
              ) : (
                <div className="size-44 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 border-4 border-slate-200 dark:border-slate-700">
                  <UserIcon className="size-20" />
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-1.5 text-xs font-semibold"
                >
                  <UploadIcon className="size-3.5" /> Choose Image File
                </Button>
                {previewUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPreviewUrl(null)}
                    className="text-xs text-muted-foreground"
                  >
                    Clear Preview
                  </Button>
                )}
              </div>
            </div>
          )}

          {activeTab === "camera" && (
            <div className="w-full flex flex-col items-center gap-3">
              {previewUrl ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="relative size-44 rounded-full overflow-hidden border-4 border-slate-100 dark:border-slate-800 shadow-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Captured photo"
                      className="size-full object-cover"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPreviewUrl(null);
                      startCamera();
                    }}
                    className="gap-1.5 text-xs font-semibold"
                  >
                    <RefreshCwIcon className="size-3.5" /> Retake Photo
                  </Button>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center gap-3">
                  <div className="relative w-full h-56 rounded-xl overflow-hidden bg-black flex items-center justify-center border border-slate-200 dark:border-slate-800">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className="size-full object-cover -scale-x-100"
                    />
                    {cameraError && (
                      <div className="absolute inset-0 p-4 bg-slate-900/90 text-slate-200 text-xs flex items-center justify-center text-center">
                        {cameraError}
                      </div>
                    )}
                  </div>

                  {cameraActive && (
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={handleCapturePhoto}
                      className="gap-1.5 font-bold"
                    >
                      <CameraIcon className="size-4" /> Snap Photo
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          {currentPhotoUrl ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDeletePhoto}
              disabled={saving}
              className="gap-1 text-xs"
            >
              <Trash2Icon className="size-3.5" /> Delete Photo
            </Button>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="gap-1.5 font-semibold"
            >
              <CheckIcon className="size-3.5" /> {saving ? "Saving..." : "Save Photo"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
