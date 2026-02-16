import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { encode } from "next-auth/jwt";

const isSecure = process.env.NODE_ENV === "production";
const cookieName = isSecure
  ? "__Secure-authjs.session-token"
  : "authjs.session-token";

async function authenticate(email: string, password: string) {
  if (!email || !password) {
    return { error: "Email and password required" as const, status: 400 };
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.hashedPassword) {
    return { error: "Invalid credentials" as const, status: 401 };
  }

  const valid = await bcrypt.compare(password, user.hashedPassword);
  if (!valid) {
    return { error: "Invalid credentials" as const, status: 401 };
  }

  // Create JWT using the same encode function NextAuth uses
  const token = await encode({
    token: {
      sub: user.id,
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.image,
      role: user.role,
    },
    secret: process.env.AUTH_SECRET!,
    salt: cookieName,
  });

  return { token, user };
}

// JSON API (for fetch calls)
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    let email: string;
    let password: string;
    let isFormSubmission = false;

    if (contentType.includes("application/x-www-form-urlencoded")) {
      // Native HTML form submission
      const formData = await req.formData();
      email = formData.get("email") as string;
      password = formData.get("password") as string;
      isFormSubmission = true;
    } else {
      // JSON fetch call
      const body = await req.json();
      email = body.email;
      password = body.password;
    }

    const result = await authenticate(email, password);

    if ("error" in result) {
      if (isFormSubmission) {
        // Redirect back to login with error
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("error", String(result.error));
        return NextResponse.redirect(loginUrl, { status: 303 });
      }
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    if (isFormSubmission) {
      // Redirect to dashboard with cookie
      const dashboardUrl = new URL("/dashboard", req.url);
      const response = NextResponse.redirect(dashboardUrl, { status: 303 });
      response.cookies.set(cookieName, result.token, {
        httpOnly: true,
        secure: isSecure,
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      });
      return response;
    }

    // JSON response with cookie
    const response = NextResponse.json({
      success: true,
      user: { id: result.user.id, email: result.user.email, name: result.user.name, role: result.user.role },
    });
    response.cookies.set(cookieName, result.token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
    return response;
  } catch (error) {
    console.error("[LOGIN-API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
