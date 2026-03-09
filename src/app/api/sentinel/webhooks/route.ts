import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import { logAuditEvent, extractAuditContext } from "@/lib/sentinel/audit";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const webhooks = await db.sentinelWebhook.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        url: true,
        events: true,
        minSeverity: true,
        isActive: true,
        lastDeliveryAt: true,
        failureCount: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ data: webhooks });
  } catch (error) {
    console.error("[Sentinel Webhooks GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

const createWebhookSchema = z.object({
  url: z.url(),
  events: z.array(z.string().min(1)).min(1).max(20),
  minSeverity: z
    .enum(["low", "medium", "high", "critical"])
    .default("high"),
  secret: z.string().min(16).max(256).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createWebhookSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const webhook = await db.sentinelWebhook.create({
      data: {
        userId: session.user.id,
        url: parsed.data.url,
        events: parsed.data.events,
        minSeverity: parsed.data.minSeverity,
        secret: parsed.data.secret,
      },
    });

    const ctx = extractAuditContext(req, session.user.id);
    logAuditEvent(ctx, "WEBHOOK_CREATED", {
      resourceType: "webhook",
      resourceId: webhook.id,
      params: { url: parsed.data.url, events: parsed.data.events },
    });

    return NextResponse.json({ data: webhook }, { status: 201 });
  } catch (error) {
    console.error("[Sentinel Webhooks POST]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

const updateWebhookSchema = z.object({
  id: z.string().min(1),
  url: z.url().optional(),
  events: z.array(z.string().min(1)).min(1).max(20).optional(),
  minSeverity: z
    .enum(["low", "medium", "high", "critical"])
    .optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = updateWebhookSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 },
      );
    }

    // Verify ownership
    const existing = await db.sentinelWebhook.findFirst({
      where: { id: parsed.data.id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    const { id, ...updateData } = parsed.data;
    const webhook = await db.sentinelWebhook.update({
      where: { id },
      data: updateData,
    });

    const ctx = extractAuditContext(req, session.user.id);
    logAuditEvent(ctx, "WEBHOOK_UPDATED", {
      resourceType: "webhook",
      resourceId: id,
      params: updateData,
    });

    return NextResponse.json({ data: webhook });
  } catch (error) {
    console.error("[Sentinel Webhooks PATCH]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

const deleteWebhookSchema = z.object({
  id: z.string().min(1),
});

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = deleteWebhookSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 },
      );
    }

    // Verify ownership
    const existing = await db.sentinelWebhook.findFirst({
      where: { id: parsed.data.id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    await db.sentinelWebhook.delete({ where: { id: parsed.data.id } });

    const ctx = extractAuditContext(req, session.user.id);
    logAuditEvent(ctx, "WEBHOOK_DELETED", {
      resourceType: "webhook",
      resourceId: parsed.data.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Sentinel Webhooks DELETE]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
