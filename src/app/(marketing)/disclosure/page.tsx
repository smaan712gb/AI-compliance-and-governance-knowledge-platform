import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  title: "Affiliate Disclosure",
  description: "Our affiliate relationship disclosure and how we earn revenue through vendor referrals.",
  path: "/disclosure",
});

export default function DisclosurePage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Affiliate Disclosure</h1>
      <div className="prose prose-slate max-w-none">
        <p className="text-muted-foreground mb-6">Last updated: February 2026</p>

        <h2>How We Make Money</h2>
        <p>AIGovHub earns revenue through several channels:</p>
        <ul>
          <li><strong>Digital Products:</strong> We sell compliance toolkits, questionnaire packs, and templates</li>
          <li><strong>Subscriptions:</strong> We offer monthly subscription plans for advanced features</li>
          <li><strong>Affiliate Partnerships:</strong> We earn commissions when you purchase products through our referral links</li>
        </ul>

        <h2>Affiliate Relationships</h2>
        <p>Some of the vendors listed in our database and recommended in our content are affiliate partners. When you click on certain links and make a purchase, we may receive a commission at no additional cost to you.</p>

        <h2>Editorial Independence</h2>
        <p>Our affiliate relationships do not influence our editorial content, vendor scores, or tool recommendations. Our vendor assessments are based on objective criteria including:</p>
        <ul>
          <li>Feature completeness and quality</li>
          <li>Compliance framework coverage</li>
          <li>Ease of use and implementation</li>
          <li>Pricing and value</li>
          <li>Customer support quality</li>
          <li>Industry reputation and track record</li>
        </ul>

        <h2>Identifying Affiliate Links</h2>
        <p>Affiliate links on our site are identified with:</p>
        <ul>
          <li>A disclosure notice at the top of comparison and recommendation pages</li>
          <li>The <code>rel=&quot;sponsored&quot;</code> attribute on affiliate links</li>
          <li>&quot;Visit Website&quot; buttons that lead to affiliate partner sites</li>
        </ul>

        <h2>Questions?</h2>
        <p>If you have questions about our affiliate relationships, contact us at affiliates@aigovhub.com.</p>
      </div>
    </div>
  );
}
