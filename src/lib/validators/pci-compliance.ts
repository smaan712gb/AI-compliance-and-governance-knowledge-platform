import { z } from "zod";

export const pciComplianceSchema = z.object({
  domain: z.string().min(1, "Select a compliance domain"),
  jurisdictions: z.array(z.string()).min(1, "Select at least one jurisdiction/program"),
  saqType: z.string().optional(),
  merchantLevel: z.string().optional(),
  systemsUsed: z.array(z.string()).optional(),
  concerns: z.array(z.string()).optional(),
  additionalContext: z.string().optional(),
});

export type PCIComplianceInput = z.infer<typeof pciComplianceSchema>;
