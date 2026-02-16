"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

export async function loginWithCredentials(
  prevState: { error?: string } | undefined,
  formData: FormData
) {
  try {
    await signIn("credentials", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      redirectTo: formData.get("callbackUrl") as string || "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      console.log("[AUTH-ACTION] AuthError type:", error.type, "message:", error.message);
      return { error: "Invalid email or password" };
    }
    // NEXT_REDIRECT throws an error — re-throw it so Next.js handles the redirect
    throw error;
  }
}
