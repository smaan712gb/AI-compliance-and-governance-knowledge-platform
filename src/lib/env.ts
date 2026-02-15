/**
 * Environment variable validation.
 * Validates required and optional environment variables at import time.
 * Logs warnings for missing optional vars and errors for missing required vars.
 * Does NOT throw during production builds to avoid breaking CI/CD.
 */

const requiredVars = ["DATABASE_URL", "AUTH_SECRET"] as const;

const optionalVars = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "DEEPSEEK_API_KEY",
  "RESEND_API_KEY",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
] as const;

type RequiredVar = (typeof requiredVars)[number];
type OptionalVar = (typeof optionalVars)[number];
type EnvRecord = Record<RequiredVar, string> & Record<OptionalVar, string | undefined>;

function validateEnv(): EnvRecord {
  const missing: string[] = [];

  // Check required variables
  for (const key of requiredVars) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    const message = `Missing required environment variables:\n${missing.map((v) => `  - ${v}`).join("\n")}`;

    if (process.env.NODE_ENV === "production") {
      // In production, log the error but do not throw to avoid breaking builds
      console.error(`[env] ${message}`);
    } else {
      // In development/test, throw to surface issues early
      throw new Error(message);
    }
  }

  // Check optional variables and warn if missing
  for (const key of optionalVars) {
    if (!process.env[key]) {
      console.warn(`[env] Optional variable ${key} is not set. Related features may be unavailable.`);
    }
  }

  // Build the typed env object
  const env = {} as EnvRecord;

  for (const key of requiredVars) {
    (env as Record<string, string | undefined>)[key] = process.env[key] ?? "";
  }

  for (const key of optionalVars) {
    (env as Record<string, string | undefined>)[key] = process.env[key];
  }

  return env;
}

export const env = validateEnv();
