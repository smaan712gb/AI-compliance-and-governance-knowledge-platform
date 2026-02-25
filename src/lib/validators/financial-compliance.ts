import { z } from "zod";

export const financialComplianceSchema = z.object({
  domain: z.string().min(1, "Select a compliance domain"),
  jurisdictions: z.array(z.string()).min(1, "Select at least one jurisdiction"),
  entityType: z.string().optional(),
  transactionVolume: z.string().optional(),
  financialSystemsUsed: z.array(z.string()).optional(),
  concerns: z.array(z.string()).optional(),
  additionalContext: z.string().optional(),
});

export type FinancialComplianceInput = z.infer<typeof financialComplianceSchema>;
