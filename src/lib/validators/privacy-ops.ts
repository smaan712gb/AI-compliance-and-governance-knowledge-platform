import { z } from "zod";

// ---------- DSAR Response Generator ----------

export const dsarSchema = z.object({
  dsarType: z.enum(["ACCESS", "RECTIFICATION", "ERASURE", "RESTRICTION", "PORTABILITY", "OBJECTION"]),
  dataSubjectType: z.string().optional(),
  jurisdiction: z.string().optional(),
  requestDetails: z.string().min(10, "Provide at least 10 characters describing the request"),
  companyContext: z.string().optional(),
});

export type DSARInput = z.infer<typeof dsarSchema>;

// ---------- ROPA Generator ----------

export const ropaSchema = z.object({
  activityName: z.string().min(1, "Activity name is required"),
  purpose: z.string().min(10, "Describe the processing purpose"),
  legalBasis: z.enum(["CONSENT", "CONTRACT", "LEGAL_OBLIGATION", "VITAL_INTERESTS", "PUBLIC_TASK", "LEGITIMATE_INTERESTS"]),
  dataCategories: z.array(z.string()).min(1, "Select at least one data category"),
  dataSubjectTypes: z.array(z.string()).min(1, "Select at least one data subject type"),
  recipients: z.array(z.string()).optional(),
  transferMechanisms: z.array(z.string()).optional(),
  retentionPeriod: z.string().optional(),
  industry: z.string().optional(),
});

export type ROPAInput = z.infer<typeof ropaSchema>;

// ---------- DPA Review ----------

export const dpaReviewSchema = z.object({
  dpaText: z.string().min(50, "Paste at least 50 characters of DPA text"),
  jurisdiction: z.string().optional(),
  concerns: z.string().optional(),
});

export type DPAReviewInput = z.infer<typeof dpaReviewSchema>;
