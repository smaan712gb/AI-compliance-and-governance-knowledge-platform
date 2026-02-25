import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkCCMPermission, getUserOrganization } from "@/lib/ccm/rbac";
import { checkCCMFeatureAccess } from "@/lib/ccm/feature-gating";
import { routeLLMRequestStream } from "@/lib/ccm/llm-router";
import { logAuditEvent, extractRequestMeta } from "@/lib/ccm/audit-logger";
import { z } from "zod";

const analysisRequestSchema = z.object({
  type: z.enum(["finding_analysis", "risk_assessment", "compliance_summary", "data_review"]),
  context: z.record(z.string(), z.unknown()).optional(),
  findingId: z.string().optional(),
  connectorId: z.string().optional(),
  domain: z.string().optional(),
  prompt: z.string().optional(),
});

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
    const perm = await checkCCMPermission(session.user.id, orgId, "finding", "read");
    if (!perm.allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check AI analysis quota
    const featureAccess = await checkCCMFeatureAccess(orgId, "ai_analysis");
    if (!featureAccess.allowed) {
      return NextResponse.json(
        { error: `AI analysis limit reached (${featureAccess.limit}/month). Upgrade your plan.` },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = analysisRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Build context based on analysis type
    let systemPrompt = "";
    let userPrompt = "";

    switch (parsed.data.type) {
      case "finding_analysis": {
        if (!parsed.data.findingId) {
          return NextResponse.json({ error: "findingId is required for finding_analysis" }, { status: 400 });
        }
        const finding = await db.finding.findFirst({
          where: { id: parsed.data.findingId, organizationId: orgId },
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
        systemPrompt = `You are an enterprise compliance analyst. Analyze the following compliance finding and provide:
1. Root cause analysis
2. Impact assessment (financial, regulatory, operational)
3. Risk rating justification
4. Recommended immediate actions
5. Long-term prevention measures
Be specific and reference the data points provided.`;
        const dataSnippets = finding.dataPoints.map((dp) => JSON.stringify(dp.dataPoint.data)).join("\n");
        userPrompt = `Finding: ${finding.title}\nDescription: ${finding.description}\nSeverity: ${finding.severity}\nFramework: ${finding.framework || finding.rule?.framework}\nControl: ${finding.controlId || finding.rule?.controlId}\n\nRelated Data Points:\n${dataSnippets}\n${parsed.data.prompt ? `\nAdditional Context: ${parsed.data.prompt}` : ""}`;
        break;
      }

      case "risk_assessment": {
        systemPrompt = `You are a risk assessment specialist. Analyze the compliance data and provide a comprehensive risk assessment including:
1. Risk score (1-100) with justification
2. Key risk indicators identified
3. Trending analysis (improving/stable/deteriorating)
4. Critical areas requiring attention
5. Comparison with industry benchmarks
Format as structured analysis with clear sections.`;

        // Get recent findings summary
        const recentFindings = await db.finding.groupBy({
          by: ["severity", "status"],
          where: { organizationId: orgId },
          _count: { id: true },
        });
        userPrompt = `Organization findings summary:\n${JSON.stringify(recentFindings, null, 2)}\n${parsed.data.prompt ? `\nAdditional Context: ${parsed.data.prompt}` : ""}`;
        break;
      }

      case "compliance_summary": {
        systemPrompt = `You are a compliance reporting expert. Generate a concise executive compliance summary including:
1. Overall compliance posture
2. Open issues by framework and severity
3. Remediation progress
4. Key metrics and trends
5. Recommendations for leadership
Write in professional, executive-friendly language suitable for board reporting.`;

        const [openFindings, totalFindings, recentRuns] = await Promise.all([
          db.finding.count({ where: { organizationId: orgId, status: "OPEN" } }),
          db.finding.count({ where: { organizationId: orgId } }),
          db.monitoringRun.findMany({
            where: { rule: { organizationId: orgId } },
            orderBy: { startedAt: "desc" },
            take: 10,
            select: { findingsCreated: true, dataPointsScanned: true, startedAt: true },
          }),
        ]);
        userPrompt = `Compliance Data:\n- Open findings: ${openFindings}\n- Total findings: ${totalFindings}\n- Recent monitoring runs: ${JSON.stringify(recentRuns)}\n${parsed.data.prompt ? `\nFocus areas: ${parsed.data.prompt}` : ""}`;
        break;
      }

      case "data_review": {
        systemPrompt = `You are a data quality and compliance data reviewer. Analyze the ERP data points and identify:
1. Data quality issues
2. Anomalies or suspicious patterns
3. Potential compliance violations
4. Missing or incomplete records
5. Recommendations for data governance
Be thorough and specific about the data examined.`;

        const where: Record<string, unknown> = { connector: { organizationId: orgId } };
        if (parsed.data.connectorId) where.connectorId = parsed.data.connectorId;
        if (parsed.data.domain) where.domain = parsed.data.domain;

        const dataPoints = await db.eRPDataPoint.findMany({
          where,
          orderBy: { pulledAt: "desc" },
          take: 20,
          select: { domain: true, dataType: true, data: true, severity: true, flagged: true },
        });
        userPrompt = `Data Points for Review:\n${JSON.stringify(dataPoints, null, 2)}\n${parsed.data.prompt ? `\nSpecific concerns: ${parsed.data.prompt}` : ""}`;
        break;
      }
    }

    // Stream the response
    const { stream, model, provider } = await routeLLMRequestStream(orgId, {
      systemPrompt,
      userPrompt,
      maxTokens: 4000,
      temperature: 0.3,
    });

    const { ipAddress, userAgent } = extractRequestMeta(req);
    await logAuditEvent({
      organizationId: orgId,
      userId: session.user.id,
      action: "RUN_AI_ANALYSIS",
      resourceType: "analysis",
      details: {
        type: parsed.data.type,
        findingId: parsed.data.findingId,
        model,
        provider,
      },
      ipAddress,
      userAgent,
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[CCM Analysis] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
