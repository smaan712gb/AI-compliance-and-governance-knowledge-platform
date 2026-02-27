import { z } from "zod";

export const createLLMConfigSchema = z.object({
  provider: z.enum(["OPENAI", "DEEPSEEK", "AZURE_OPENAI", "GOOGLE_GEMINI"]),
  modelId: z.string().min(1, "Model ID is required"),
  displayName: z.string().min(1, "Display name is required").max(100),
  apiKey: z.string().min(1, "API key is required"),
  baseUrl: z.string().url().optional().or(z.literal("")),
  isDefault: z.boolean().default(false),
});

export const updateLLMConfigSchema = z.object({
  modelId: z.string().min(1).optional(),
  displayName: z.string().min(1).max(100).optional(),
  apiKey: z.string().min(1).optional(),
  baseUrl: z.string().url().optional().or(z.literal("")),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const LLM_PROVIDER_MODELS: Record<string, { label: string; models: { id: string; name: string }[] }> = {
  OPENAI: {
    label: "OpenAI",
    models: [
      { id: "gpt-4o", name: "GPT-4o" },
      { id: "gpt-4o-mini", name: "GPT-4o Mini" },
      { id: "o1", name: "o1" },
      { id: "o1-mini", name: "o1 Mini" },
    ],
  },
  DEEPSEEK: {
    label: "DeepSeek",
    models: [
      { id: "deepseek-chat", name: "DeepSeek Chat (V3)" },
      { id: "deepseek-reasoner", name: "DeepSeek Reasoner (R1)" },
    ],
  },
  AZURE_OPENAI: {
    label: "Azure OpenAI",
    models: [
      { id: "gpt-4o", name: "GPT-4o (Azure)" },
      { id: "gpt-4o-mini", name: "GPT-4o Mini (Azure)" },
    ],
  },
  GOOGLE_GEMINI: {
    label: "Google Gemini",
    models: [
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
    ],
  },
};
