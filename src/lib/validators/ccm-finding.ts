import { z } from "zod";

export const updateFindingSchema = z.object({
  status: z
    .enum(["OPEN", "IN_PROGRESS", "REMEDIATED", "ACCEPTED_RISK", "FALSE_POSITIVE", "CLOSED"])
    .optional(),
  assignedTo: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  resolutionNotes: z.string().optional(),
});

export const generateRemediationSchema = z.object({
  findingId: z.string().min(1),
  additionalContext: z.string().optional(),
});

export const queryFindingsSchema = z.object({
  status: z
    .enum(["OPEN", "IN_PROGRESS", "REMEDIATED", "ACCEPTED_RISK", "FALSE_POSITIVE", "CLOSED"])
    .optional(),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]).optional(),
  framework: z
    .enum(["SOX", "PCI_DSS", "HIPAA", "AML_BSA", "GDPR", "ISO_27001", "NIST_CSF", "CUSTOM"])
    .optional(),
  assignedTo: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});
