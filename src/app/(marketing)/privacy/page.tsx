import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  title: "Privacy Policy",
  description: "Learn how AIGovHub collects, uses, and protects your personal information.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
      <div className="prose prose-slate max-w-none">
        <p className="text-muted-foreground mb-6">Last updated: February 2026</p>

        <h2>1. Information We Collect</h2>
        <p>We collect information you provide directly, including:</p>
        <ul>
          <li>Account information (name, email, password)</li>
          <li>Payment information (processed securely through Stripe)</li>
          <li>AI compliance check inputs and results</li>
          <li>Email subscription preferences</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <p>We use your information to:</p>
        <ul>
          <li>Provide and improve our compliance tools and services</li>
          <li>Process payments and deliver digital products</li>
          <li>Send relevant email communications (with your consent)</li>
          <li>Analyze usage patterns to improve the platform</li>
        </ul>

        <h2>3. Data Sharing</h2>
        <p>We do not sell your personal information. We share data only with:</p>
        <ul>
          <li>Service providers (Stripe for payments, Resend for email)</li>
          <li>AI providers (DeepSeek for compliance analysis — inputs are not stored by the provider)</li>
          <li>Analytics services to improve our platform</li>
        </ul>

        <h2>4. Data Security</h2>
        <p>We implement industry-standard security measures including encryption in transit and at rest, access controls, and regular security audits.</p>

        <h2>5. Your Rights</h2>
        <p>Under GDPR and similar regulations, you have the right to:</p>
        <ul>
          <li>Access your personal data</li>
          <li>Correct inaccurate data</li>
          <li>Delete your account and associated data</li>
          <li>Export your data</li>
          <li>Opt out of marketing communications</li>
        </ul>

        <h2>6. Cookies</h2>
        <p>We use essential cookies for authentication and preferences. Analytics cookies are used with your consent to improve our services.</p>

        <h2>7. Contact Us</h2>
        <p>For privacy-related questions, contact us at privacy@aigovhub.com.</p>
      </div>
    </div>
  );
}
