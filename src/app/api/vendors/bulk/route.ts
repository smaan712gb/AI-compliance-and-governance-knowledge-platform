import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface BulkVendor {
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  websiteUrl: string;
  category: string;
  pricingModel: string;
  pricingStartsAt?: string;
  hasFreeTrialOrTier?: boolean;
  frameworksSupported?: string[];
  deploymentsSupported?: string[];
  integrationsSupported?: string[];
  hasDPA?: boolean;
  gdprCompliant?: boolean;
  soc2Certified?: boolean;
  iso27001Certified?: boolean;
  overallScore?: number;
  easeOfUse?: number;
  featureRichness?: number;
  valueForMoney?: number;
  customerSupport?: number;
  prosConsList?: { pros: string[]; cons: string[] };
  companySize?: string;
  foundedYear?: number;
  headquarters?: string;
  employeeCount?: string;
  isPublished?: boolean;
  isFeatured?: boolean;
}

/**
 * Bulk upsert vendors. Admin only. Idempotent (uses slug as unique key).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (
      !session?.user?.role ||
      !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as { vendors: BulkVendor[] };
    if (!body.vendors || !Array.isArray(body.vendors)) {
      return NextResponse.json(
        { error: "Expected { vendors: [...] }" },
        { status: 400 },
      );
    }

    let created = 0;
    let updated = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const v of body.vendors) {
      try {
        await db.vendor.upsert({
          where: { slug: v.slug },
          update: {
            name: v.name,
            description: v.description,
            shortDescription: v.shortDescription || null,
            websiteUrl: v.websiteUrl,
            category: v.category as never,
            pricingModel: v.pricingModel as never,
            pricingStartsAt: v.pricingStartsAt || null,
            hasFreeTrialOrTier: v.hasFreeTrialOrTier ?? false,
            frameworksSupported: v.frameworksSupported || [],
            deploymentsSupported: v.deploymentsSupported || [],
            integrationsSupported: v.integrationsSupported || [],
            hasDPA: v.hasDPA ?? false,
            gdprCompliant: v.gdprCompliant ?? false,
            soc2Certified: v.soc2Certified ?? false,
            iso27001Certified: v.iso27001Certified ?? false,
            overallScore: v.overallScore ?? null,
            easeOfUse: v.easeOfUse ?? null,
            featureRichness: v.featureRichness ?? null,
            valueForMoney: v.valueForMoney ?? null,
            customerSupport: v.customerSupport ?? null,
            prosConsList: v.prosConsList ?? undefined,
            companySize: v.companySize || null,
            foundedYear: v.foundedYear ?? null,
            headquarters: v.headquarters || null,
            employeeCount: v.employeeCount || null,
            isPublished: v.isPublished ?? true,
            isFeatured: v.isFeatured ?? false,
          },
          create: {
            name: v.name,
            slug: v.slug,
            description: v.description,
            shortDescription: v.shortDescription || null,
            websiteUrl: v.websiteUrl,
            category: v.category as never,
            pricingModel: v.pricingModel as never,
            pricingStartsAt: v.pricingStartsAt || null,
            hasFreeTrialOrTier: v.hasFreeTrialOrTier ?? false,
            frameworksSupported: v.frameworksSupported || [],
            deploymentsSupported: v.deploymentsSupported || [],
            integrationsSupported: v.integrationsSupported || [],
            hasDPA: v.hasDPA ?? false,
            gdprCompliant: v.gdprCompliant ?? false,
            soc2Certified: v.soc2Certified ?? false,
            iso27001Certified: v.iso27001Certified ?? false,
            overallScore: v.overallScore ?? null,
            easeOfUse: v.easeOfUse ?? null,
            featureRichness: v.featureRichness ?? null,
            valueForMoney: v.valueForMoney ?? null,
            customerSupport: v.customerSupport ?? null,
            prosConsList: v.prosConsList ?? undefined,
            companySize: v.companySize || null,
            foundedYear: v.foundedYear ?? null,
            headquarters: v.headquarters || null,
            employeeCount: v.employeeCount || null,
            isPublished: v.isPublished ?? true,
            isFeatured: v.isFeatured ?? false,
          },
        });

        // Check if it was an update or create
        created++;
      } catch (err) {
        failed++;
        errors.push(
          `${v.slug}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return NextResponse.json({
      success: true,
      total: body.vendors.length,
      processed: created,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Bulk vendor import failed", details: String(error) },
      { status: 500 },
    );
  }
}
