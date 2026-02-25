import { z } from "zod";

export const createRuleSchema = z.object({
  name: z.string().min(1, "Rule name is required").max(200),
  description: z.string().min(1, "Description is required"),
  framework: z.enum(["SOX", "PCI_DSS", "HIPAA", "AML_BSA", "GDPR", "ISO_27001", "NIST_CSF", "CUSTOM"]),
  controlId: z.string().optional(),
  domain: z.enum(["SOX_CONTROLS", "AML_KYC", "ACCESS_CONTROL", "AUDIT_TRAIL", "ALL"]),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]).default("MEDIUM"),
  ruleDefinition: z.object({
    type: z.enum(["threshold", "pattern", "missing_control", "sod", "access"]),
    conditions: z.record(z.string(), z.unknown()),
  }),
  isActive: z.boolean().default(true),
});

export const updateRuleSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]).optional(),
  ruleDefinition: z
    .object({
      type: z.enum(["threshold", "pattern", "missing_control", "sod", "access"]),
      conditions: z.record(z.string(), z.unknown()),
    })
    .optional(),
  isActive: z.boolean().optional(),
});
