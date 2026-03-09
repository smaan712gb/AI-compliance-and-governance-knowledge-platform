// ============================================
// SENTINEL — LLM Provider Switching (BYOK)
// Supports: DeepSeek, OpenAI, Azure OpenAI, Google Gemini
// ============================================

import OpenAI from "openai";
import { db } from "@/lib/db";

export type SupportedProvider = "DEEPSEEK" | "OPENAI" | "AZURE_OPENAI" | "GOOGLE_GEMINI";

interface LLMClientConfig {
  provider: SupportedProvider;
  modelId: string;
  displayName: string;
  client: OpenAI;
}

const PROVIDER_DEFAULTS: Record<SupportedProvider, { baseURL: string; defaultModel: string }> = {
  DEEPSEEK: {
    baseURL: "https://api.deepseek.com",
    defaultModel: "deepseek-reasoner",
  },
  OPENAI: {
    baseURL: "https://api.openai.com/v1",
    defaultModel: "gpt-4o",
  },
  AZURE_OPENAI: {
    baseURL: "", // Must be provided per-org
    defaultModel: "gpt-4o",
  },
  GOOGLE_GEMINI: {
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-2.0-flash",
  },
};

/**
 * Resolve the reasoning LLM client for a user/org.
 * Priority: org default → user default → platform DeepSeek
 */
export async function getReasoningClient(
  userId?: string,
  organizationId?: string,
): Promise<LLMClientConfig> {
  // 1. Try org-level config
  if (organizationId) {
    const orgConfig = await db.sentinelLLMConfig.findFirst({
      where: {
        organizationId,
        isDefault: true,
        isActive: true,
      },
    });

    if (orgConfig) {
      return buildClient(orgConfig);
    }
  }

  // 2. Try user-level config
  if (userId) {
    const userConfig = await db.sentinelLLMConfig.findFirst({
      where: {
        userId,
        organizationId: null,
        isDefault: true,
        isActive: true,
      },
    });

    if (userConfig) {
      return buildClient(userConfig);
    }
  }

  // 3. Fall back to platform DeepSeek
  return {
    provider: "DEEPSEEK",
    modelId: process.env.DEEPSEEK_REASONING_MODEL || "deepseek-reasoner",
    displayName: "Platform DeepSeek R1",
    client: new OpenAI({
      baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
      apiKey: process.env.DEEPSEEK_API_KEY || "",
    }),
  };
}

/**
 * Resolve the bias auditing LLM client.
 * Falls back to platform Groq (Llama-3.3-70b).
 */
export async function getBiasAuditClient(
  userId?: string,
  organizationId?: string,
): Promise<LLMClientConfig> {
  // Check for org/user BYOK config first
  if (organizationId) {
    const orgConfig = await db.sentinelLLMConfig.findFirst({
      where: { organizationId, isDefault: true, isActive: true },
    });
    if (orgConfig) return buildClient(orgConfig);
  }

  if (userId) {
    const userConfig = await db.sentinelLLMConfig.findFirst({
      where: { userId, organizationId: null, isDefault: true, isActive: true },
    });
    if (userConfig) return buildClient(userConfig);
  }

  // Fall back to platform Groq
  return {
    provider: "DEEPSEEK" as SupportedProvider,
    modelId: "llama-3.3-70b-versatile",
    displayName: "Platform Groq (Llama-3.3-70b)",
    client: new OpenAI({
      baseURL: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
      apiKey: process.env.GROQ_API_KEY || "",
    }),
  };
}

/** Test an LLM config by sending a simple completion request */
export async function testLLMConfig(configId: string): Promise<{
  success: boolean;
  latencyMs: number;
  error?: string;
}> {
  const config = await db.sentinelLLMConfig.findUnique({
    where: { id: configId },
  });

  if (!config) return { success: false, latencyMs: 0, error: "Config not found" };

  const start = Date.now();
  try {
    const llm = buildClient(config);

    const result = await llm.client.chat.completions.create({
      model: llm.modelId,
      messages: [{ role: "user", content: "Respond with exactly: OK" }],
      max_tokens: 5,
      temperature: 0,
    });

    const latencyMs = Date.now() - start;
    const content = result.choices[0]?.message?.content;

    await db.sentinelLLMConfig.update({
      where: { id: configId },
      data: { lastTestedAt: new Date(), lastError: null },
    });

    return { success: !!content, latencyMs };
  } catch (error) {
    const latencyMs = Date.now() - start;
    const errMsg = error instanceof Error ? error.message : String(error);

    await db.sentinelLLMConfig.update({
      where: { id: configId },
      data: { lastTestedAt: new Date(), lastError: errMsg },
    }).catch(() => {});

    return { success: false, latencyMs, error: errMsg };
  }
}

// ---- Helpers ----

function buildClient(config: {
  provider: string;
  modelId: string;
  displayName: string;
  apiKeyEncrypted: string;
  baseUrl: string | null;
}): LLMClientConfig {
  const provider = config.provider as SupportedProvider;
  const defaults = PROVIDER_DEFAULTS[provider] || PROVIDER_DEFAULTS.DEEPSEEK;

  // For now, use the encrypted key directly (in production, decrypt with org key)
  // The CCM crypto module can be reused for proper encryption
  const apiKey = config.apiKeyEncrypted;

  return {
    provider,
    modelId: config.modelId,
    displayName: config.displayName,
    client: new OpenAI({
      baseURL: config.baseUrl || defaults.baseURL,
      apiKey,
    }),
  };
}

/** Get available LLM configs for a user/org */
export async function getLLMConfigs(params: {
  userId?: string;
  organizationId?: string;
}) {
  const where: Record<string, unknown>[] = [];

  if (params.organizationId) {
    where.push({ organizationId: params.organizationId });
  }
  if (params.userId) {
    where.push({ userId: params.userId, organizationId: null });
  }

  if (where.length === 0) return [];

  return db.sentinelLLMConfig.findMany({
    where: { OR: where, isActive: true },
    select: {
      id: true,
      provider: true,
      modelId: true,
      displayName: true,
      baseUrl: true,
      isDefault: true,
      lastTestedAt: true,
      lastError: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}
