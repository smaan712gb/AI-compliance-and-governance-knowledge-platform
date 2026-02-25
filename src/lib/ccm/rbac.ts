import { db } from "@/lib/db";
import type { CCMOrgRole } from "@prisma/client";

type Resource =
  | "connector"
  | "rule"
  | "finding"
  | "evidence"
  | "team"
  | "settings"
  | "audit_log"
  | "report";

type Action = "create" | "read" | "update" | "delete" | "export";

/**
 * Permission matrix: which roles can perform which actions on which resources.
 */
const PERMISSIONS: Record<Resource, Partial<Record<Action, CCMOrgRole[]>>> = {
  connector: {
    create: ["OWNER", "ADMIN"],
    read: ["OWNER", "ADMIN", "ANALYST", "VIEWER", "AUDITOR"],
    update: ["OWNER", "ADMIN"],
    delete: ["OWNER", "ADMIN"],
  },
  rule: {
    create: ["OWNER", "ADMIN", "ANALYST"],
    read: ["OWNER", "ADMIN", "ANALYST", "VIEWER", "AUDITOR"],
    update: ["OWNER", "ADMIN", "ANALYST"],
    delete: ["OWNER", "ADMIN", "ANALYST"],
  },
  finding: {
    create: ["OWNER", "ADMIN", "ANALYST"],
    read: ["OWNER", "ADMIN", "ANALYST", "VIEWER", "AUDITOR"],
    update: ["OWNER", "ADMIN", "ANALYST"],
    delete: ["OWNER", "ADMIN"],
  },
  evidence: {
    create: ["OWNER", "ADMIN", "ANALYST"],
    read: ["OWNER", "ADMIN", "ANALYST", "VIEWER", "AUDITOR"],
    update: ["OWNER", "ADMIN", "ANALYST"],
    delete: ["OWNER", "ADMIN"],
    export: ["OWNER", "ADMIN", "ANALYST", "AUDITOR"],
  },
  team: {
    create: ["OWNER", "ADMIN"],
    read: ["OWNER", "ADMIN", "ANALYST"],
    update: ["OWNER", "ADMIN"],
    delete: ["OWNER", "ADMIN"],
  },
  settings: {
    read: ["OWNER", "ADMIN", "ANALYST"],
    update: ["OWNER", "ADMIN"],
  },
  audit_log: {
    read: ["OWNER", "ADMIN", "ANALYST", "VIEWER", "AUDITOR"],
  },
  report: {
    create: ["OWNER", "ADMIN", "ANALYST"],
    read: ["OWNER", "ADMIN", "ANALYST", "VIEWER", "AUDITOR"],
    export: ["OWNER", "ADMIN", "ANALYST", "AUDITOR"],
  },
};

/**
 * Check if a role has permission to perform an action on a resource.
 */
export function hasPermission(
  role: CCMOrgRole,
  resource: Resource,
  action: Action
): boolean {
  const allowed = PERMISSIONS[resource]?.[action];
  if (!allowed) return false;
  return allowed.includes(role);
}

/**
 * Get a user's membership in an organization.
 * Returns null if the user is not a member.
 */
export async function getOrgMembership(userId: string, organizationId: string) {
  return db.cCMOrganizationMember.findUnique({
    where: {
      organizationId_userId: { organizationId, userId },
    },
  });
}

/**
 * Check if a user has permission to perform an action within an organization.
 * Returns { allowed, role, membership } or { allowed: false } if not a member.
 */
export async function checkCCMPermission(
  userId: string,
  organizationId: string,
  resource: Resource,
  action: Action
): Promise<{
  allowed: boolean;
  role?: CCMOrgRole;
}> {
  const membership = await getOrgMembership(userId, organizationId);

  if (!membership || !membership.isActive) {
    return { allowed: false };
  }

  return {
    allowed: hasPermission(membership.role, resource, action),
    role: membership.role,
  };
}

/**
 * Get the user's organization from their membership.
 * Returns the first active org membership (users can belong to multiple orgs).
 */
export async function getUserOrganization(userId: string) {
  const membership = await db.cCMOrganizationMember.findFirst({
    where: { userId, isActive: true },
    include: { organization: true },
    orderBy: { invitedAt: "asc" },
  });

  if (!membership) return null;

  return {
    organization: membership.organization,
    role: membership.role,
    membership,
  };
}

/**
 * Require a minimum role level for an operation.
 * Role hierarchy: OWNER > ADMIN > ANALYST > AUDITOR > VIEWER
 */
const ROLE_HIERARCHY: Record<CCMOrgRole, number> = {
  OWNER: 50,
  ADMIN: 40,
  ANALYST: 30,
  AUDITOR: 20,
  VIEWER: 10,
};

export function meetsMinimumRole(
  userRole: CCMOrgRole,
  requiredRole: CCMOrgRole
): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}
