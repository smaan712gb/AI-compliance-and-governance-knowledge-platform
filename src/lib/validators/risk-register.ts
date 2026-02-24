import { z } from "zod";

export const riskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(10, "Provide at least 10 characters"),
  category: z.enum([
    "CYBER_SECURITY", "DATA_PRIVACY", "REGULATORY", "OPERATIONAL",
    "FINANCIAL", "REPUTATIONAL", "STRATEGIC", "THIRD_PARTY", "AI_MODEL",
  ]),
  likelihood: z.number().min(1).max(5).optional(),
  impact: z.number().min(1).max(5).optional(),
  owner: z.string().optional(),
  status: z.string().optional(),
  mitigations: z.array(z.string()).optional(),
  controls: z.array(z.string()).optional(),
  targetDate: z.string().optional(),
});

export type RiskInput = z.infer<typeof riskSchema>;
