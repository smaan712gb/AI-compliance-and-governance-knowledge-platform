import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import { getLLMConfigs, testLLMConfig } from "@/lib/sentinel/llm-provider";
import { logAuditEvent, extractAuditContext } from "@/lib/sentinel/audit";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId") || undefined;

    const configs = await getLLMConfigs({
      userId: session.user.id,
      organizationId,
    });

    return NextResponse.json({ data: configs });
  } catch (error) {
    console.error("[Sentinel LLM Configs GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

const createConfigSchema = z.object({
  provider: z.enum(["DEEPSEEK", "OPENAI", "AZURE_OPENAI", "GOOGLE_GEMINI"]),
  modelId: z.string().min(1).max(200),
  displayName: z.string().min(1).max(200),
  apiKeyEncrypted: z.string().min(1),
  baseUrl: z.string().max(500).optional(),
  isDefault: z.boolean().default(false),
  organizationId: z.string().optional(),
});

const testConfigSchema = z.object({
  action: z.literal("test"),
  configId: z.string().min(1),
});

const postSchema = z.union([createConfigSchema, testConfigSchema]);

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 },
      );
    }

    // Handle test action
    if ("action" in parsed.data && parsed.data.action === "test") {
      // Verify the user owns this config
      const config = await db.sentinelLLMConfig.findFirst({
        where: {
          id: parsed.data.configId,
          OR: [
            { userId: session.user.id },
            { organization: { members: { some: { userId: session.user.id, isActive: true } } } },
          ],
        },
      });
      if (!config) {
        return NextResponse.json({ error: "Config not found" }, { status: 404 });
      }

      const result = await testLLMConfig(parsed.data.configId);
      return NextResponse.json({ data: result });
    }

    // Handle create
    const data = parsed.data as z.infer<typeof createConfigSchema>;

    // If setting as default, unset other defaults in the same scope
    if (data.isDefault) {
      await db.sentinelLLMConfig.updateMany({
        where: {
          isDefault: true,
          ...(data.organizationId
            ? { organizationId: data.organizationId }
            : { userId: session.user.id, organizationId: null }),
        },
        data: { isDefault: false },
      });
    }

    const config = await db.sentinelLLMConfig.create({
      data: {
        userId: session.user.id,
        provider: data.provider,
        modelId: data.modelId,
        displayName: data.displayName,
        apiKeyEncrypted: data.apiKeyEncrypted,
        baseUrl: data.baseUrl,
        isDefault: data.isDefault,
        organizationId: data.organizationId,
      },
    });

    const ctx = extractAuditContext(req, session.user.id, data.organizationId);
    logAuditEvent(ctx, "LLM_CONFIG_CREATED", {
      resourceType: "llm_config",
      resourceId: config.id,
      params: { provider: data.provider, modelId: data.modelId },
    });

    return NextResponse.json({ data: config }, { status: 201 });
  } catch (error) {
    console.error("[Sentinel LLM Configs POST]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
