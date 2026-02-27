import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkCCMPermission, getUserOrganization } from "@/lib/ccm/rbac";
import { routeLLMRequest } from "@/lib/ccm/llm-router";
import { logAuditEvent, extractRequestMeta } from "@/lib/ccm/audit-logger";
import { z } from "zod";

const generateReportSchema = z.object({
  reportType: z.enum([
    "SOX_COMPLIANCE",
    "PCI_DSS_COMPLIANCE",
    "AML_BSA_COMPLIANCE",
    "ACCESS_REVIEW",
    "EXECUTIVE_SUMMARY",
    "CUSTOM",
  ]),
  title: z.string().min(1).max(200).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  frameworks: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);
    const offset = Number(searchParams.get("offset")) || 0;

    const [reports, total] = await Promise.all([
      db.cCMReport.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          reportType: true,
          title: true,
          createdAt: true,
          generatedBy: true,
          // Exclude large data/aiResponse fields from list
        },
      }),
      db.cCMReport.count({ where: { organizationId: orgId } }),
    ]);

    return NextResponse.json({
      data: reports,
      pagination: { total, limit, offset },
    });
  } catch (error) {
    console.error("[CCM Reports] GET error:", error);
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
    const perm = await checkCCMPermission(session.user.id, orgId, "finding", "read");
    if (!perm.allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = generateReportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Gather report data
    const dateFrom = parsed.data.dateFrom ? new Date(parsed.data.dateFrom) : new Date(Date.now() - 30 * 86400000);
    const dateTo = parsed.data.dateTo ? new Date(parsed.data.dateTo) : new Date();

    const [findings, syncJobs, rules, recentRuns] = await Promise.all([
      db.finding.findMany({
        where: {
          organizationId: orgId,
          createdAt: { gte: dateFrom, lte: dateTo },
          ...(parsed.data.frameworks?.length
            ? { framework: { in: parsed.data.frameworks as import("@prisma/client").RuleFramework[] } }
            : {}),
        },
        include: { rule: { select: { name: true, framework: true, controlId: true } } },
      }),
      db.connectorSyncJob.findMany({
        where: {
          connector: { organizationId: orgId },
          startedAt: { gte: dateFrom, lte: dateTo },
        },
        select: { status: true, recordsPulled: true, recordsFailed: true, domain: true },
      }),
      db.monitoringRule.count({ where: { organizationId: orgId, isActive: true } }),
      db.monitoringRun.findMany({
        where: {
          rule: { organizationId: orgId },
          startedAt: { gte: dateFrom, lte: dateTo },
        },
        select: { findingsCreated: true, dataPointsScanned: true },
      }),
    ]);

    // Compute statistics
    const findingsBySeverity = {
      CRITICAL: findings.filter((f) => f.severity === "CRITICAL").length,
      HIGH: findings.filter((f) => f.severity === "HIGH").length,
      MEDIUM: findings.filter((f) => f.severity === "MEDIUM").length,
      LOW: findings.filter((f) => f.severity === "LOW").length,
    };

    const findingsByStatus = {
      OPEN: findings.filter((f) => f.status === "OPEN").length,
      IN_PROGRESS: findings.filter((f) => f.status === "IN_PROGRESS").length,
      REMEDIATED: findings.filter((f) => f.status === "REMEDIATED").length,
      CLOSED: findings.filter((f) => f.status === "CLOSED").length,
    };

    const totalDataPointsScanned = recentRuns.reduce((s, r) => s + (r.dataPointsScanned || 0), 0);
    const totalRecordsSynced = syncJobs.reduce((s, j) => s + (j.recordsPulled || 0), 0);

    const reportData = {
      period: { from: dateFrom.toISOString(), to: dateTo.toISOString() },
      findings: { total: findings.length, bySeverity: findingsBySeverity, byStatus: findingsByStatus },
      monitoring: { activeRules: rules, runsInPeriod: recentRuns.length, dataPointsScanned: totalDataPointsScanned },
      sync: { jobsInPeriod: syncJobs.length, totalRecordsSynced },
    };

    // Build a representative findings list: prioritise critical/high, top 20 total
    const findingsByPriority = [
      ...findings.filter((f) => f.severity === "CRITICAL"),
      ...findings.filter((f) => f.severity === "HIGH"),
      ...findings.filter((f) => f.severity === "MEDIUM"),
      ...findings.filter((f) => f.severity === "LOW"),
    ].slice(0, 20);

    // Generate AI narrative
    const llmResponse = await routeLLMRequest(orgId, {
      systemPrompt: `You are a compliance reporting expert generating a ${parsed.data.reportType} report.
Write a professional compliance report suitable for auditors and executive leadership.
Include: executive summary, key findings, risk analysis, compliance metrics, and recommendations.
Format using markdown with clear sections and headers.`,
      userPrompt: `Report Type: ${parsed.data.reportType}
Period: ${dateFrom.toLocaleDateString()} to ${dateTo.toLocaleDateString()}

Data Summary:
${JSON.stringify(reportData, null, 2)}

Top Findings (${findingsByPriority.length} shown, prioritised by severity):
${findingsByPriority
  .map((f) => `- [${f.severity}] ${f.title} (${f.rule?.framework ?? f.framework ?? "N/A"} / ${f.rule?.controlId ?? f.controlId ?? "N/A"}) - ${f.status}`)
  .join("\n")}${findings.length > 20 ? `\n... and ${findings.length - 20} additional findings (see Data Summary for counts)` : ""}`,
      maxTokens: 4000,
      temperature: 0.3,
    });

    const report = await db.cCMReport.create({
      data: {
        organizationId: orgId,
        reportType: parsed.data.reportType,
        title: parsed.data.title || `${parsed.data.reportType.replace(/_/g, " ")} Report`,
        data: reportData,
        aiResponse: llmResponse.content,
        generatedBy: session.user.id,
      },
    });

    const { ipAddress, userAgent } = extractRequestMeta(req);
    await logAuditEvent({
      organizationId: orgId,
      userId: session.user.id,
      action: "GENERATE_REPORT",
      resourceType: "report",
      resourceId: report.id,
      details: {
        reportType: parsed.data.reportType,
        model: llmResponse.model,
        tokensUsed: llmResponse.inputTokens + llmResponse.outputTokens,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      data: {
        id: report.id,
        reportType: report.reportType,
        title: report.title,
        data: reportData,
        narrative: llmResponse.content,
        generatedAt: report.createdAt,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("[CCM Reports] POST error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
