import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  title: "Terms of Service",
  description: "Terms and conditions for using AIGovHub's compliance tools and services.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
      <div className="prose prose-slate max-w-none">
        <p className="text-muted-foreground mb-6">Last updated: February 2026</p>

        <h2>1. Acceptance of Terms</h2>
        <p>By accessing or using AIGovHub, you agree to be bound by these Terms of Service. If you do not agree, please do not use our services.</p>

        <h2>2. Services</h2>
        <p>AIGovHub provides AI governance compliance tools, vendor databases, digital products, and educational content. Our tools provide guidance but do not constitute legal advice.</p>

        <h2>3. Accounts</h2>
        <p>You are responsible for maintaining the security of your account credentials. You must provide accurate information when creating an account.</p>

        <h2>4. Digital Products</h2>
        <ul>
          <li>Digital products are delivered electronically upon payment confirmation</li>
          <li>Products are for your personal or organizational use only</li>
          <li>Redistribution or resale is prohibited</li>
          <li>Refunds are available within 14 days if the product has not been downloaded</li>
        </ul>

        <h2>5. Subscriptions</h2>
        <ul>
          <li>Subscriptions renew automatically unless canceled</li>
          <li>You can cancel anytime through your dashboard</li>
          <li>Cancellations take effect at the end of the current billing period</li>
          <li>No partial refunds for unused subscription time</li>
        </ul>

        <h2>6. AI-Generated Content</h2>
        <p>Our AI compliance tools provide automated analysis based on publicly available regulations. This content is informational only and should not be considered legal, regulatory, or professional advice. Always consult qualified professionals for compliance decisions.</p>

        <h2>7. Affiliate Links</h2>
        <p>Some links on our platform are affiliate links. We may earn commissions from qualifying purchases. This does not affect our editorial independence or the price you pay.</p>

        <h2>8. Limitation of Liability</h2>
        <p>AIGovHub is provided &quot;as is&quot; without warranty. We are not liable for any damages arising from the use of our tools, content, or services. Our maximum liability is limited to the amount you paid for our services.</p>

        <h2>9. Governing Law</h2>
        <p>These terms are governed by applicable law. Any disputes shall be resolved through binding arbitration.</p>

        <h2>10. Contact</h2>
        <p>Questions about these terms? Contact us at legal@aigovhub.com.</p>
      </div>
    </div>
  );
}
