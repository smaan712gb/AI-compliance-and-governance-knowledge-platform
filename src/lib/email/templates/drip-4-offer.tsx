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

interface Drip4OfferEmailProps {
  name?: string;
  email: string;
  siteUrl: string;
}

export default function Drip4OfferEmail({
  name,
  email,
  siteUrl,
}: Drip4OfferEmailProps) {
  const greeting = name ? `Hi ${name},` : "Hi there,";

  return (
    <Html>
      <Head />
      <Preview>EU AI Act deadline approaching - are you ready?</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>&#x1F6E1; AIGovHub</Text>
          </Section>

          <Heading style={h1}>
            EU AI Act Deadline: Are You Ready?
          </Heading>

          <Text style={text}>{greeting}</Text>

          <Text style={text}>
            This is our final email in this series, and we wanted to make sure
            you have everything you need before the EU AI Act enforcement
            deadlines hit.
          </Text>

          <Section style={urgencyBox}>
            <Text style={urgencyTitle}>Key Deadlines You Cannot Miss</Text>
            <Text style={urgencyText}>
              <strong>February 2025:</strong> Prohibited AI practices ban takes
              effect.
            </Text>
            <Text style={urgencyText}>
              <strong>August 2025:</strong> Obligations for general-purpose AI
              models.
            </Text>
            <Text style={urgencyText}>
              <strong>August 2026:</strong> Full enforcement for high-risk AI
              systems.
            </Text>
            <Text style={urgencyText}>
              Non-compliance penalties: up to <strong>35 million EUR</strong> or{" "}
              <strong>7% of global annual turnover</strong>.
            </Text>
          </Section>

          <Text style={text}>
            If you have not started your compliance journey yet, now is the time.
            Every week of delay makes the eventual process more rushed and more
            expensive.
          </Text>

          <Heading as="h2" style={h2}>
            Special Offer: AI Act Starter Toolkit
          </Heading>

          <Text style={text}>
            As a thank-you for being part of the AIGovHub community, we are
            offering the <strong>AI Act Starter Toolkit</strong> at a special
            price. This is everything you need to get started:
          </Text>

          <Text style={text}>
            - AI System Inventory Template
            <br />
            - Risk Assessment Framework
            <br />
            - Documentation Checklist
            <br />
            - Vendor Compliance Scorecard
            <br />- 90-Day Compliance Roadmap
          </Text>

          <Section style={offerSection}>
            <Text style={offerPrice}>
              <span style={originalPrice}>$49</span>{" "}
              <strong>$39</strong> - Limited Time Offer
            </Text>
            <Text style={offerSubtext}>
              Use code <strong>WELCOME20</strong> at checkout for 20% off.
            </Text>
          </Section>

          <Section style={ctaSection}>
            <Link href={`${siteUrl}/products`} style={ctaButton}>
              Get the Toolkit Now
            </Link>
          </Section>

          <Text style={text}>
            Even if you are not ready to purchase, our free{" "}
            <Link href={`${siteUrl}/tools/ai-act-checker`} style={link}>
              AI Act Compliance Checker
            </Link>{" "}
            and{" "}
            <Link href={`${siteUrl}/vendors`} style={link}>
              vendor comparison tools
            </Link>{" "}
            are always available to help you assess where you stand.
          </Text>

          <Text style={text}>
            Thank you for following along with this series. We are always here to
            help you navigate AI governance and compliance. Do not hesitate to
            reach out if you have questions.
          </Text>

          <Text style={text}>
            To your success,
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
  fontSize: "24px",
  fontWeight: "bold",
  textAlign: "center" as const,
  margin: "0 0 24px",
};

const h2: React.CSSProperties = {
  color: "#1a1a2e",
  fontSize: "20px",
  fontWeight: "bold",
  margin: "24px 0 12px",
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

const urgencyBox: React.CSSProperties = {
  backgroundColor: "#fef2f2",
  borderLeft: "4px solid #dc2626",
  borderRadius: "4px",
  padding: "20px 24px",
  margin: "24px 0",
};

const urgencyTitle: React.CSSProperties = {
  color: "#991b1b",
  fontSize: "18px",
  fontWeight: "bold",
  margin: "0 0 12px",
};

const urgencyText: React.CSSProperties = {
  color: "#374151",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 8px",
};

const offerSection: React.CSSProperties = {
  backgroundColor: "#f0fdf4",
  borderRadius: "8px",
  padding: "24px",
  textAlign: "center" as const,
  margin: "24px 0",
};

const offerPrice: React.CSSProperties = {
  color: "#1a1a2e",
  fontSize: "22px",
  lineHeight: "28px",
  margin: "0 0 4px",
};

const originalPrice: React.CSSProperties = {
  textDecoration: "line-through",
  color: "#9ca3af",
};

const offerSubtext: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "0",
};

const ctaSection: React.CSSProperties = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const ctaButton: React.CSSProperties = {
  backgroundColor: "#16a34a",
  borderRadius: "6px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "16px",
  fontWeight: "bold",
  padding: "14px 36px",
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
