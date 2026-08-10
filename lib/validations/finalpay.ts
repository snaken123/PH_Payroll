import { z } from "zod";
import { FinalPayLineItemCategory, LineItemDirection } from "@/lib/generated/prisma/enums";

export const addManualFinalPayLineItemSchema = z.object({
  category: z.nativeEnum(FinalPayLineItemCategory),
  direction: z.nativeEnum(LineItemDirection),
  description: z.string().min(1, "Description is required"),
  amount: z.number().positive("Amount must be greater than 0"),
  isTaxExempt: z.boolean(),
});

export type AddManualFinalPayLineItemInput = z.infer<typeof addManualFinalPayLineItemSchema>;
