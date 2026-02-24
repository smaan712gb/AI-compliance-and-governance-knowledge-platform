import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

interface Props {
  params: Promise<{ id: string }>;
}

// Public fields safe to return
const PUBLIC_VENDOR_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  shortDescription: true,
  websiteUrl: true,
  logoUrl: true,
  category: true,
  subcategories: true,
  pricingModel: true,
  pricingStartsAt: true,
  pricingDetails: true,
  hasFreeTrialOrTier: true,
  frameworksSupported: true,
  deploymentsSupported: true,
  integrationsSupported: true,
  hasDPA: true,
  gdprCompliant: true,
  soc2Certified: true,
  iso27001Certified: true,
  companySize: true,
  foundedYear: true,
  headquarters: true,
  employeeCount: true,
  keyFeatures: true,
  prosConsList: true,
  overallScore: true,
  easeOfUse: true,
  featureRichness: true,
  valueForMoney: true,
  customerSupport: true,
  isFeatured: true,
  isPublished: true,
  metaDescription: true,
  createdAt: true,
  updatedAt: true,
};

export async function GET(request: NextRequest, { params }: Props) {
  const { id } = await params;
  try {
    const vendor = await db.vendor.findUnique({
      where: { id, isPublished: true },
      select: PUBLIC_VENDOR_SELECT,
    });
    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }
    return NextResponse.json(vendor);
  } catch {
    return NextResponse.json({ error: "Failed to fetch vendor" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Props) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user?.role || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const data = await request.json();

    // Strip fields that should not be set via API
    delete data.id;
    delete data.createdAt;
    delete data.updatedAt;

    const vendor = await db.vendor.update({ where: { id }, data });
    return NextResponse.json(vendor);
  } catch {
    return NextResponse.json({ error: "Failed to update vendor" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Props) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user?.role || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await db.vendor.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete vendor" }, { status: 500 });
  }
}
