import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createLLMConfigSchema, updateLLMConfigSchema } from "@/lib/validators/ccm-llm-config";
import { checkCCMPermission, getUserOrganization } from "@/lib/ccm/rbac";
import { isProviderAllowed } from "@/lib/ccm/feature-gating";
import { encryptField, decryptField, maskSecret } from "@/lib/ccm/crypto";
import { testLLMConfig } from "@/lib/ccm/llm-router";
import { logAuditEvent, extractRequestMeta } from "@/lib/ccm/audit-logger";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgResult = await getUserOrganization(session.user.id);
    if (!orgResult) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const orgId = orgResult.organization.id;
    const perm = await checkCCMPermission(session.user.id, orgId, "settings", "read");
    if (!perm.allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const configs = await db.lLMConfiguration.findMany({
      where: { organizationId: orgId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });

    // Mask API keys before sending to frontend
    const safeConfigs = configs.map((config) => ({
      id: config.id,
      provider: config.provider,
      modelId: config.modelId,
      displayName: config.displayName,
      baseUrl: config.baseUrl,
      isDefault: config.isDefault,
      isActive: config.isActive,
      apiKeyMasked: maskSecret(decryptField(config.apiKeyEncrypted, orgId)),
      lastTestedAt: config.lastTestedAt,
      createdAt: config.createdAt,
    }));

    return NextResponse.json({ data: safeConfigs });
  } catch (error) {
    console.error("[CCM LLM Config] GET error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgResult = await getUserOrganization(session.user.id);
    if (!orgResult) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const orgId = orgResult.organization.id;
    const perm = await checkCCMPermission(session.user.id, orgId, "settings", "update");
    if (!perm.allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createLLMConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Check provider access
    const providerAllowed = await isProviderAllowed(orgId, parsed.data.provider);
    if (!providerAllowed) {
      return NextResponse.json(
        { error: `Provider ${parsed.data.provider} is not available on your plan.` },
        { status: 403 }
      );
    }

    // Test the API key before saving
    const testResult = await testLLMConfig(
      parsed.data.provider,
      parsed.data.apiKey,
      parsed.data.modelId,
      parsed.data.baseUrl || null
    );

    if (!testResult.success) {
      return NextResponse.json(
        { error: `API key test failed: ${testResult.error}` },
        { status: 400 }
      );
    }

    // Encrypt the API key
    const apiKeyEncrypted = encryptField(parsed.data.apiKey, orgId);

    // If setting as default, unset existing default
    if (parsed.data.isDefault) {
      await db.lLMConfiguration.updateMany({
        where: { organizationId: orgId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const config = await db.lLMConfiguration.create({
      data: {
        organizationId: orgId,
        provider: parsed.data.provider,
        modelId: parsed.data.modelId,
        displayName: parsed.data.displayName,
        apiKeyEncrypted,
        baseUrl: parsed.data.baseUrl || null,
        isDefault: parsed.data.isDefault,
        lastTestedAt: new Date(),
      },
    });

    const { ipAddress, userAgent } = extractRequestMeta(req);
    await logAuditEvent({
      organizationId: orgId,
      userId: session.user.id,
      action: "UPDATE_LLM_CONFIG",
      resourceType: "llm_config",
      resourceId: config.id,
      details: {
        action: "created",
        provider: parsed.data.provider,
        modelId: parsed.data.modelId,
        testLatencyMs: testResult.latencyMs,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json(
      {
        data: {
          id: config.id,
          provider: config.provider,
          modelId: config.modelId,
          displayName: config.displayName,
          baseUrl: config.baseUrl,
          isDefault: config.isDefault,
          isActive: config.isActive,
          apiKeyMasked: maskSecret(parsed.data.apiKey),
          lastTestedAt: config.lastTestedAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[CCM LLM Config] POST error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgResult = await getUserOrganization(session.user.id);
    if (!orgResult) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const orgId = orgResult.organization.id;
    const perm = await checkCCMPermission(session.user.id, orgId, "settings", "update");
    if (!perm.allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { configId, ...updateData } = body;
    if (!configId) {
      return NextResponse.json({ error: "configId is required" }, { status: 400 });
    }

    const parsed = updateLLMConfigSchema.safeParse(updateData);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Verify config belongs to this org
    const existing = await db.lLMConfiguration.findFirst({
      where: { id: configId, organizationId: orgId },
    });
    if (!existing) {
      return NextResponse.json({ error: "LLM configuration not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.modelId) data.modelId = parsed.data.modelId;
    if (parsed.data.displayName) data.displayName = parsed.data.displayName;
    if (parsed.data.baseUrl !== undefined) data.baseUrl = parsed.data.baseUrl || null;
    if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;

    // If new API key provided, test and encrypt it
    if (parsed.data.apiKey) {
      const testResult = await testLLMConfig(
        existing.provider,
        parsed.data.apiKey,
        parsed.data.modelId || existing.modelId,
        (parsed.data.baseUrl !== undefined ? parsed.data.baseUrl : existing.baseUrl) || null
      );
      if (!testResult.success) {
        return NextResponse.json(
          { error: `API key test failed: ${testResult.error}` },
          { status: 400 }
        );
      }
      data.apiKeyEncrypted = encryptField(parsed.data.apiKey, orgId);
      data.lastTestedAt = new Date();
    }

    // Handle default flag
    if (parsed.data.isDefault === true) {
      await db.lLMConfiguration.updateMany({
        where: { organizationId: orgId, isDefault: true },
        data: { isDefault: false },
      });
      data.isDefault = true;
    } else if (parsed.data.isDefault === false) {
      data.isDefault = false;
    }

    const updated = await db.lLMConfiguration.update({
      where: { id: configId },
      data,
    });

    const { ipAddress, userAgent } = extractRequestMeta(req);
    await logAuditEvent({
      organizationId: orgId,
      userId: session.user.id,
      action: "UPDATE_LLM_CONFIG",
      resourceType: "llm_config",
      resourceId: configId,
      details: { action: "updated", fields: Object.keys(parsed.data) },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      data: {
        id: updated.id,
        provider: updated.provider,
        modelId: updated.modelId,
        displayName: updated.displayName,
        baseUrl: updated.baseUrl,
        isDefault: updated.isDefault,
        isActive: updated.isActive,
        apiKeyMasked: maskSecret(decryptField(updated.apiKeyEncrypted, orgId)),
        lastTestedAt: updated.lastTestedAt,
      },
    });
  } catch (error) {
    console.error("[CCM LLM Config] PATCH error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgResult = await getUserOrganization(session.user.id);
    if (!orgResult) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const orgId = orgResult.organization.id;
    const perm = await checkCCMPermission(session.user.id, orgId, "settings", "delete");
    if (!perm.allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { configId } = body;
    if (!configId) {
      return NextResponse.json({ error: "configId is required" }, { status: 400 });
    }

    const existing = await db.lLMConfiguration.findFirst({
      where: { id: configId, organizationId: orgId },
    });
    if (!existing) {
      return NextResponse.json({ error: "LLM configuration not found" }, { status: 404 });
    }

    await db.lLMConfiguration.delete({ where: { id: configId } });

    const { ipAddress, userAgent } = extractRequestMeta(req);
    await logAuditEvent({
      organizationId: orgId,
      userId: session.user.id,
      action: "UPDATE_LLM_CONFIG",
      resourceType: "llm_config",
      resourceId: configId,
      details: { action: "deleted", provider: existing.provider },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    console.error("[CCM LLM Config] DELETE error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
