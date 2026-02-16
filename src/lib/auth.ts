import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

// Trim env vars to remove accidental whitespace/newlines
if (process.env.AUTH_URL) process.env.AUTH_URL = process.env.AUTH_URL.trim();

const providers = [
  Credentials({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      console.log("[AUTH] authorize called with email:", credentials?.email);
      if (!credentials?.email || !credentials?.password) {
        console.log("[AUTH] Missing email or password");
        return null;
      }

      try {
        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });
        console.log("[AUTH] User found:", !!user, "hasPassword:", !!user?.hashedPassword);

        if (!user || !user.hashedPassword) {
          console.log("[AUTH] No user or no password");
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.hashedPassword
        );
        console.log("[AUTH] Password valid:", isPasswordValid);

        if (!isPasswordValid) {
          return null;
        }

        console.log("[AUTH] Returning user:", user.id, user.role);
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      } catch (err) {
        console.error("[AUTH] authorize error:", err);
        return null;
      }
    },
  }),
];

// Only add OAuth providers if credentials are configured
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }) as never
  );
}
if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }) as never
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  // adapter: PrismaAdapter(db), // Disabled - causes issues with credentials provider
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers,
  callbacks: {
    async jwt({ token, user }) {
      console.log("[AUTH] jwt callback, user present:", !!user);
      if (user) {
        token.id = user.id!;
        token.role = (user as { role?: string }).role || "USER";
        console.log("[AUTH] jwt set id:", token.id, "role:", token.role);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
});
