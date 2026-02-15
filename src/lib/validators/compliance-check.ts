import { z } from "zod";

export const complianceCheckSchema = z.object({
  role: z.enum(["provider", "deployer", "importer", "distributor"]),
  systemType: z.string().min(1, "System type is required"),
  geography: z.array(z.string()).min(1, "Select at least one geography"),
  useCase: z.string().min(1, "Use case description is required"),
  useCaseCategory: z.string().optional(),
  additionalContext: z.string().optional(),
  isGPAIWithSystemicRisk: z.boolean().optional(),
  companySize: z.enum(["startup", "sme", "mid_market", "enterprise"]).optional(),
});

export type ComplianceCheckInput = z.infer<typeof complianceCheckSchema>;
