import { resend } from "@/lib/resend";
import { render } from "@react-email/render";
import * as React from "react";

interface SendEmailOptions {
  to: string;
  subject: string;
  react: React.ReactElement;
}

interface SendEmailResult {
  success: boolean;
  error?: string;
}

export async function sendEmail({
  to,
  subject,
  react,
}: SendEmailOptions): Promise<SendEmailResult> {
  const from =
    process.env.RESEND_FROM_EMAIL || "AIGovHub <hello@aigovhub.com>";

  try {
    const html = await render(react);

    await resend.emails.send({
      from,
      to,
      subject,
      html,
    });

    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error sending email";
    console.error("sendEmail error:", message);
    return { success: false, error: message };
  }
}
