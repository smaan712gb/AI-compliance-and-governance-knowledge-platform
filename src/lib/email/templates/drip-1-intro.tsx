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

interface Drip1IntroEmailProps {
  name?: string;
  email: string;
  siteUrl: string;
}

export default function Drip1IntroEmail({
  name,
  email,
  siteUrl,
}: Drip1IntroEmailProps) {
  const greeting = name ? `Hi ${name},` : "Hi there,";

  return (
    <Html>
      <Head />
      <Preview>3 AI compliance mistakes that cost companies millions</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>&#x1F6E1; AIGovHub</Text>
          </Section>

          <Heading style={h1}>
            3 AI Compliance Mistakes That Cost Companies Millions
          </Heading>

          <Text style={text}>{greeting}</Text>

          <Text style={text}>
            As the EU AI Act enforcement ramps up, we are seeing companies make
            the same costly mistakes again and again. Here are the top three
            pitfalls and how to avoid them.
          </Text>

          <Heading as="h2" style={h2}>
            Mistake #1: Ignoring Risk Classification
          </Heading>
          <Text style={text}>
            Many organizations assume their AI systems are "low risk" without
            conducting a proper assessment. Under the EU AI Act, mis-classifying
            your system can lead to fines of up to 35 million EUR or 7% of
            global annual turnover. The risk categories (unacceptable, high,
            limited, and minimal) have specific criteria that require careful
            evaluation.
          </Text>

          <Heading as="h2" style={h2}>
            Mistake #2: No Documentation Trail
          </Heading>
          <Text style={text}>
            The EU AI Act requires extensive technical documentation for
            high-risk AI systems, including data governance practices, training
            methodologies, and performance metrics. Companies that treat
            documentation as an afterthought face scrambled compliance efforts
            and potential regulatory action.
          </Text>

          <Heading as="h2" style={h2}>
            Mistake #3: Overlooking Third-Party AI
          </Heading>
          <Text style={text}>
            If you deploy AI systems built by vendors, you are still responsible
            for compliance. Many companies fail to assess the compliance posture
            of their AI vendors, leaving gaps in their governance framework. You
            need to verify that every AI tool in your stack meets the
            requirements.
          </Text>

          <Text style={text}>
            <strong>Want to know where you stand?</strong> Our free AI Act
            Compliance Checker gives you an instant risk assessment for your AI
            systems.
          </Text>

          <Section style={ctaSection}>
            <Link href={`${siteUrl}/tools/ai-act-checker`} style={ctaButton}>
              Check Your Compliance Now
            </Link>
          </Section>

          <Text style={text}>
            In our next email, we will share a real-world case study of a
            company that went from zero to fully compliant in just 6 weeks.
          </Text>

          <Text style={text}>
            Stay compliant,
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
