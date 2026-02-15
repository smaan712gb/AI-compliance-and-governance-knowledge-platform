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

  console.log("Sync complete!");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
