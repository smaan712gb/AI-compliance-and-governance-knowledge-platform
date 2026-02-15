import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const createVendorSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().min(1),
  shortDescription: z.string().optional().nullable(),
  websiteUrl: z.string().url(),
  category: z.string(),
  pricingModel: z.string(),
  pricingStartsAt: z.string().optional().nullable(),
  hasFreeTrialOrTier: z.boolean().optional(),
  frameworksSupported: z.array(z.string()).optional(),
  overallScore: z.number().min(1).max(10).optional().nullable(),
  hasDPA: z.boolean().optional(),
  gdprCompliant: z.boolean().optional(),
  soc2Certified: z.boolean().optional(),
  iso27001Certified: z.boolean().optional(),
  affiliateUrl: z.string().url().optional().nullable().or(z.literal("")),
  isPublished: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const framework = searchParams.get("framework");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where: Prisma.VendorWhereInput = { isPublished: true };

  if (category) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (where as any).category = category;
  }
  if (framework) {
    where.frameworksSupported = { has: framework };
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const [vendors, total] = await Promise.all([
    db.vendor.findMany({
      where,
      orderBy: [{ isFeatured: "desc" }, { overallScore: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.vendor.count({
      where,
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: vendors,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !["ADMIN", "SUPER_ADMIN"].includes(session.user?.role || "")) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
      { status: 401 }
    );
  }

  const body = await req.json();
  const parsed = createVendorSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten().fieldErrors } },
      { status: 400 }
    );
  }

  const data = parsed.data;

  const vendor = await db.vendor.create({
    data: {
      name: data.name,
      slug: data.slug,
      description: data.description,
      shortDescription: data.shortDescription || null,
      websiteUrl: data.websiteUrl,
      category: data.category as Parameters<typeof db.vendor.create>[0]["data"]["category"],
      pricingModel: data.pricingModel as Parameters<typeof db.vendor.create>[0]["data"]["pricingModel"],
      pricingStartsAt: data.pricingStartsAt || null,
      hasFreeTrialOrTier: data.hasFreeTrialOrTier || false,
      frameworksSupported: data.frameworksSupported || [],
      overallScore: data.overallScore || null,
      hasDPA: data.hasDPA || false,
      gdprCompliant: data.gdprCompliant || false,
      soc2Certified: data.soc2Certified || false,
      iso27001Certified: data.iso27001Certified || false,
      affiliateUrl: data.affiliateUrl || null,
      isPublished: data.isPublished || false,
    },
  });

  return NextResponse.json({ success: true, data: vendor }, { status: 201 });
}
