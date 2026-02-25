import { z } from "zod";

export const hipaaComplianceSchema = z.object({
  domain: z.string().min(1, "Select a compliance domain"),
  jurisdictions: z.array(z.string()).min(1, "Select at least one jurisdiction"),
  entityType: z.string().optional(),
  organizationSize: z.string().optional(),
  systemsUsed: z.array(z.string()).optional(),
  concerns: z.array(z.string()).optional(),
  additionalContext: z.string().optional(),
});

export type HIPAAComplianceInput = z.infer<typeof hipaaComplianceSchema>;
