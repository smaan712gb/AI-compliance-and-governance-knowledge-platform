export const SUBSCRIPTION_TIERS = {
  STARTER: {
    name: "Starter",
    price: 99,
    stripePriceId: process.env.STRIPE_PRICE_SUB_STARTER!,
    features: [
      "3 jurisdiction trackers",
      "5 vendor assessments/month",
      "10 policy mappings + 5 incident assessments",
      "AI Inventory (10 systems) + Risk Register (25)",
      "Full privacy toolkit (DSAR, ROPA, DPA)",
      "Priority email support",
    ],
  },
  PROFESSIONAL: {
    name: "Professional",
    price: 499,
    stripePriceId: process.env.STRIPE_PRICE_SUB_PRO!,
    features: [
      "Everything in Starter",
      "10 jurisdiction trackers",
      "25 vendor assessments/month",
      "ERP compliance gap analysis",
      "10 board reports/month",
      "AI system & risk analysis (25/mo)",
      "50 policy mappings + unlimited risk entries",
    ],
  },
  ENTERPRISE: {
    name: "Enterprise",
    price: 2000,
    stripePriceId: process.env.STRIPE_PRICE_SUB_ENTERPRISE!,
    features: [
      "Everything in Professional",
      "Unlimited jurisdictions & vendor assessments",
      "Unlimited GRC tools & AI analysis",
      "API access (1,000 req/day)",
      "SSO & SAML",
      "Custom reports & integrations",
      "Dedicated support",
    ],
  },
} as const;

export const PRODUCTS = {
  AI_ACT_STARTER: {
    name: "AI Act Starter Toolkit",
    slug: "ai-act-starter-toolkit",
    price: 49,
    stripePriceId: process.env.STRIPE_PRICE_STARTER_TOOLKIT!,
  },
  AI_ACT_PRO: {
    name: "AI Act Pro Toolkit",
    slug: "ai-act-pro-toolkit",
    price: 199,
    stripePriceId: process.env.STRIPE_PRICE_PRO_TOOLKIT!,
  },
  QUESTIONNAIRE_BASIC: {
    name: "Questionnaire Basic Pack",
    slug: "questionnaire-basic-pack",
    price: 99,
    stripePriceId: process.env.STRIPE_PRICE_Q_BASIC!,
  },
  QUESTIONNAIRE_ENTERPRISE: {
    name: "Questionnaire Enterprise Pack",
    slug: "questionnaire-enterprise-pack",
    price: 499,
    stripePriceId: process.env.STRIPE_PRICE_Q_ENTERPRISE!,
  },
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;
