import { z } from "zod";

export const hrComplianceSchema = z.object({
  domain: z.string().min(1, "Select a compliance domain"),
  jurisdictions: z.array(z.string()).min(1, "Select at least one jurisdiction"),
  industry: z.string().optional(),
  workforceSize: z.string().optional(),
  hrToolsUsed: z.array(z.string()).optional(),
  concerns: z.array(z.string()).optional(),
  additionalContext: z.string().optional(),
});

export type HRComplianceInput = z.infer<typeof hrComplianceSchema>;
