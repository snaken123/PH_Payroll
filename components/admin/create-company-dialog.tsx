"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createCompanySchema, type CreateCompanyInput } from "@/lib/validations/company";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const FIELDS: { name: keyof CreateCompanyInput; label: string; optional?: boolean }[] = [
  { name: "companyCode", label: "Company code (e.g. acme-corp)" },
  { name: "legalName", label: "Legal name" },
  { name: "tradeName", label: "Trade name", optional: true },
  { name: "tin", label: "TIN" },
  { name: "rdoCode", label: "RDO code" },
  { name: "sssEmployerNumber", label: "SSS employer number", optional: true },
  { name: "philhealthEmployerNumber", label: "PhilHealth employer number (PEN)", optional: true },
  { name: "pagibigEmployerId", label: "Pag-IBIG employer ID", optional: true },
  { name: "registeredAddress", label: "Registered address" },
  { name: "region", label: "Region (e.g. NCR)" },
  { name: "ownerName", label: "Company owner name" },
  { name: "ownerEmail", label: "Company owner email" },
  { name: "ownerPassword", label: "Temporary password" },
];

export function CreateCompanyDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateCompanyInput>({ resolver: zodResolver(createCompanySchema) });

  async function onSubmit(values: CreateCompanyInput) {
    setSubmitting(true);
    const res = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error?.formErrors?.join?.(", ") ?? body?.error ?? "Failed to create company");
      return;
    }

    toast.success("Company created");
    reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>New company</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Onboard a new company</DialogTitle>
          <DialogDescription>
            Creates the company, its head office branch, and an initial owner account.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          {FIELDS.map((field) => (
            <div key={field.name} className="space-y-1">
              <Label htmlFor={field.name}>
                {field.label}
                {field.optional && <span className="text-muted-foreground"> (optional)</span>}
              </Label>
              <Input
                id={field.name}
                type={field.name === "ownerPassword" ? "text" : "text"}
                {...register(field.name)}
              />
              {errors[field.name] && (
                <p className="text-sm text-destructive">{errors[field.name]?.message}</p>
              )}
            </div>
          ))}
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create company"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
