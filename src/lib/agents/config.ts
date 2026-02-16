import { db } from "@/lib/db";
import type { PipelineConfig } from "./types";

const DEFAULT_CONFIG: PipelineConfig = {
  enabled: true,
  dailyArticleTarget: 2,
  maxRewriteAttempts: 2,
  minQAScore: 7.0,
  researchSourceLimit: 50,
  evidenceExpiryDays: 30,
  model: "deepseek-chat",
  plannerModel: "deepseek-reasoner",
  qaModel: "deepseek-reasoner",
  writerTemperature: 0.7,
  maxTokensPerArticle: 4000,
  budgetLimitUsd: 5.0,
};

export async function loadConfig(): Promise<PipelineConfig> {
  const config = { ...DEFAULT_CONFIG };

  try {
    const settings = await db.agentSettings.findMany();
    for (const setting of settings) {
      const key = setting.key as keyof PipelineConfig;
      if (key in config) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (config as any)[key] = setting.value;
      }
    }
  } catch {
    // If DB unavailable, use defaults
  }

  return config;
}

export async function updateConfig(
  key: string,
  value: unknown,
  description?: string,
): Promise<void> {
  await db.agentSettings.upsert({
    where: { key },
    update: { value: value as never, description },
    create: { key, value: value as never, description },
  });
}

export { DEFAULT_CONFIG };
