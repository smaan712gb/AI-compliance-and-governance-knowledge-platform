import { z } from "zod";

export const policyMapperSchema = z.object({
  frameworks: z
    .array(z.enum([
      "NIST_CSF_2", "ISO_27001_2022", "SOC_2", "PCI_DSS_4",
      "DORA", "NIS2", "HIPAA", "EU_AI_ACT", "GDPR",
    ]))
    .min(1, "Select at least one framework"),
  policyDomain: z.enum([
    "ACCESS_CONTROL", "DATA_PROTECTION", "INCIDENT_RESPONSE",
    "RISK_MANAGEMENT", "GOVERNANCE", "ASSET_MANAGEMENT",
    "SUPPLY_CHAIN", "SECURITY_OPERATIONS",
  ]).optional(),
  policyText: z.string().optional(),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  concerns: z.string().optional(),
});

export type PolicyMapperInput = z.infer<typeof policyMapperSchema>;
