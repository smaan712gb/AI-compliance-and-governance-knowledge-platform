export const mainNavItems = [
  {
    title: "Tools",
    items: [
      {
        title: "AI Act Compliance Checker",
        href: "/ai-act-checker",
        description: "Check your AI system's EU AI Act obligations",
      },
      {
        title: "Vendor Risk Questionnaire",
        href: "/vendor-risk-questionnaire",
        description: "Generate AI vendor due diligence questionnaires",
      },
    ],
  },
  {
    title: "Vendor Tracker",
    href: "/vendors",
  },
  {
    title: "Resources",
    items: [
      {
        title: "Blog",
        href: "/blog",
        description: "AI governance insights and updates",
      },
      {
        title: "Guides",
        href: "/guides",
        description: "In-depth compliance guides",
      },
      {
        title: "Best Tools",
        href: "/best",
        description: "Curated tool comparisons",
      },
    ],
  },
  {
    title: "Products",
    href: "/products",
  },
  {
    title: "Pricing",
    href: "/pricing",
  },
] as const;

export const adminNavItems = [
  { title: "Dashboard", href: "/admin" },
  { title: "Content", href: "/admin/content" },
  { title: "Vendors", href: "/admin/vendors" },
  { title: "Products", href: "/admin/products" },
  { title: "Subscribers", href: "/admin/subscribers" },
  { title: "Affiliates", href: "/admin/affiliates" },
  { title: "Agent Pipeline", href: "/admin/agents" },
  { title: "Analytics", href: "/admin/analytics" },
] as const;

export const footerNavItems = {
  tools: [
    { title: "AI Act Checker", href: "/ai-act-checker" },
    { title: "Questionnaire Generator", href: "/vendor-risk-questionnaire" },
    { title: "Vendor Tracker", href: "/vendors" },
  ],
  resources: [
    { title: "Blog", href: "/blog" },
    { title: "Guides", href: "/guides" },
    { title: "Best Tools", href: "/best" },
  ],
  company: [
    { title: "About", href: "/about" },
    { title: "Pricing", href: "/pricing" },
    { title: "How We Evaluate", href: "/how-we-evaluate" },
    { title: "Contact", href: "/contact" },
  ],
  legal: [
    { title: "Privacy Policy", href: "/privacy" },
    { title: "Terms of Service", href: "/terms" },
    { title: "Affiliate Disclosure", href: "/disclosure" },
  ],
};
