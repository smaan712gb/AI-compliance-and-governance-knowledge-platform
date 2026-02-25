import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { checkCCMPermission, getUserOrganization } from "@/lib/ccm/rbac";
import { logAuditEvent, extractRequestMeta } from "@/lib/ccm/audit-logger";
import { z } from "zod";

const createEvidenceSchema = z.object({
  findingId: z.string().optional(),
  type: z.enum([
    "SCREENSHOT",
    "LOG_EXPORT",
    "CONFIGURATION",
    "POLICY_DOCUMENT",
    "TEST_RESULT",
    "SYSTEM_REPORT",
    "AUTO_COLLECTED",
  ]),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  fileUrl: z.string().url().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
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
    const perm = await checkCCMPermission(session.user.id, orgId, "evidence", "read");
    if (!perm.allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const findingId = searchParams.get("findingId");
    const type = searchParams.get("type");
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);
    const offset = Number(searchParams.get("offset")) || 0;

    const where: Record<string, unknown> = { organizationId: orgId };
    if (findingId) where.findingId = findingId;
    if (type) where.type = type;

    const [evidence, total] = await Promise.all([
      db.evidence.findMany({
        where,
        orderBy: { collectedAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          finding: { select: { id: true, title: true, severity: true } },
        },
      }),
      db.evidence.count({ where }),
    ]);

    return NextResponse.json({
      data: evidence,
      pagination: { total, limit, offset },
    });
  } catch (error) {
    console.error("[CCM Evidence] GET error:", error);
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
    const perm = await checkCCMPermission(session.user.id, orgId, "evidence", "create");
    if (!perm.allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createEvidenceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // If findingId provided, verify it belongs to this org
    if (parsed.data.findingId) {
      const finding = await db.finding.findFirst({
        where: { id: parsed.data.findingId, organizationId: orgId },
      });
      if (!finding) {
        return NextResponse.json({ error: "Finding not found" }, { status: 404 });
      }
    }

    const evidence = await db.evidence.create({
      data: {
        organizationId: orgId,
        findingId: parsed.data.findingId || null,
        type: parsed.data.type,
        title: parsed.data.title,
        description: parsed.data.description,
        fileUrl: parsed.data.fileUrl,
        data: (parsed.data.data as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        collectedBy: session.user.id,
      },
    });

    const { ipAddress, userAgent } = extractRequestMeta(req);
    await logAuditEvent({
      organizationId: orgId,
      userId: session.user.id,
      action: "UPLOAD_EVIDENCE",
      resourceType: "evidence",
      resourceId: evidence.id,
      details: { type: parsed.data.type, title: parsed.data.title },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ data: evidence }, { status: 201 });
  } catch (error) {
    console.error("[CCM Evidence] POST error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
