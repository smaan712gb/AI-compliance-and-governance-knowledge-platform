import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  title: "How We Evaluate Tools",
  description:
    "Learn about our methodology for evaluating AI governance, compliance, and GRC tools. Our scoring criteria, testing process, and editorial standards.",
  path: "/how-we-evaluate",
});

export default function HowWeEvaluatePage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">How We Evaluate Tools</h1>
      <div className="prose prose-slate max-w-none">
        <p className="text-muted-foreground mb-6">
          Last updated: February 2026
        </p>

        <p>
          AIGovHub is committed to providing objective, trustworthy evaluations
          of AI governance, compliance, and GRC tools. This page explains our
          methodology, scoring criteria, and editorial standards.
        </p>

        <h2>Our Evaluation Criteria</h2>
        <p>
          Every vendor in our database is assessed across five core dimensions,
          each scored from 1 to 10:
        </p>

        <h3>1. Overall Score</h3>
        <p>
          A weighted composite reflecting the tool&apos;s overall quality and
          suitability for AI governance use cases. This accounts for feature
          depth, market maturity, user feedback, and regulatory alignment.
        </p>

        <h3>2. Ease of Use</h3>
        <p>
          How intuitive is the platform for both technical and non-technical
          users? We consider onboarding complexity, UI design, documentation
          quality, and the learning curve required to achieve value.
        </p>

        <h3>3. Feature Richness</h3>
        <p>
          The breadth and depth of capabilities relevant to AI governance. This
          includes framework support (EU AI Act, NIST AI RMF, ISO 42001),
          reporting, audit trails, bias testing, model monitoring, and
          integrations with enterprise systems.
        </p>

        <h3>4. Value for Money</h3>
        <p>
          How does the pricing compare to the value delivered? We assess pricing
          transparency, packaging, and whether the platform serves its target
          market segment (SMB, mid-market, or enterprise) cost-effectively.
        </p>

        <h3>5. Customer Support</h3>
        <p>
          Responsiveness, helpfulness, and availability of vendor support
          channels. We consider documentation, community resources, onboarding
          assistance, and ongoing support quality.
        </p>

        <h2>Our Research Process</h2>
        <ol>
          <li>
            <strong>Vendor identification:</strong> We continuously monitor the
            AI governance market through industry reports, regulatory news, and
            community feedback to identify relevant tools.
          </li>
          <li>
            <strong>Data collection:</strong> We gather information from vendor
            websites, documentation, published case studies, analyst reports, and
            publicly available user reviews.
          </li>
          <li>
            <strong>Assessment:</strong> Each tool is evaluated against our five
            scoring dimensions by reviewers with expertise in AI governance,
            compliance, and enterprise software.
          </li>
          <li>
            <strong>Pros and cons analysis:</strong> We identify specific
            strengths and weaknesses based on feature analysis, user feedback,
            and competitive positioning.
          </li>
          <li>
            <strong>Regular updates:</strong> Vendor profiles are reviewed and
            updated periodically. Each profile shows a &quot;Last verified&quot;
            date indicating when the information was last confirmed.
          </li>
        </ol>

        <h2>What We Do NOT Do</h2>
        <ul>
          <li>
            We do <strong>not</strong> accept payment for higher scores or
            favorable reviews.
          </li>
          <li>
            We do <strong>not</strong> claim our evaluations constitute legal
            advice or regulatory certification.
          </li>
          <li>
            We do <strong>not</strong> guarantee specific vendor pricing — prices
            shown are approximate ranges that should be verified directly with
            vendors.
          </li>
          <li>
            We do <strong>not</strong> perform hands-on security testing of
            vendor infrastructure.
          </li>
        </ul>

        <h2>Affiliate Relationships</h2>
        <p>
          Some vendors in our database are affiliate partners. When you click
          certain links and make a purchase, we may earn a commission at no
          additional cost to you. Affiliate relationships never influence our
          scores or editorial recommendations. For full details, see our{" "}
          <a href="/disclosure" className="underline">
            affiliate disclosure
          </a>
          .
        </p>

        <h2>Scoring Transparency</h2>
        <p>
          All vendor scores are displayed on individual vendor pages along with
          detailed pros/cons lists. We show separate scores for each evaluation
          dimension so you can weight what matters most to your organization.
        </p>
        <p>
          Comparison articles and &quot;best of&quot; lists use these same scores
          as their foundation. When specific data is unavailable for a vendor, we
          mark it as &quot;Not disclosed&quot; or &quot;Unknown&quot; rather than
          estimating.
        </p>

        <h2>Content Generation Disclosure</h2>
        <p>
          Some content on AIGovHub is generated with AI assistance and reviewed
          against our editorial standards, including factual accuracy checks
          against verified regulatory sources. AI-assisted content is held to the
          same quality and accuracy standards as manually written content.
        </p>

        <h2>Questions or Corrections?</h2>
        <p>
          If you believe any vendor information is inaccurate or outdated, please
          contact us at{" "}
          <a href="mailto:contact@aigovhub.com" className="underline">
            contact@aigovhub.com
          </a>
          . We take accuracy seriously and will investigate and update promptly.
        </p>
      </div>
    </div>
  );
}
