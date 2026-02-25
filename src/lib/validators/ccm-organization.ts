import { z } from "zod";

export const createOrganizationSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters").max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  headquarters: z.string().optional(),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  headquarters: z.string().optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email("Valid email is required"),
  role: z.enum(["ADMIN", "ANALYST", "VIEWER", "AUDITOR"]),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(["OWNER", "ADMIN", "ANALYST", "VIEWER", "AUDITOR"]),
});
