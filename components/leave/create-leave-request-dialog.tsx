"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface LeaveTypeOption {
  id: string;
  name: string;
}

interface FormValues {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason: string;
}

export function CreateLeaveRequestDialog({
  employeeId,
  leaveTypes,
  onCreated,
}: {
  employeeId: string;
  leaveTypes: LeaveTypeOption[];
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, control, reset } = useForm<FormValues>({
    defaultValues: { leaveTypeId: leaveTypes[0]?.id },
  });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const res = await fetch("/api/leave/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId, ...values }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error?.formErrors?.join?.(", ") ?? body?.error ?? "Failed to file leave request");
      return;
    }

    toast.success("Leave request filed");
    reset();
    setOpen(false);
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>New leave request</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>File leave request</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1">
            <Label>Leave type</Label>
            <Controller
              control={control}
              name="leaveTypeId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {leaveTypes.map((lt) => (
                      <SelectItem key={lt.id} value={lt.id}>
                        {lt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="startDate">Start date</Label>
            <Input id="startDate" type="date" required {...register("startDate")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="endDate">End date</Label>
            <Input id="endDate" type="date" required {...register("endDate")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Input id="reason" {...register("reason")} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Filing..." : "File request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
