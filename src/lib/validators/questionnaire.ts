import { z } from "zod";

export const questionnaireSchema = z.object({
  vendorName: z.string().min(1, "Vendor name is required"),
  modelType: z.string().min(1, "Model type is required"),
  dataHandling: z.string().min(1, "Data handling description is required"),
  deployment: z.string().min(1, "Deployment model is required"),
  specificConcerns: z.string().optional(),
});

export type QuestionnaireInput = z.infer<typeof questionnaireSchema>;
