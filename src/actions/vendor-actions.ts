"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function deleteVendor(vendorId: string) {
  const session = await auth();
  if (!session?.user?.role || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }

  await db.vendor.delete({ where: { id: vendorId } });
  revalidatePath("/admin/vendors");
  revalidatePath("/vendors");
}

export async function toggleVendorFeatured(vendorId: string) {
  const session = await auth();
  if (!session?.user?.role || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }

  const vendor = await db.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) throw new Error("Vendor not found");

  await db.vendor.update({
    where: { id: vendorId },
    data: { isFeatured: !vendor.isFeatured },
  });

  revalidatePath("/admin/vendors");
  revalidatePath("/vendors");
}
