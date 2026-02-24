import { z } from "zod";

export const incidentAssessmentSchema = z.object({
  incidentType: z.enum([
    "DATA_BREACH", "RANSOMWARE", "INSIDER_THREAT", "SUPPLY_CHAIN_COMPROMISE",
    "DDOS", "PHISHING", "SYSTEM_COMPROMISE", "UNAUTHORIZED_ACCESS",
    "DATA_LOSS", "BUSINESS_EMAIL_COMPROMISE",
  ]),
  description: z.string().min(20, "Provide at least 20 characters describing the incident"),
  recordsAffected: z.number().optional(),
  dataTypesInvolved: z.array(z.string()).optional(),
  discoveryDate: z.string().optional(),
  containmentDate: z.string().optional(),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  isPublicCompany: z.boolean().optional(),
  operatingCountries: z.array(z.string()).optional(),
});

export type IncidentAssessmentInput = z.infer<typeof incidentAssessmentSchema>;
