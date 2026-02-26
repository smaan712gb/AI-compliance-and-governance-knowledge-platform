import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createOrganizationSchema } from "@/lib/validators/ccm-organization";
import { generateOrgEncryptionHash } from "@/lib/ccm/crypto";
import { logAuditEvent, extractRequestMeta } from "@/lib/ccm/audit-logger";
import { getUserOrganization } from "@/lib/ccm/rbac";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await getUserOrganization(session.user.id);
    if (!result) {
      return NextResponse.json({ data: null });
    }

    const { organization, role } = result;
    const memberCount = await db.cCMOrganizationMember.count({
      where: { organizationId: organization.id, isActive: true },
    });

    return NextResponse.json({
      data: {
        ...organization,
        encryptionKeyHash: undefined, // Never expose
        role,
        memberCount,
      },
    });
  } catch (error) {
    console.error("[CCM Org] GET error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user already belongs to an org
    const existing = await getUserOrganization(session.user.id);
    if (existing) {
      return NextResponse.json(
        { error: "You already belong to an organization" },
        { status: 409 }
      );
    }

    const body = await req.json();
    const parsed = createOrganizationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Check slug uniqueness
    const slugExists = await db.cCMOrganization.findUnique({
      where: { slug: parsed.data.slug },
    });
    if (slugExists) {
      return NextResponse.json(
        { error: "Organization slug already taken" },
        { status: 409 }
      );
    }

    // Create organization + owner membership + 14-day trial in a transaction
    const org = await db.$transaction(async (tx) => {
      const newOrg = await tx.cCMOrganization.create({
        data: {
          name: parsed.data.name,
          slug: parsed.data.slug,
          industry: parsed.data.industry,
          companySize: parsed.data.companySize,
          headquarters: parsed.data.headquarters,
          encryptionKeyHash: generateOrgEncryptionHash(parsed.data.slug),
        },
      });

      await tx.cCMOrganizationMember.create({
        data: {
          organizationId: newOrg.id,
          userId: session.user.id,
          role: "OWNER",
          acceptedAt: new Date(),
        },
      });

      // Auto-provision a 14-day Professional trial so the owner has full access immediately
      const now = new Date();
      const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      await tx.cCMSubscription.create({
        data: {
          organizationId: newOrg.id,
          stripeSubscriptionId: `trial_${newOrg.id}`,
          stripePriceId: "trial_professional",
          stripeCurrentPeriodStart: now,
          stripeCurrentPeriodEnd: trialEnd,
          status: "TRIALING",
          cancelAtPeriodEnd: true,
        },
      });

      return newOrg;
    });

    const { ipAddress, userAgent } = extractRequestMeta(req);
    await logAuditEvent({
      organizationId: org.id,
      userId: session.user.id,
      action: "UPDATE_ORG_SETTINGS",
      resourceType: "organization",
      resourceId: org.id,
      details: { action: "created" },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ data: { ...org, encryptionKeyHash: undefined } }, { status: 201 });
  } catch (error) {
    console.error("[CCM Org] POST error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
