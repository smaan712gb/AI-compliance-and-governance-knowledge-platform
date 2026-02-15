import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  try {
    const link = await db.affiliateLink.findFirst({
      where: { trackingCode: code, isActive: true },
    });

    if (!link) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Record the click
    await db.affiliateClick.create({
      data: {
        affiliateLinkId: link.id,
        ipHash: request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "",
        referrerUrl: request.headers.get("referer") || "",
      },
    });

    return NextResponse.redirect(link.destinationUrl);
  } catch {
    return NextResponse.redirect(new URL("/", request.url));
  }
}
