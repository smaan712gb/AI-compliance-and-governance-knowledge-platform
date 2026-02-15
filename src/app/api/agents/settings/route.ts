import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { DEFAULT_CONFIG } from "@/lib/agents/config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.role || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await db.agentSettings.findMany({
      orderBy: { key: "asc" },
    });

    // Merge DB settings with defaults
    const config = { ...DEFAULT_CONFIG };
    for (const setting of settings) {
      const key = setting.key as keyof typeof config;
      if (key in config) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (config as any)[key] = setting.value;
      }
    }

    return NextResponse.json({
      success: true,
      data: { config, rawSettings: settings },
    });
  } catch (error) {
    console.error("Get settings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.role || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { key, value, description } = body as {
      key: string;
      value: unknown;
      description?: string;
    };

    if (!key) {
      return NextResponse.json(
        { error: "key is required" },
        { status: 400 },
      );
    }

    // Validate key exists in config
    if (!(key in DEFAULT_CONFIG)) {
      return NextResponse.json(
        { error: `Invalid setting key: ${key}` },
        { status: 400 },
      );
    }

    const setting = await db.agentSettings.upsert({
      where: { key },
      update: { value: value as never, description },
      create: { key, value: value as never, description },
    });

    return NextResponse.json({ success: true, data: setting });
  } catch (error) {
    console.error("Update settings error:", error);
    return NextResponse.json(
      { error: "Failed to update setting" },
      { status: 500 },
    );
  }
}
