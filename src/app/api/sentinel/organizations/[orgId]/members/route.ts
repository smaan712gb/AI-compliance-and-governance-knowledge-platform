import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod/v4";
import {
  authorizeOrgAction,
  inviteMember,
  updateMemberRole,
  removeMember,
  getOrganization,
} from "@/lib/sentinel/organizations";
import { logAuditEvent, extractAuditContext } from "@/lib/sentinel/audit";

type RouteContext = { params: Promise<{ orgId: string }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId } = await ctx.params;
    const authz = await authorizeOrgAction(session.user.id, orgId, "VIEWER");
    if (!authz.authorized) {
      return NextResponse.json({ error: authz.error }, { status: 403 });
    }

    const org = await getOrganization(orgId);
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    return NextResponse.json({ data: org.members });
  } catch (error) {
    console.error("[Sentinel Members GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

const inviteSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["VIEWER", "ANALYST", "MANAGER", "ADMIN"]).default("VIEWER"),
});

export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId } = await ctx.params;
    const authz = await authorizeOrgAction(session.user.id, orgId, "ADMIN");
    if (!authz.authorized) {
      return NextResponse.json({ error: authz.error }, { status: 403 });
    }

    const body = await req.json();
    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const member = await inviteMember({
      organizationId: orgId,
      userId: parsed.data.userId,
      role: parsed.data.role,
      invitedBy: session.user.id,
    });

    const auditCtx = extractAuditContext(req, session.user.id, orgId);
    logAuditEvent(auditCtx, "MEMBER_INVITED", {
      resourceType: "member",
      resourceId: member.id,
      params: { userId: parsed.data.userId, role: parsed.data.role },
    });

    return NextResponse.json({ data: member }, { status: 201 });
  } catch (error) {
    console.error("[Sentinel Members POST]", error);
    const msg = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

const updateRoleSchema = z.object({
  memberId: z.string().min(1),
  newRole: z.enum(["VIEWER", "ANALYST", "MANAGER", "ADMIN"]),
});

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId } = await ctx.params;
    const authz = await authorizeOrgAction(session.user.id, orgId, "ADMIN");
    if (!authz.authorized) {
      return NextResponse.json({ error: authz.error }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const member = await updateMemberRole({
      organizationId: orgId,
      memberId: parsed.data.memberId,
      newRole: parsed.data.newRole,
    });

    const auditCtx = extractAuditContext(req, session.user.id, orgId);
    logAuditEvent(auditCtx, "MEMBER_ROLE_CHANGED", {
      resourceType: "member",
      resourceId: parsed.data.memberId,
      params: { newRole: parsed.data.newRole },
    });

    return NextResponse.json({ data: member });
  } catch (error) {
    console.error("[Sentinel Members PATCH]", error);
    const msg = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

const deleteSchema = z.object({
  memberId: z.string().min(1),
});

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId } = await ctx.params;
    const authz = await authorizeOrgAction(session.user.id, orgId, "ADMIN");
    if (!authz.authorized) {
      return NextResponse.json({ error: authz.error }, { status: 403 });
    }

    const body = await req.json();
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 },
      );
    }

    await removeMember({
      organizationId: orgId,
      memberId: parsed.data.memberId,
    });

    const auditCtx = extractAuditContext(req, session.user.id, orgId);
    logAuditEvent(auditCtx, "MEMBER_REMOVED", {
      resourceType: "member",
      resourceId: parsed.data.memberId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Sentinel Members DELETE]", error);
    const msg = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
