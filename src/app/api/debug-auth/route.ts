import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  try {
    const userCount = await db.user.count();

    const admin = await db.user.findUnique({
      where: { email: "admin@aigovhub.com" },
      select: { id: true, email: true, role: true, hashedPassword: true },
    });

    let bcryptWorks = false;
    if (admin?.hashedPassword) {
      bcryptWorks = await bcrypt.compare("Admin2026!", admin.hashedPassword);
    }

    return NextResponse.json({
      dbConnected: true,
      userCount,
      adminFound: !!admin,
      adminRole: admin?.role,
      hasPassword: !!admin?.hashedPassword,
      bcryptWorks,
      authUrl: process.env.AUTH_URL,
      authSecret: process.env.AUTH_SECRET ? `set (${process.env.AUTH_SECRET.length} chars)` : "NOT SET",
      nodeEnv: process.env.NODE_ENV,
      host: req.headers.get("host"),
    });
  } catch (error) {
    return NextResponse.json({
      dbConnected: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

// Test actual sign-in flow
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) return NextResponse.json({ step: "findUser", result: "NOT_FOUND" });
    if (!user.hashedPassword) return NextResponse.json({ step: "hasPassword", result: "NO_PASSWORD" });

    const valid = await bcrypt.compare(password, user.hashedPassword);
    if (!valid) return NextResponse.json({ step: "bcrypt", result: "INVALID_PASSWORD" });

    return NextResponse.json({
      step: "complete",
      result: "SUCCESS",
      userId: user.id,
      role: user.role,
    });
  } catch (error) {
    return NextResponse.json({
      step: "error",
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
