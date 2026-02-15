import { z } from "zod";

// ============================================
// AGENT SOURCE SCHEMAS
// ============================================

export const agentSourceCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  url: z.string().url("Must be a valid URL"),
  type: z.enum([
    "RSS_FEED",
    "WEBSITE",
    "REGULATORY_BODY",
    "RESEARCH_PAPER",
    "INDUSTRY_REPORT",
  ]),
  category: z.string().min(1, "Category is required"),
  isActive: z.boolean().optional().default(true),
  fetchIntervalHours: z.number().min(1).max(168).optional().default(24),
});

export type AgentSourceCreateInput = z.infer<typeof agentSourceCreateSchema>;

export const agentSourceUpdateSchema = agentSourceCreateSchema.partial();

export type AgentSourceUpdateInput = z.infer<typeof agentSourceUpdateSchema>;

// ============================================
// AGENT TASK SCHEMA
// ============================================

export const agentTaskUpdateSchema = z.object({
  status: z
    .enum(["PLANNED", "WRITING", "IN_REVIEW", "APPROVED", "PUBLISHED", "REJECTED"])
    .optional(),
  title: z.string().optional(),
  brief: z.string().optional(),
  priority: z.number().min(1).max(10).optional(),
});

export type AgentTaskUpdateInput = z.infer<typeof agentTaskUpdateSchema>;

// ============================================
// AGENT SETTINGS SCHEMA
// ============================================

export const agentSettingsUpdateSchema = z.object({
  key: z.string(),
  value: z.unknown(),
  description: z.string().optional(),
});

export type AgentSettingsUpdateInput = z.infer<typeof agentSettingsUpdateSchema>;

// ============================================
// PIPELINE TRIGGER SCHEMA
// ============================================

export const pipelineTriggerSchema = z.object({
  triggeredBy: z.string().optional().default("manual"),
});

export type PipelineTriggerInput = z.infer<typeof pipelineTriggerSchema>;
