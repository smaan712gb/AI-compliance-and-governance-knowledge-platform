import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Auth-protected routes
  const protectedPaths = ["/dashboard", "/checkout"];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (isProtected) {
    const token = await getToken({ req: request });
    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Admin-only routes
  if (pathname.startsWith("/admin")) {
    const token = await getToken({ req: request });
    if (
      !token ||
      !["ADMIN", "SUPER_ADMIN"].includes((token.role as string) || "")
    ) {
      return NextResponse.redirect(new URL("/", request.url));
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
