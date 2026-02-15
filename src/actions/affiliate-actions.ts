"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createAffiliateLink(data: {
  vendorId?: string;
  partnerName: string;
  trackingCode: string;
  destinationUrl: string;
}) {
  const session = await auth();
  if (!session?.user?.role || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }

  const link = await db.affiliateLink.create({
    data: {
      vendorId: data.vendorId || null,
      partnerName: data.partnerName,
      trackingCode: data.trackingCode,
      destinationUrl: data.destinationUrl,
      isActive: true,
    },
  });

  revalidatePath("/admin/affiliates");
  return link;
}

export async function toggleAffiliateLink(linkId: string) {
  const session = await auth();
  if (!session?.user?.role || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }

  const link = await db.affiliateLink.findUnique({ where: { id: linkId } });
  if (!link) throw new Error("Link not found");

  await db.affiliateLink.update({
    where: { id: linkId },
    data: { isActive: !link.isActive },
  });

  revalidatePath("/admin/affiliates");
}
