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

interface Drip2ValueEmailProps {
  name?: string;
  email: string;
  siteUrl: string;
}

export default function Drip2ValueEmail({
  name,
  email,
  siteUrl,
}: Drip2ValueEmailProps) {
  const greeting = name ? `Hi ${name},` : "Hi there,";

  return (
    <Html>
      <Head />
      <Preview>How one company achieved EU AI Act compliance in 6 weeks</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>&#x1F6E1; AIGovHub</Text>
          </Section>

          <Heading style={h1}>
            How [Company] Achieved EU AI Act Compliance in 6 Weeks
          </Heading>

          <Text style={text}>{greeting}</Text>

          <Text style={text}>
            Last time we talked about the 3 biggest compliance mistakes. Today,
            we want to share how a mid-sized fintech company went from "we have
            no idea where to start" to fully compliant in just 6 weeks.
          </Text>

          <Heading as="h2" style={h2}>
            The Challenge
          </Heading>
          <Text style={text}>
            This company had 12 AI-powered features in production, including
            credit scoring, fraud detection, and customer support chatbots. With
            the EU AI Act deadlines approaching, their legal team flagged
            significant compliance gaps. They had no centralized inventory of AI
            systems, no risk assessments, and minimal documentation.
          </Text>

          <Heading as="h2" style={h2}>
            The Approach
          </Heading>
          <Text style={text}>
            <strong>Week 1-2: Discovery and Classification.</strong> They used
            tools like our AI Act Compliance Checker to classify each system by
            risk level. Two systems were identified as high-risk (credit scoring
            and fraud detection), requiring the most attention.
          </Text>
          <Text style={text}>
            <strong>Week 3-4: Documentation and Governance.</strong> They
            established a governance framework, assigned responsible parties for
            each AI system, and began documenting data sources, training
            processes, and performance benchmarks.
          </Text>
          <Text style={text}>
            <strong>Week 5-6: Vendor Assessment and Monitoring.</strong> They
            evaluated all third-party AI vendors against compliance criteria and
            set up continuous monitoring dashboards to track ongoing compliance.
          </Text>

          <Heading as="h2" style={h2}>
            The Result
          </Heading>
          <Text style={text}>
            Within 6 weeks, they had a complete AI inventory, risk assessments
            for every system, proper documentation, and a vendor compliance
            scorecard. When regulators came knocking, they were ready.
          </Text>

          <Text style={text}>
            <strong>You can follow a similar path.</strong> Start by comparing AI
            governance vendors to find the right tools for your organization.
          </Text>

          <Section style={ctaSection}>
            <Link href={`${siteUrl}/vendors`} style={ctaButton}>
              Explore Vendor Comparisons
            </Link>
          </Section>

          <Text style={text}>
            Next time, we will share a toolkit that makes this entire process
            even easier.
          </Text>

          <Text style={text}>
            To your compliance success,
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
  fontSize: "18px",
  fontWeight: "bold",
  margin: "24px 0 8px",
};

const text: React.CSSProperties = {
  color: "#374151",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "0 0 16px",
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
