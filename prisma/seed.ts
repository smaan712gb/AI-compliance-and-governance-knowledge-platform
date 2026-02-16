import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create admin user
  const hashedPassword = await bcrypt.hash("Admin2026!", 12);
  const admin = await db.user.upsert({
    where: { email: "admin@aigovhub.com" },
    update: {},
    create: {
      email: "admin@aigovhub.com",
      name: "Admin",
      hashedPassword,
      role: "SUPER_ADMIN",
    },
  });
  console.log("Admin user created:", admin.email);

  // Seed digital products
  const products = [
    {
      name: "AI Act Starter Toolkit",
      slug: "ai-act-starter-toolkit",
      description:
        "Essential templates and checklists for EU AI Act compliance. Includes risk classification worksheet, basic obligations checklist, AI policy template, compliance timeline tracker, and a basic DPIA template. Perfect for small teams getting started with AI governance.",
      shortDescription: "Essential templates and checklists for EU AI Act compliance",
      price: 4900,
      type: "ONE_TIME" as const,
      category: "AI_ACT_TOOLKIT" as const,
      features: [
        "Risk classification worksheet",
        "Basic obligations checklist",
        "AI policy template",
        "Compliance timeline tracker",
        "DPIA template (basic)",
      ],
      isActive: true,
      isFeatured: false,
    },
    {
      name: "AI Act Professional Toolkit",
      slug: "ai-act-pro-toolkit",
      description:
        "Comprehensive EU AI Act compliance package with legal-reviewed templates. Includes everything in the Starter Toolkit plus detailed FRIA template, technical documentation framework, quality management system template, post-market monitoring plan, conformity assessment guide, incident reporting procedures, human oversight protocols, and vendor AI governance clause templates.",
      shortDescription: "Comprehensive EU AI Act compliance package with legal-reviewed templates",
      price: 19900,
      compareAtPrice: 29900,
      type: "ONE_TIME" as const,
      category: "AI_ACT_TOOLKIT" as const,
      features: [
        "Everything in Starter, plus:",
        "Detailed FRIA template",
        "Technical documentation framework",
        "Quality management system template",
        "Post-market monitoring plan",
        "Conformity assessment guide",
        "Incident reporting procedures",
        "Human oversight protocols",
        "Vendor AI governance clause templates",
      ],
      isActive: true,
      isFeatured: true,
    },
    {
      name: "Security Questionnaire Basic Pack",
      slug: "questionnaire-basic-pack",
      description:
        "SOC 2 and ISO 27001 mapped questionnaire templates with 500+ pre-written answers specifically for AI systems. Includes vendor assessment template and editable formats.",
      shortDescription: "SOC 2 & ISO 27001 mapped questionnaires with 500+ pre-written answers",
      price: 9900,
      type: "ONE_TIME" as const,
      category: "SECURITY_QUESTIONNAIRE" as const,
      features: [
        "500+ pre-written answers",
        "SOC 2 Trust Criteria mapping",
        "ISO 27001 Annex A mapping",
        "AI-specific security controls",
        "Vendor assessment template",
        "Editable Word/Excel formats",
      ],
      isActive: true,
      isFeatured: false,
    },
    {
      name: "Security Questionnaire Enterprise Pack",
      slug: "questionnaire-enterprise-pack",
      description:
        "Complete security questionnaire automation with HIPAA, PCI DSS, NIST AI RMF, NIST CSF 2.0, and custom framework support. Includes 1000+ pre-written answers, evidence artifact templates, model card templates, and data flow diagrams.",
      shortDescription: "Complete security questionnaire automation for all major frameworks",
      price: 49900,
      compareAtPrice: 69900,
      type: "ONE_TIME" as const,
      category: "SECURITY_QUESTIONNAIRE" as const,
      features: [
        "Everything in Basic Pack, plus:",
        "1000+ pre-written answers",
        "HIPAA mapping",
        "PCI DSS mapping",
        "NIST AI RMF mapping",
        "NIST CSF 2.0 mapping",
        "Custom questionnaire builder",
        "Evidence artifact templates",
        "Model card templates",
        "Data flow diagrams",
      ],
      isActive: true,
      isFeatured: true,
    },
  ];

  for (const product of products) {
    await db.digitalProduct.upsert({
      where: { slug: product.slug },
      update: product,
      create: product,
    });
  }
  console.log(`${products.length} products seeded`);

  // Seed vendors
  const vendors = [
    {
      name: "OneTrust",
      slug: "onetrust",
      description:
        "OneTrust is a comprehensive trust intelligence platform that helps organizations manage privacy, security, data governance, GRC, third-party risk, ethics & compliance, and ESG programs. Their AI Governance module helps organizations inventory AI systems, assess risks, and manage compliance with emerging AI regulations including the EU AI Act.",
      shortDescription: "Comprehensive trust intelligence platform with AI governance capabilities",
      websiteUrl: "https://www.onetrust.com",
      category: "AI_GOVERNANCE_PLATFORM" as const,
      pricingModel: "ENTERPRISE_ONLY" as const,
      pricingStartsAt: "Contact Sales",
      hasFreeTrialOrTier: false,
      frameworksSupported: ["EU_AI_ACT", "SOC2", "ISO27001", "NIST_AI_RMF", "GDPR", "HIPAA", "PCI_DSS"],
      deploymentsSupported: ["cloud"],
      integrationsSupported: ["Jira", "ServiceNow", "Slack", "Salesforce"],
      hasDPA: true,
      gdprCompliant: true,
      soc2Certified: true,
      iso27001Certified: true,
      overallScore: 8.5,
      easeOfUse: 7.5,
      featureRichness: 9.5,
      valueForMoney: 6.5,
      customerSupport: 8.0,
      prosConsList: {
        pros: [
          "Most comprehensive feature set in the market",
          "Strong EU AI Act specific capabilities",
          "Extensive integration ecosystem",
          "Excellent regulatory intelligence",
        ],
        cons: [
          "Complex setup and implementation",
          "Expensive for smaller organizations",
          "Steep learning curve",
          "Can be overwhelming for simple use cases",
        ],
      },
      companySize: "enterprise",
      foundedYear: 2016,
      headquarters: "Atlanta, GA, USA",
      employeeCount: "2000+",
      isPublished: true,
      isFeatured: true,
    },
    {
      name: "Credo AI",
      slug: "credo-ai",
      description:
        "Credo AI is an AI governance platform purpose-built for responsible AI. It provides AI risk assessment, policy management, compliance tracking, and oversight tools specifically designed for the EU AI Act and other AI-specific regulations. Credo AI helps organizations implement responsible AI practices at scale.",
      shortDescription: "Purpose-built AI governance platform for responsible AI at scale",
      websiteUrl: "https://www.credo.ai",
      category: "AI_GOVERNANCE_PLATFORM" as const,
      pricingModel: "CONTACT_SALES" as const,
      pricingStartsAt: "Contact Sales",
      hasFreeTrialOrTier: true,
      frameworksSupported: ["EU_AI_ACT", "NIST_AI_RMF", "ISO42001"],
      deploymentsSupported: ["cloud"],
      integrationsSupported: ["MLflow", "GitHub", "Jira"],
      hasDPA: true,
      gdprCompliant: true,
      soc2Certified: true,
      iso27001Certified: false,
      overallScore: 8.8,
      easeOfUse: 8.5,
      featureRichness: 9.0,
      valueForMoney: 7.5,
      customerSupport: 8.5,
      prosConsList: {
        pros: [
          "Purpose-built for AI governance (not retrofitted)",
          "Strong EU AI Act compliance features",
          "Good MLOps integrations",
          "Clean, intuitive interface",
        ],
        cons: [
          "Relatively new company",
          "Smaller ecosystem than enterprise GRC tools",
          "Pricing not transparent",
        ],
      },
      companySize: "mid-market",
      foundedYear: 2020,
      headquarters: "San Francisco, CA, USA",
      employeeCount: "50-200",
      isPublished: true,
      isFeatured: true,
    },
    {
      name: "Vanta",
      slug: "vanta",
      description:
        "Vanta automates SOC 2, ISO 27001, HIPAA, PCI DSS, and GDPR compliance. While not specifically AI-focused, Vanta's continuous monitoring and automated evidence collection is highly relevant for AI companies needing to demonstrate security and compliance posture to customers and regulators.",
      shortDescription: "Automated compliance for SOC 2, ISO 27001, HIPAA, and more",
      websiteUrl: "https://www.vanta.com",
      category: "GRC_PLATFORM" as const,
      pricingModel: "SUBSCRIPTION" as const,
      pricingStartsAt: "$4,000/year",
      hasFreeTrialOrTier: true,
      frameworksSupported: ["SOC2", "ISO27001", "HIPAA", "PCI_DSS", "GDPR"],
      deploymentsSupported: ["cloud"],
      integrationsSupported: ["AWS", "GCP", "Azure", "GitHub", "Jira", "Slack"],
      hasDPA: true,
      gdprCompliant: true,
      soc2Certified: true,
      iso27001Certified: true,
      overallScore: 8.7,
      easeOfUse: 9.0,
      featureRichness: 8.5,
      valueForMoney: 8.0,
      customerSupport: 8.5,
      prosConsList: {
        pros: [
          "Excellent automation and ease of use",
          "Fast time to compliance",
          "Great integrations with cloud providers",
          "Transparent pricing",
        ],
        cons: [
          "Not AI-specific governance",
          "Limited EU AI Act support",
          "Can be expensive for startups",
        ],
      },
      companySize: "startup",
      foundedYear: 2018,
      headquarters: "San Francisco, CA, USA",
      employeeCount: "500-1000",
      isPublished: true,
      isFeatured: true,
    },
    {
      name: "Holistic AI",
      slug: "holistic-ai",
      description:
        "Holistic AI provides an end-to-end AI governance, risk, and compliance platform. Their tools cover AI auditing, bias detection, risk management, and regulatory compliance including the EU AI Act. They also offer consulting services for complex compliance projects.",
      shortDescription: "End-to-end AI governance, risk, and compliance platform",
      websiteUrl: "https://www.holisticai.com",
      category: "AI_GOVERNANCE_PLATFORM" as const,
      pricingModel: "CONTACT_SALES" as const,
      pricingStartsAt: "Contact Sales",
      hasFreeTrialOrTier: true,
      frameworksSupported: ["EU_AI_ACT", "NIST_AI_RMF", "ISO42001", "NYC_LL144"],
      deploymentsSupported: ["cloud", "on-prem"],
      integrationsSupported: ["Python SDK", "REST API"],
      hasDPA: true,
      gdprCompliant: true,
      soc2Certified: true,
      iso27001Certified: true,
      overallScore: 8.3,
      easeOfUse: 7.5,
      featureRichness: 8.5,
      valueForMoney: 7.5,
      customerSupport: 8.0,
      prosConsList: {
        pros: [
          "Strong AI-specific audit capabilities",
          "Excellent bias detection tools",
          "Academic research backing",
          "Flexible deployment options",
        ],
        cons: [
          "Pricing not transparent",
          "UI could be more polished",
          "Fewer integrations than competitors",
        ],
      },
      companySize: "mid-market",
      foundedYear: 2018,
      headquarters: "London, UK",
      employeeCount: "50-200",
      isPublished: true,
      isFeatured: false,
    },
    {
      name: "IBM OpenPages",
      slug: "ibm-openpages",
      description:
        "IBM OpenPages is an enterprise GRC platform with AI-powered risk management capabilities. Part of IBM's broader AI governance strategy, OpenPages offers model risk management, regulatory compliance tracking, and AI lifecycle governance for large enterprises.",
      shortDescription: "Enterprise GRC platform with AI-powered risk management",
      websiteUrl: "https://www.ibm.com/products/openpages",
      category: "GRC_PLATFORM" as const,
      pricingModel: "ENTERPRISE_ONLY" as const,
      pricingStartsAt: "Contact Sales",
      hasFreeTrialOrTier: true,
      frameworksSupported: ["SOC2", "ISO27001", "NIST_AI_RMF", "Basel", "EU_AI_ACT"],
      deploymentsSupported: ["cloud", "on-prem", "hybrid"],
      integrationsSupported: ["IBM Cloud", "Watson", "ServiceNow"],
      hasDPA: true,
      gdprCompliant: true,
      soc2Certified: true,
      iso27001Certified: true,
      overallScore: 7.8,
      easeOfUse: 6.5,
      featureRichness: 9.0,
      valueForMoney: 6.0,
      customerSupport: 7.5,
      prosConsList: {
        pros: [
          "Enterprise-grade scalability",
          "Deep IBM ecosystem integration",
          "Comprehensive model risk management",
          "Strong in regulated industries (banking, insurance)",
        ],
        cons: [
          "Complex and expensive",
          "IBM ecosystem dependency",
          "Steep learning curve",
          "Overkill for smaller organizations",
        ],
      },
      companySize: "enterprise",
      foundedYear: 2004,
      headquarters: "Armonk, NY, USA",
      employeeCount: "10000+",
      isPublished: true,
      isFeatured: false,
    },
  ];

  for (const vendor of vendors) {
    await db.vendor.upsert({
      where: { slug: vendor.slug },
      update: vendor,
      create: vendor,
    });
  }
  console.log(`${vendors.length} vendors seeded`);

  // Seed email sequence
  const sequence = await db.emailSequence.upsert({
    where: { slug: "welcome-funnel" },
    update: {},
    create: {
      name: "Welcome Funnel",
      slug: "welcome-funnel",
      description: "5-email drip sequence for new subscribers",
      isActive: true,
    },
  });

  const steps = [
    {
      stepNumber: 1,
      subject: "Welcome to AIGovHub + Your Free Checklist",
      templateId: "welcome",
      delayHours: 0,
    },
    {
      stepNumber: 2,
      subject: "3 AI Compliance Mistakes That Cost Companies Millions",
      templateId: "drip-1-intro",
      delayHours: 48,
    },
    {
      stepNumber: 3,
      subject: "How [Company] Achieved EU AI Act Compliance in 6 Weeks",
      templateId: "drip-2-value",
      delayHours: 96,
    },
    {
      stepNumber: 4,
      subject: "Your AI Compliance Toolkit (Special Offer Inside)",
      templateId: "drip-3-case-study",
      delayHours: 168,
    },
    {
      stepNumber: 5,
      subject: "EU AI Act Deadline: Are You Ready? (Last Chance)",
      templateId: "drip-4-offer",
      delayHours: 240,
    },
  ];

  for (const step of steps) {
    await db.emailSequenceStep.upsert({
      where: {
        sequenceId_stepNumber: {
          sequenceId: sequence.id,
          stepNumber: step.stepNumber,
        },
      },
      update: step,
      create: { ...step, sequenceId: sequence.id },
    });
  }
  console.log("Email sequence seeded");

  // Seed agent sources (RSS feeds for autonomous content pipeline)
  const agentSources = [
    {
      name: "EU AI Act Official",
      url: "https://artificialintelligenceact.eu/feed/",
      type: "REGULATORY_BODY" as const,
      category: "regulation",
    },
    {
      name: "NIST AI",
      url: "https://www.nist.gov/artificial-intelligence/rss.xml",
      type: "REGULATORY_BODY" as const,
      category: "framework-update",
    },
    {
      name: "MIT Technology Review - AI",
      url: "https://www.technologyreview.com/topic/artificial-intelligence/feed",
      type: "RSS_FEED" as const,
      category: "research",
    },
    {
      name: "TechCrunch - AI",
      url: "https://techcrunch.com/category/artificial-intelligence/feed/",
      type: "RSS_FEED" as const,
      category: "vendor-news",
    },
    {
      name: "The Verge - AI",
      url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
      type: "RSS_FEED" as const,
      category: "vendor-news",
    },
    {
      name: "OECD AI Policy Observatory",
      url: "https://oecd.ai/en/feed",
      type: "REGULATORY_BODY" as const,
      category: "regulation",
    },
    {
      name: "ICO UK Blog",
      url: "https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/rss/",
      type: "REGULATORY_BODY" as const,
      category: "regulation",
    },
    {
      name: "OneTrust Blog",
      url: "https://www.onetrust.com/blog/feed/",
      type: "RSS_FEED" as const,
      category: "vendor-news",
    },
    {
      name: "IAPP - Privacy",
      url: "https://iapp.org/rss/",
      type: "INDUSTRY_REPORT" as const,
      category: "best-practice",
    },
    {
      name: "Brookings - AI",
      url: "https://www.brookings.edu/topic/artificial-intelligence/feed/",
      type: "RESEARCH_PAPER" as const,
      category: "research",
    },
    {
      name: "Stanford HAI",
      url: "https://hai.stanford.edu/news/rss.xml",
      type: "RESEARCH_PAPER" as const,
      category: "research",
    },
    {
      name: "VentureBeat - AI",
      url: "https://venturebeat.com/category/ai/feed/",
      type: "RSS_FEED" as const,
      category: "vendor-news",
    },
    {
      name: "European Commission Digital",
      url: "https://digital-strategy.ec.europa.eu/en/rss.xml",
      type: "REGULATORY_BODY" as const,
      category: "regulation",
    },
    {
      name: "Responsible AI Institute",
      url: "https://www.responsible.ai/feed/",
      type: "INDUSTRY_REPORT" as const,
      category: "best-practice",
    },
    {
      name: "Wired - AI",
      url: "https://www.wired.com/feed/tag/ai/latest/rss",
      type: "RSS_FEED" as const,
      category: "vendor-news",
    },
  ];

  for (const source of agentSources) {
    await db.agentSource.upsert({
      where: {
        id: `seed-${source.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
      },
      update: { ...source },
      create: {
        id: `seed-${source.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
        ...source,
      },
    });
  }
  console.log(`${agentSources.length} agent sources seeded`);

  // Seed default agent settings
  const defaultSettings = [
    { key: "enabled", value: true, description: "Master switch for the agent pipeline" },
    { key: "dailyArticleTarget", value: 2, description: "Number of articles to produce per pipeline run" },
    { key: "maxRewriteAttempts", value: 2, description: "Maximum rewrites before rejection" },
    { key: "minQAScore", value: 7.0, description: "Minimum QA score for approval (1-10)" },
    { key: "budgetLimitUsd", value: 5.0, description: "Maximum cost per pipeline run in USD" },
  ];

  for (const setting of defaultSettings) {
    await db.agentSettings.upsert({
      where: { key: setting.key },
      update: {},
      create: {
        key: setting.key,
        value: setting.value as never,
        description: setting.description,
      },
    });
  }
  console.log("Agent settings seeded");

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
