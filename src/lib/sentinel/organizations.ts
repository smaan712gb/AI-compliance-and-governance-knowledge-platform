// ============================================
// SENTINEL — Organization & Multi-Tenancy
// ============================================

import { db } from "@/lib/db";
import type { SentinelOrgRole } from "@prisma/client";

// ---- RBAC Permission Matrix ----

const ROLE_HIERARCHY: Record<SentinelOrgRole, number> = {
  VIEWER: 0,
  ANALYST: 1,
  MANAGER: 2,
  ADMIN: 3,
};

export function hasRole(
  userRole: SentinelOrgRole,
  requiredRole: SentinelOrgRole,
): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

// ---- Organization CRUD ----

export async function createOrganization(params: {
  name: string;
  slug: string;
  industry?: string;
  createdByUserId: string;
}) {
  return db.$transaction(async (tx) => {
    const org = await tx.sentinelOrganization.create({
      data: {
        name: params.name,
        slug: params.slug,
        industry: params.industry,
      },
    });

    // Creator becomes ADMIN
    await tx.sentinelOrgMember.create({
      data: {
        organizationId: org.id,
        userId: params.createdByUserId,
        role: "ADMIN",
      },
    });

    return org;
  });
}

export async function getOrganization(id: string) {
  return db.sentinelOrganization.findUnique({
    where: { id },
    include: {
      members: {
        where: { isActive: true },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      _count: {
        select: {
          members: { where: { isActive: true } },
          auditLogs: true,
          webhooks: { where: { isActive: true } },
        },
      },
    },
  });
}

export async function getUserOrganizations(userId: string) {
  const memberships = await db.sentinelOrgMember.findMany({
    where: { userId, isActive: true },
    include: {
      organization: {
        include: {
          _count: {
            select: { members: { where: { isActive: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return memberships.map((m) => ({
    ...m.organization,
    role: m.role,
    memberCount: m.organization._count.members,
  }));
}

// ---- Member Management ----

export async function inviteMember(params: {
  organizationId: string;
  userId: string;
  role: SentinelOrgRole;
  invitedBy: string;
}) {
  // Check seat limit
  const org = await db.sentinelOrganization.findUnique({
    where: { id: params.organizationId },
    select: { maxSeats: true, _count: { select: { members: { where: { isActive: true } } } } },
  });

  if (!org) throw new Error("Organization not found");
  if (org._count.members >= org.maxSeats) {
    throw new Error(`Seat limit reached (${org.maxSeats}). Upgrade plan for more seats.`);
  }

  return db.sentinelOrgMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: params.organizationId,
        userId: params.userId,
      },
    },
    create: {
      organizationId: params.organizationId,
      userId: params.userId,
      role: params.role,
      invitedBy: params.invitedBy,
    },
    update: {
      role: params.role,
      isActive: true,
    },
  });
}

export async function updateMemberRole(params: {
  organizationId: string;
  memberId: string;
  newRole: SentinelOrgRole;
}) {
  // Prevent downgrading last ADMIN
  if (params.newRole !== "ADMIN") {
    const adminCount = await db.sentinelOrgMember.count({
      where: {
        organizationId: params.organizationId,
        role: "ADMIN",
        isActive: true,
        id: { not: params.memberId },
      },
    });

    if (adminCount === 0) {
      throw new Error("Cannot downgrade the last admin");
    }
  }

  return db.sentinelOrgMember.update({
    where: { id: params.memberId },
    data: { role: params.newRole },
  });
}

export async function removeMember(params: {
  organizationId: string;
  memberId: string;
}) {
  // Prevent removing last ADMIN
  const member = await db.sentinelOrgMember.findUnique({
    where: { id: params.memberId },
    select: { role: true },
  });

  if (member?.role === "ADMIN") {
    const adminCount = await db.sentinelOrgMember.count({
      where: {
        organizationId: params.organizationId,
        role: "ADMIN",
        isActive: true,
        id: { not: params.memberId },
      },
    });
    if (adminCount === 0) {
      throw new Error("Cannot remove the last admin");
    }
  }

  return db.sentinelOrgMember.update({
    where: { id: params.memberId },
    data: { isActive: false },
  });
}

// ---- Authorization Helper ----

export async function getUserOrgMembership(
  userId: string,
  organizationId: string,
) {
  return db.sentinelOrgMember.findUnique({
    where: {
      organizationId_userId: { organizationId, userId },
    },
    select: { id: true, role: true, isActive: true },
  });
}

export async function authorizeOrgAction(
  userId: string,
  organizationId: string,
  requiredRole: SentinelOrgRole,
): Promise<{ authorized: boolean; role?: SentinelOrgRole; error?: string }> {
  const membership = await getUserOrgMembership(userId, organizationId);

  if (!membership || !membership.isActive) {
    return { authorized: false, error: "Not a member of this organization" };
  }

  if (!hasRole(membership.role, requiredRole)) {
    return {
      authorized: false,
      role: membership.role,
      error: `Requires ${requiredRole} role or higher`,
    };
  }

  return { authorized: true, role: membership.role };
}
