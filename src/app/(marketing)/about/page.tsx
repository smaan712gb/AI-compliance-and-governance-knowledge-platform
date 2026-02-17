import { buildMetadata } from "@/lib/seo/metadata";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Shield, Target, Users, Lightbulb } from "lucide-react";

export const metadata = buildMetadata({
  title: "About AIGovHub - AI Governance & Compliance Platform",
  description:
    "AIGovHub helps organizations navigate AI regulations, manage compliance programs, and evaluate AI governance tools.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-4">About AIGovHub</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Your trusted resource for navigating AI governance, compliance, and
          risk management in an era of rapid regulatory change.
        </p>
      </div>

      {/* Mission */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
        <p className="text-muted-foreground leading-relaxed">
          AIGovHub was built to solve a real problem: AI regulations like the EU
          AI Act are complex, fast-moving, and difficult for organizations to
          navigate without expensive consultants. We believe every organization
          deploying AI should have access to practical, actionable compliance
          tools &mdash; not just legal jargon buried in 100-page PDFs.
        </p>
        <p className="text-muted-foreground leading-relaxed mt-4">
          We combine expert-curated content, AI-powered compliance tools, and
          the most comprehensive vendor tracker in the industry to help
          compliance teams, legal professionals, and technology leaders make
          informed decisions about AI governance.
        </p>
      </section>

      {/* What We Offer */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">What We Offer</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardContent className="pt-6">
              <Shield className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-2">Compliance Tools</h3>
              <p className="text-sm text-muted-foreground">
                AI Act Compliance Checker and Vendor Risk Questionnaire Generator
                to assess your obligations and evaluate third-party AI systems.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <Target className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-2">Vendor Tracker</h3>
              <p className="text-sm text-muted-foreground">
                The most comprehensive database of AI governance vendors with
                independent ratings, framework coverage, and detailed reviews.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <Lightbulb className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-2">Expert Content</h3>
              <p className="text-sm text-muted-foreground">
                Daily articles, in-depth guides, and analysis covering EU AI Act
                updates, compliance strategies, and industry best practices.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <Users className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-2">Compliance Toolkits</h3>
              <p className="text-sm text-muted-foreground">
                Ready-to-use templates, checklists, and policy documents for
                teams building AI compliance programs from scratch.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Founder */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Leadership</h2>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex-shrink-0">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">SM</span>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold">Saad Muhayyodin Maan</h3>
                <p className="text-primary font-medium">CEO &amp; Founder</p>
                <p className="text-sm text-muted-foreground mt-1">MBA</p>
                <p className="text-muted-foreground mt-3 leading-relaxed">
                  With a background in business strategy and technology, Saad
                  founded AIGovHub to bridge the gap between complex AI
                  regulations and practical compliance solutions. His vision is
                  to democratize access to AI governance tools and make
                  compliance achievable for organizations of all sizes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Values */}
      <section>
        <h2 className="text-2xl font-bold mb-6">Our Values</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold">Accuracy First</h3>
            <p className="text-sm text-muted-foreground">
              Every compliance check, vendor review, and article is grounded in
              actual regulatory text and verified frameworks.
            </p>
          </div>
          <div>
            <h3 className="font-semibold">Practical Over Theoretical</h3>
            <p className="text-sm text-muted-foreground">
              We focus on actionable guidance, not academic analysis. Our tools
              give you clear next steps, not ambiguity.
            </p>
          </div>
          <div>
            <h3 className="font-semibold">Independence</h3>
            <p className="text-sm text-muted-foreground">
              Our vendor reviews and ratings are independent. We clearly
              disclose affiliate relationships and never let them influence our
              assessments.
            </p>
          </div>
          <div>
            <h3 className="font-semibold">Transparency</h3>
            <p className="text-sm text-muted-foreground">
              We publish our evaluation methodology, disclose our business
              model, and are upfront about the limitations of our tools.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
