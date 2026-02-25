import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { updateFindingSchema, generateRemediationSchema } from "@/lib/validators/ccm-finding";
import { checkCCMPermission, getUserOrganization } from "@/lib/ccm/rbac";
import { logAuditEvent, extractRequestMeta } from "@/lib/ccm/audit-logger";
import { routeLLMRequest } from "@/lib/ccm/llm-router";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const perm = await checkCCMPermission(session.user.id, orgId, "finding", "read");
    if (!perm.allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const finding = await db.finding.findFirst({
      where: { id, organizationId: orgId },
      include: {
        rule: true,
        remediationPlan: true,
        dataPoints: {
          include: {
            dataPoint: {
              select: { id: true, domain: true, dataType: true, data: true, pulledAt: true },
            },
          },
          take: 50,
        },
      },
    });

    if (!finding) {
      return NextResponse.json({ error: "Finding not found" }, { status: 404 });
    }

    return NextResponse.json({ data: finding });
  } catch (error) {
    console.error("[CCM Findings] GET [id] error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const perm = await checkCCMPermission(session.user.id, orgId, "finding", "update");
    if (!perm.allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await db.finding.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Finding not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateFindingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.status) updateData.status = parsed.data.status;
    if (parsed.data.assignedTo !== undefined) updateData.assignedTo = parsed.data.assignedTo;
    if (parsed.data.dueDate) updateData.dueDate = new Date(parsed.data.dueDate);
    if (parsed.data.resolutionNotes) updateData.resolutionNotes = parsed.data.resolutionNotes;

    if (parsed.data.status === "REMEDIATED" || parsed.data.status === "CLOSED") {
      updateData.resolvedAt = new Date();
    }

    const updated = await db.finding.update({
      where: { id },
      data: updateData,
    });

    const { ipAddress, userAgent } = extractRequestMeta(req);
    await logAuditEvent({
      organizationId: orgId,
      userId: session.user.id,
      action: "UPDATE_FINDING_STATUS",
      resourceType: "finding",
      resourceId: id,
      details: { previousStatus: existing.status, ...parsed.data },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[CCM Findings] PATCH error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const perm = await checkCCMPermission(session.user.id, orgId, "finding", "update");
    if (!perm.allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const finding = await db.finding.findFirst({
      where: { id, organizationId: orgId },
      include: {
        rule: true,
        dataPoints: {
          include: { dataPoint: { select: { data: true, dataType: true } } },
          take: 10,
        },
      },
    });

    if (!finding) {
      return NextResponse.json({ error: "Finding not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = generateRemediationSchema.safeParse({ findingId: id, ...body });
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error" }, { status: 400 });
    }

    // Build AI prompt
    const dataPointSummary = finding.dataPoints
      .slice(0, 5)
      .map((dp) => JSON.stringify(dp.dataPoint.data))
      .join("\n");

    const llmResponse = await routeLLMRequest(orgId, {
      systemPrompt: `You are a compliance expert specializing in ${finding.rule?.framework || "regulatory"} compliance.
Generate a detailed remediation plan for the compliance finding described below.
Return a JSON object with: { "summary": "...", "steps": [{ "order": 1, "title": "...", "description": "...", "responsible": "...", "estimatedDays": N }], "preventionMeasures": ["..."], "references": ["..."] }`,
      userPrompt: `Finding: ${finding.title}
Description: ${finding.description}
Severity: ${finding.severity}
Framework: ${finding.framework || finding.rule?.framework || "N/A"}
Control: ${finding.controlId || finding.rule?.controlId || "N/A"}
Rule: ${finding.rule?.name || "N/A"}
AI Analysis: ${finding.aiAnalysis || "N/A"}
Sample Data Points:
${dataPointSummary}
${parsed.data.additionalContext ? `\nAdditional Context: ${parsed.data.additionalContext}` : ""}`,
      maxTokens: 3000,
      temperature: 0.3,
    });

    let parsedPlan;
    try {
      parsedPlan = JSON.parse(llmResponse.content);
    } catch {
      parsedPlan = { summary: llmResponse.content, steps: [], preventionMeasures: [], references: [] };
    }

    // Upsert remediation plan
    const plan = await db.remediationPlan.upsert({
      where: { findingId: id },
      update: {
        steps: parsedPlan.steps || [],
        aiResponse: llmResponse.content,
      },
      create: {
        findingId: id,
        steps: parsedPlan.steps || [],
        aiResponse: llmResponse.content,
      },
    });

    const { ipAddress, userAgent } = extractRequestMeta(req);
    await logAuditEvent({
      organizationId: orgId,
      userId: session.user.id,
      action: "GENERATE_REMEDIATION",
      resourceType: "finding",
      resourceId: id,
      details: {
        planId: plan.id,
        model: llmResponse.model,
        provider: llmResponse.provider,
        tokensUsed: llmResponse.inputTokens + llmResponse.outputTokens,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      data: {
        plan,
        summary: parsedPlan.summary,
        preventionMeasures: parsedPlan.preventionMeasures,
        references: parsedPlan.references,
        tokensUsed: llmResponse.inputTokens + llmResponse.outputTokens,
      },
    });
  } catch (error) {
    console.error("[CCM Findings] Generate remediation error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
