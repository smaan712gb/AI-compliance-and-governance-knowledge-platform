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

interface Drip3CaseStudyEmailProps {
  name?: string;
  email: string;
  siteUrl: string;
}

export default function Drip3CaseStudyEmail({
  name,
  email,
  siteUrl,
}: Drip3CaseStudyEmailProps) {
  const greeting = name ? `Hi ${name},` : "Hi there,";

  return (
    <Html>
      <Head />
      <Preview>Your AI Compliance Toolkit - everything you need in one place</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>&#x1F6E1; AIGovHub</Text>
          </Section>

          <Heading style={h1}>Your AI Compliance Toolkit</Heading>

          <Text style={text}>{greeting}</Text>

          <Text style={text}>
            Over the past few emails, we have covered common compliance mistakes
            and how a company achieved full EU AI Act compliance in just 6 weeks.
            Today, we want to introduce something that can accelerate your own
            compliance journey.
          </Text>

          <Heading as="h2" style={h2}>
            The AI Act Starter Toolkit
          </Heading>

          <Text style={text}>
            We built the{" "}
            <strong>AI Act Starter Toolkit</strong> specifically for teams that
            want a structured, step-by-step approach to EU AI Act compliance.
            Here is what is inside:
          </Text>

          <Text style={listItem}>
            <strong>AI System Inventory Template</strong> - Catalog every AI
            system in your organization with the fields regulators expect to see.
          </Text>
          <Text style={listItem}>
            <strong>Risk Assessment Framework</strong> - A guided worksheet to
            classify each system under the EU AI Act risk tiers with clear
            criteria.
          </Text>
          <Text style={listItem}>
            <strong>Documentation Checklist</strong> - The complete list of
            technical documentation requirements for high-risk AI systems, broken
            down into actionable items.
          </Text>
          <Text style={listItem}>
            <strong>Vendor Compliance Scorecard</strong> - Evaluate your
            third-party AI vendors against EU AI Act requirements with a
            standardized scoring matrix.
          </Text>
          <Text style={listItem}>
            <strong>90-Day Compliance Roadmap</strong> - A week-by-week action
            plan to take your organization from awareness to compliance.
          </Text>

          <Section style={priceSection}>
            <Text style={priceText}>
              Get the complete toolkit for just <strong>$49</strong>
            </Text>
            <Text style={priceSubtext}>
              One-time purchase. No subscription. Lifetime updates.
            </Text>
          </Section>

          <Section style={ctaSection}>
            <Link href={`${siteUrl}/products`} style={ctaButton}>
              Get the Toolkit
            </Link>
          </Section>

          <Text style={text}>
            Hundreds of compliance teams are already using these templates to
            streamline their EU AI Act preparation. The toolkit pays for itself
            the moment it saves you from a single compliance oversight.
          </Text>

          <Text style={text}>
            Best,
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

const listItem: React.CSSProperties = {
  color: "#374151",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "0 0 12px",
  paddingLeft: "16px",
};

const priceSection: React.CSSProperties = {
  backgroundColor: "#f0f9ff",
  borderRadius: "8px",
  padding: "24px",
  textAlign: "center" as const,
  margin: "24px 0",
};

const priceText: React.CSSProperties = {
  color: "#1a1a2e",
  fontSize: "20px",
  lineHeight: "28px",
  margin: "0 0 4px",
};

const priceSubtext: React.CSSProperties = {
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
