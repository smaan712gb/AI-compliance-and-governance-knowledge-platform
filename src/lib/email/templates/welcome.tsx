import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface WelcomeEmailProps {
  name?: string;
  email: string;
  siteUrl: string;
}

export default function WelcomeEmail({
  name,
  email,
  siteUrl,
}: WelcomeEmailProps) {
  const greeting = name ? `Hi ${name},` : "Hi there,";

  return (
    <Html>
      <Head />
      <Preview>Welcome to AIGovHub - Your AI governance journey starts here</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>&#x1F6E1; AIGovHub</Text>
          </Section>

          <Heading style={h1}>Welcome to AIGovHub</Heading>

          <Text style={text}>{greeting}</Text>

          <Text style={text}>
            Thank you for joining AIGovHub! We are here to help you navigate the
            complex world of AI governance and compliance, especially the EU AI
            Act.
          </Text>

          <Text style={text}>
            Whether you are building AI systems, deploying third-party solutions,
            or simply trying to understand your obligations, we have got the
            tools and resources to help you stay compliant.
          </Text>

          <Text style={text}>
            <strong>Here is what you can do right now:</strong>
          </Text>

          <Text style={text}>
            Try our free{" "}
            <Link href={`${siteUrl}/tools/ai-act-checker`} style={link}>
              AI Act Compliance Checker
            </Link>{" "}
            to instantly assess your AI system's risk classification under the EU
            AI Act. It takes less than 2 minutes and gives you a clear picture of
            where you stand.
          </Text>

          <Section style={ctaSection}>
            <Link href={`${siteUrl}/tools/ai-act-checker`} style={ctaButton}>
              Check Your AI Compliance Now
            </Link>
          </Section>

          <Text style={text}>
            Over the next few days, we will send you practical tips, real-world
            case studies, and tools to help you build a rock-solid AI compliance
            strategy.
          </Text>

          <Text style={text}>
            Welcome aboard!
            <br />
            The AIGovHub Team
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            You are receiving this because you signed up at{" "}
            <Link href={siteUrl} style={footerLink}>
              AIGovHub
            </Link>
            .{" "}
            <Link
              href={`${siteUrl}/api/subscribers/unsubscribe?email=${encodeURIComponent(email)}`}
              style={footerLink}
            >
              Unsubscribe
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main: React.CSSProperties = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
};

const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 24px",
  maxWidth: "600px",
  borderRadius: "8px",
};

const header: React.CSSProperties = {
  textAlign: "center" as const,
  marginBottom: "24px",
};

const logo: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: "bold",
  color: "#1a1a2e",
};

const h1: React.CSSProperties = {
  color: "#1a1a2e",
  fontSize: "28px",
  fontWeight: "bold",
  textAlign: "center" as const,
  margin: "0 0 24px",
};

const text: React.CSSProperties = {
  color: "#374151",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "0 0 16px",
};

const link: React.CSSProperties = {
  color: "#2563eb",
  textDecoration: "underline",
};

const ctaSection: React.CSSProperties = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const ctaButton: React.CSSProperties = {
  backgroundColor: "#2563eb",
  borderRadius: "6px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "16px",
  fontWeight: "bold",
  padding: "12px 32px",
  textDecoration: "none",
};

const hr: React.CSSProperties = {
  borderColor: "#e5e7eb",
  margin: "32px 0 16px",
};

const footer: React.CSSProperties = {
  color: "#9ca3af",
  fontSize: "12px",
  lineHeight: "20px",
  textAlign: "center" as const,
};

const footerLink: React.CSSProperties = {
  color: "#9ca3af",
  textDecoration: "underline",
};
