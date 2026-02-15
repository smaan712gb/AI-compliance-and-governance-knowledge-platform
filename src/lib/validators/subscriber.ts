import { z } from "zod";

export const subscribeSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  name: z.string().optional(),
  source: z.string().optional().default("website"),
  tags: z.array(z.string()).optional().default([]),
});

export type SubscribeInput = z.infer<typeof subscribeSchema>;
