import { z } from "zod";

export const aiSystemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(10, "Provide at least 10 characters"),
  purpose: z.string().optional(),
  modelType: z.string().optional(),
  modelProvider: z.string().optional(),
  dataClassification: z.string().optional(),
  riskLevel: z.enum(["UNACCEPTABLE", "HIGH", "LIMITED", "MINIMAL", "GPAI", "GPAI_SYSTEMIC"]).optional(),
  department: z.string().optional(),
  owner: z.string().optional(),
  status: z.string().optional(),
  deploymentDate: z.string().optional(),
  dataSources: z.array(z.string()).optional(),
  outputTypes: z.array(z.string()).optional(),
  affectedPersons: z.array(z.string()).optional(),
  humanOversight: z.string().optional(),
});

export type AISystemInput = z.infer<typeof aiSystemSchema>;
