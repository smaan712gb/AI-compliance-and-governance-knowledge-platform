import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { inviteMemberSchema, updateMemberRoleSchema } from "@/lib/validators/ccm-organization";
import { checkCCMPermission, getUserOrganization } from "@/lib/ccm/rbac";
import { logAuditEvent, extractRequestMeta } from "@/lib/ccm/audit-logger";
import { checkCCMFeatureAccess } from "@/lib/ccm/feature-gating";

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

    const perm = await checkCCMPermission(
      session.user.id,
      orgResult.organization.id,
      "team",
      "read"
    );
    if (!perm.allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const members = await db.cCMOrganizationMember.findMany({
      where: { organizationId: orgResult.organization.id },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: { invitedAt: "asc" },
    });

    return NextResponse.json({ data: members });
  } catch (error) {
    console.error("[CCM Members] GET error:", error);
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
    const perm = await checkCCMPermission(session.user.id, orgId, "team", "create");
    if (!perm.allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check member limit
    const featureAccess = await checkCCMFeatureAccess(orgId, "member");
    if (!featureAccess.allowed) {
      return NextResponse.json(
        { error: `Member limit reached (${featureAccess.limit}). Upgrade your plan.` },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = inviteMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Find the user by email
    const invitedUser = await db.user.findUnique({
      where: { email: parsed.data.email },
    });
    if (!invitedUser) {
      return NextResponse.json(
        { error: "User not found. They must register on AIGovHub first." },
        { status: 404 }
      );
    }

    // Check if already a member
    const existingMember = await db.cCMOrganizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: invitedUser.id } },
    });
    if (existingMember) {
      return NextResponse.json(
        { error: "User is already a member of this organization" },
        { status: 409 }
      );
    }

    const member = await db.cCMOrganizationMember.create({
      data: {
        organizationId: orgId,
        userId: invitedUser.id,
        role: parsed.data.role as "ADMIN" | "ANALYST" | "VIEWER" | "AUDITOR",
        invitedBy: session.user.id,
        acceptedAt: new Date(), // Auto-accept for now
      },
    });

    const { ipAddress, userAgent } = extractRequestMeta(req);
    await logAuditEvent({
      organizationId: orgId,
      userId: session.user.id,
      action: "INVITE_MEMBER",
      resourceType: "member",
      resourceId: member.id,
      details: { email: parsed.data.email, role: parsed.data.role },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ data: member }, { status: 201 });
  } catch (error) {
    console.error("[CCM Members] POST error:", error);
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
    const perm = await checkCCMPermission(session.user.id, orgId, "team", "update");
    if (!perm.allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { memberId, ...roleData } = body;
    const parsed = updateMemberRoleSchema.safeParse(roleData);
    if (!parsed.success || !memberId) {
      return NextResponse.json({ error: "Validation error" }, { status: 400 });
    }

    // Prevent downgrading the last OWNER — org would become unmanageable
    const targetMember = await db.cCMOrganizationMember.findFirst({
      where: { id: memberId, organizationId: orgId },
    });
    if (targetMember?.role === "OWNER" && parsed.data.role !== "OWNER") {
      const ownerCount = await db.cCMOrganizationMember.count({
        where: { organizationId: orgId, role: "OWNER", isActive: true },
      });
      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: "Cannot change the role of the last owner. Promote another member to Owner first." },
          { status: 409 }
        );
      }
    }

    const updated = await db.cCMOrganizationMember.update({
      where: { id: memberId },
      data: { role: parsed.data.role },
    });

    const { ipAddress, userAgent } = extractRequestMeta(req);
    await logAuditEvent({
      organizationId: orgId,
      userId: session.user.id,
      action: "UPDATE_MEMBER_ROLE",
      resourceType: "member",
      resourceId: memberId,
      details: { newRole: parsed.data.role },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[CCM Members] PATCH error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
