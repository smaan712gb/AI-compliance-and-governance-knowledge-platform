export const SUBSCRIPTION_TIERS = {
  STARTER: {
    name: "Starter",
    price: 19,
    stripePriceId: process.env.STRIPE_PRICE_SUB_STARTER!,
    features: [
      "10 AI compliance checks/month",
      "5 questionnaire generations/month",
      "Basic vendor database access",
      "Email support",
    ],
  },
  PROFESSIONAL: {
    name: "Professional",
    price: 49,
    stripePriceId: process.env.STRIPE_PRICE_SUB_PRO!,
    features: [
      "Unlimited AI compliance checks",
      "Unlimited questionnaire generations",
      "Full vendor database + comparisons",
      "Priority email support",
      "Downloadable PDF reports",
      "Custom questionnaire templates",
    ],
  },
  ENTERPRISE: {
    name: "Enterprise",
    price: 99,
    stripePriceId: process.env.STRIPE_PRICE_SUB_ENTERPRISE!,
    features: [
      "Everything in Professional",
      "Team access (up to 10 users)",
      "API access",
      "Custom compliance frameworks",
      "Dedicated account manager",
      "White-label reports",
      "SSO integration",
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
