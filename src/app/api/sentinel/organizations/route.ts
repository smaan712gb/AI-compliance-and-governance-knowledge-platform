import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod/v4";
import {
  getUserOrganizations,
  createOrganization,
} from "@/lib/sentinel/organizations";
import { logAuditEvent, extractAuditContext } from "@/lib/sentinel/audit";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgs = await getUserOrganizations(session.user.id);
    return NextResponse.json({ data: orgs });
  } catch (error) {
    console.error("[Sentinel Organizations GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

const createOrgSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  industry: z.string().max(100).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createOrgSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const org = await createOrganization({
      ...parsed.data,
      createdByUserId: session.user.id,
    });

    const ctx = extractAuditContext(req, session.user.id, org.id);
    logAuditEvent(ctx, "ORG_CREATED", {
      resourceType: "organization",
      resourceId: org.id,
      params: { name: parsed.data.name, slug: parsed.data.slug },
    });

    return NextResponse.json({ data: org }, { status: 201 });
  } catch (error) {
    console.error("[Sentinel Organizations POST]", error);
    const msg = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
