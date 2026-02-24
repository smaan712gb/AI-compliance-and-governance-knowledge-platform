import crypto from "crypto";

export function generateUnsubscribeToken(email: string): string {
  const secret = process.env.AUTH_SECRET || "fallback-secret";
  return crypto.createHmac("sha256", secret).update(email).digest("hex");
}
