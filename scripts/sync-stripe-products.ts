/**
 * Sync Stripe products/prices with local database.
 * Run: npx tsx scripts/sync-stripe-products.ts
 */

import Stripe from "stripe";
import { PrismaClient, ProductType, ProductCategory } from "@prisma/client";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia" as Stripe.LatestApiVersion,
});
const prisma = new PrismaClient();

const PRODUCTS_TO_SYNC = [
  {
    name: "AI Act Starter Toolkit",
    slug: "ai-act-starter-toolkit",
    description:
      "Essential EU AI Act compliance templates, checklists, and risk assessment frameworks to get your organization started.",
    price: 4900, // cents
    type: ProductType.ONE_TIME,
    category: ProductCategory.AI_ACT_TOOLKIT,
  },
  {
    name: "AI Act Pro Toolkit",
    slug: "ai-act-pro-toolkit",
    description:
      "Complete EU AI Act compliance suite with advanced templates, technical documentation frameworks, and implementation guides.",
    price: 19900,
    type: ProductType.ONE_TIME,
    category: ProductCategory.AI_ACT_TOOLKIT,
  },
  {
    name: "Questionnaire Basic Pack",
    slug: "questionnaire-basic-pack",
    description:
      "50+ vendor risk questionnaire templates covering SOC2, ISO 27001, GDPR, and AI governance frameworks.",
    price: 9900,
    type: ProductType.ONE_TIME,
    category: ProductCategory.SECURITY_QUESTIONNAIRE,
  },
  {
    name: "Questionnaire Enterprise Pack",
    slug: "questionnaire-enterprise-pack",
    description:
      "200+ comprehensive vendor risk questionnaires with scoring rubrics, red flag guides, and automated analysis templates.",
    price: 49900,
    type: ProductType.ONE_TIME,
    category: ProductCategory.SECURITY_QUESTIONNAIRE,
  },
];

async function main() {
  console.log("Syncing products with Stripe...\n");

  for (const product of PRODUCTS_TO_SYNC) {
    console.log(`Processing: ${product.name}`);

    // Check if product exists in Stripe
    const existingProducts = await stripe.products.search({
      query: `metadata["slug"]:"${product.slug}"`,
    });

    let stripeProduct: Stripe.Product;
    let stripePrice: Stripe.Price;

    if (existingProducts.data.length > 0) {
      stripeProduct = existingProducts.data[0];
      console.log(`  Found existing Stripe product: ${stripeProduct.id}`);

      // Get the default price
      const prices = await stripe.prices.list({
        product: stripeProduct.id,
        active: true,
      });
      stripePrice = prices.data[0];
    } else {
      // Create product in Stripe
      stripeProduct = await stripe.products.create({
        name: product.name,
        description: product.description,
        metadata: { slug: product.slug },
      });
      console.log(`  Created Stripe product: ${stripeProduct.id}`);

      // Create price
      stripePrice = await stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: product.price,
        currency: "usd",
      });
      console.log(`  Created Stripe price: ${stripePrice.id}`);
    }

    // Upsert in database
    await prisma.digitalProduct.upsert({
      where: { slug: product.slug },
      create: {
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.price,
        type: product.type,
        category: product.category,
        stripePriceId: stripePrice.id,
        isActive: true,
      },
      update: {
        stripePriceId: stripePrice.id,
        price: product.price,
        name: product.name,
        description: product.description,
      },
    });

    console.log(`  Synced to database.\n`);
  }

  // Sync subscription tiers
  const SUBSCRIPTIONS = [
    { name: "Starter Plan", interval: "month" as const, price: 1900, envKey: "STRIPE_PRICE_SUB_STARTER" },
    { name: "Professional Plan", interval: "month" as const, price: 4900, envKey: "STRIPE_PRICE_SUB_PRO" },
    { name: "Enterprise Plan", interval: "month" as const, price: 9900, envKey: "STRIPE_PRICE_SUB_ENTERPRISE" },
  ];

  console.log("Syncing subscription prices...\n");
  for (const sub of SUBSCRIPTIONS) {
    const existingProducts = await stripe.products.search({
      query: `name:"${sub.name}"`,
    });

    let stripeProduct: Stripe.Product;
    if (existingProducts.data.length > 0) {
      stripeProduct = existingProducts.data[0];
    } else {
      stripeProduct = await stripe.products.create({ name: sub.name });
    }

    const prices = await stripe.prices.list({
      product: stripeProduct.id,
      active: true,
    });

    let stripePrice = prices.data.find(
      (p) => p.unit_amount === sub.price && p.recurring?.interval === sub.interval
    );

    if (!stripePrice) {
      stripePrice = await stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: sub.price,
        currency: "usd",
        recurring: { interval: sub.interval },
      });
    }

    console.log(`  ${sub.name}: ${stripePrice.id}`);
    console.log(`  Set ${sub.envKey}=${stripePrice.id} in your .env\n`);
  }

  // ── CCM Subscription Tiers ──────────────────────────────────────────────────
  const CCM_SUBSCRIPTIONS = [
    {
      name: "CCM Starter",
      slug: "ccm-starter",
      description: "Continuous controls monitoring for 1 ERP connector. Includes SOX framework, 25 rules, 100 AI analyses/month.",
      interval: "month" as const,
      price: 49900, // $499.00
      envKey: "STRIPE_PRICE_CCM_STARTER",
    },
    {
      name: "CCM Professional",
      slug: "ccm-professional",
      description: "Up to 3 ERP connectors. SOX + PCI DSS + AML/BSA frameworks, 100 rules, 500 AI analyses/month, BYOK LLM.",
      interval: "month" as const,
      price: 149900, // $1,499.00
      envKey: "STRIPE_PRICE_CCM_PRO",
    },
    {
      name: "CCM Enterprise",
      slug: "ccm-enterprise",
      description: "Unlimited connectors, all 8 compliance frameworks, unlimited AI analyses, BYOK + self-hosted LLM, dedicated CSM.",
      interval: "month" as const,
      price: 499900, // $4,999.00
      envKey: "STRIPE_PRICE_CCM_ENTERPRISE",
    },
  ];

  console.log("Syncing CCM subscription tiers...\n");

  const ccmPriceIds: Record<string, string> = {};

  for (const sub of CCM_SUBSCRIPTIONS) {
    const existingProducts = await stripe.products.search({
      query: `metadata["slug"]:"${sub.slug}"`,
    });

    let stripeProduct: Stripe.Product;
    if (existingProducts.data.length > 0) {
      stripeProduct = existingProducts.data[0];
      console.log(`  Found existing: ${sub.name} (${stripeProduct.id})`);
    } else {
      stripeProduct = await stripe.products.create({
        name: sub.name,
        description: sub.description,
        metadata: { slug: sub.slug, product: "ccm" },
      });
      console.log(`  Created: ${sub.name} (${stripeProduct.id})`);
    }

    const prices = await stripe.prices.list({ product: stripeProduct.id, active: true });
    let stripePrice = prices.data.find(
      (p) => p.unit_amount === sub.price && p.recurring?.interval === sub.interval
    );

    if (!stripePrice) {
      stripePrice = await stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: sub.price,
        currency: "usd",
        recurring: { interval: sub.interval },
        metadata: { slug: sub.slug, product: "ccm" },
      });
      console.log(`  Created price: ${stripePrice.id} ($${sub.price / 100}/mo)`);
    } else {
      console.log(`  Existing price: ${stripePrice.id} ($${sub.price / 100}/mo)`);
    }

    ccmPriceIds[sub.envKey] = stripePrice.id;
    console.log(`  ${sub.envKey}=${stripePrice.id}\n`);
  }

  // Auto-update .env file with CCM price IDs
  const fs = await import("fs");
  const path = await import("path");
  const envPath = path.join(process.cwd(), ".env");

  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, "utf8");
    for (const [key, value] of Object.entries(ccmPriceIds)) {
      const regex = new RegExp(`^${key}=.*$`, "m");
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}="${value}"`);
      } else {
        envContent += `\n${key}="${value}"`;
      }
    }
    fs.writeFileSync(envPath, envContent, "utf8");
    console.log("✅ .env updated with CCM price IDs.\n");
  } else {
    console.log("⚠️  .env not found — add these manually:\n");
    for (const [key, value] of Object.entries(ccmPriceIds)) {
      console.log(`  ${key}="${value}"`);
    }
  }

  console.log("✅ Sync complete!");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
