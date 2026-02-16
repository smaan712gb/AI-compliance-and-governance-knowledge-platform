import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    // Test 1: Database connection
    const userCount = await db.user.count();

    // Test 2: Find admin user
    const admin = await db.user.findUnique({
      where: { email: "admin@aigovhub.com" },
      select: { id: true, email: true, role: true, hashedPassword: true },
    });

    // Test 3: bcrypt comparison
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
      nodeEnv: process.env.NODE_ENV,
    });
  } catch (error) {
    return NextResponse.json({
      dbConnected: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
