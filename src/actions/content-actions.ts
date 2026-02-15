"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function deleteContent(contentId: string) {
  const session = await auth();
  if (!session?.user?.role || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }

  await db.contentPage.delete({ where: { id: contentId } });
  revalidatePath("/admin/content");
}

export async function publishContent(contentId: string) {
  const session = await auth();
  if (!session?.user?.role || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }

  await db.contentPage.update({
    where: { id: contentId },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });

  revalidatePath("/admin/content");
  revalidatePath("/blog");
}

export async function unpublishContent(contentId: string) {
  const session = await auth();
  if (!session?.user?.role || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }

  await db.contentPage.update({
    where: { id: contentId },
    data: { status: "DRAFT" },
  });

  revalidatePath("/admin/content");
}
