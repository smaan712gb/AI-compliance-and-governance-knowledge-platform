import { z } from "zod";

export const boardReportSchema = z.object({
  reportType: z.enum(["QUARTERLY_CISO", "ANNUAL_RISK", "AUDIT_COMMITTEE", "INCIDENT_BRIEF", "REGULATORY_UPDATE"]),
  periodStart: z.string().min(1, "Period start date is required"),
  periodEnd: z.string().min(1, "Period end date is required"),
  focusAreas: z.array(z.string()).min(1, "Select at least one focus area"),
  audience: z.string().optional(),
  additionalContext: z.string().optional(),
});

export type BoardReportInput = z.infer<typeof boardReportSchema>;
