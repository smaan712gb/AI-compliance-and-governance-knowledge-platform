import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isSecure = process.env.NODE_ENV === "production";

/** Build the public-facing origin (not localhost inside Docker) */
function getOrigin(req: NextRequest): string {
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = getOrigin(request);

  // Shared getToken options — must match the cookie name our login API sets
  const tokenOpts = {
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: isSecure,
  };

  // Auth-protected routes
  const protectedPaths = ["/dashboard", "/checkout"];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (isProtected) {
    const token = await getToken(tokenOpts);
    if (!token) {
      const loginUrl = new URL("/login", origin);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl.toString());
    }
  }

  // Admin-only routes
  if (pathname.startsWith("/admin")) {
    const token = await getToken(tokenOpts);
    if (
      !token ||
      !["ADMIN", "SUPER_ADMIN"].includes((token.role as string) || "")
    ) {
      return NextResponse.redirect(new URL("/", origin).toString());
    }
  }

  // Affiliate click redirect: /go/<trackingCode>
  if (pathname.startsWith("/go/")) {
    const trackingCode = pathname.replace("/go/", "");
    if (trackingCode) {
      return NextResponse.rewrite(
        new URL(
          `/api/affiliates/click?code=${encodeURIComponent(trackingCode)}`,
          request.url
        )
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/checkout/:path*",
    "/go/:path*",
  ],
};
