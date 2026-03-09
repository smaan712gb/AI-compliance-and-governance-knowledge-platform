"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Building2,
  Plus,
  Users,
  Shield,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
  UserPlus,
  Trash2,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ---------- Types ----------

interface Organization {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  role: "VIEWER" | "ANALYST" | "MANAGER" | "ADMIN";
  memberCount: number;
  createdAt: string;
}

interface Member {
  id: string;
  role: "VIEWER" | "ANALYST" | "MANAGER" | "ADMIN";
  isActive: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

// ---------- Constants ----------

const ROLES = ["VIEWER", "ANALYST", "MANAGER", "ADMIN"] as const;
type Role = (typeof ROLES)[number];

const ROLE_COLORS: Record<Role, string> = {
  VIEWER: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  ANALYST: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  MANAGER:
    "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  ADMIN:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
};

const INDUSTRIES = [
  "Financial Services",
  "Healthcare",
  "Technology",
  "Manufacturing",
  "Energy & Utilities",
  "Retail & E-Commerce",
  "Government",
  "Defense & Aerospace",
  "Telecommunications",
  "Consulting",
  "Legal",
  "Education",
  "Other",
];

// ---------- Helpers ----------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function RoleBadge({ role }: { role: Role }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[role]}`}
    >
      {role === "ADMIN" && <Crown className="h-3 w-3" />}
      {role}
    </span>
  );
}

// ---------- Create Organization Modal ----------

function CreateOrgModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [industry, setIndustry] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function handleNameChange(val: string) {
    setName(val);
    if (!slugEdited) setSlug(slugify(val));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !slug.trim()) {
      setError("Name and slug are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/sentinel/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          ...(industry ? { industry } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to create organization.");
        return;
      }
      onCreated();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Create Organization</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Organization Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Acme Corporation"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              maxLength={200}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugEdited(true);
              }}
              placeholder="acme-corporation"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Lowercase letters, numbers, and hyphens only
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Industry</label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Select industry (optional)</option>
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Organization"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------- Invite Member Form ----------

function InviteMemberForm({
  orgId,
  onInvited,
}: {
  orgId: string;
  onInvited: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("VIEWER");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/sentinel/organizations/${orgId}/members`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: email.trim(), role }),
        },
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to invite member.");
        return;
      }
      setSuccess("Member invited successfully.");
      setEmail("");
      setRole("VIEWER");
      onInvited();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-[200px]">
        <label className="block text-xs font-medium text-muted-foreground mb-1">
          User ID or Email
        </label>
        <input
          type="text"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError("");
            setSuccess("");
          }}
          placeholder="user@example.com"
          className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>
      <div className="w-36">
        <label className="block text-xs font-medium text-muted-foreground mb-1">
          Role
        </label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      <Button
        type="submit"
        size="sm"
        disabled={submitting}
        className="bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <UserPlus className="h-4 w-4 mr-1" />
            Invite
          </>
        )}
      </Button>
      {error && (
        <p className="w-full text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {success && (
        <p className="w-full text-xs text-emerald-600 dark:text-emerald-400">
          {success}
        </p>
      )}
    </form>
  );
}

// ---------- Member Row ----------

function MemberRow({
  member,
  orgId,
  currentUserRole,
  onUpdated,
}: {
  member: Member;
  orgId: string;
  currentUserRole: Role;
  onUpdated: () => void;
}) {
  const [changingRole, setChangingRole] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [loading, setLoading] = useState(false);

  const isAdmin = currentUserRole === "ADMIN";

  async function handleRoleChange(newRole: Role) {
    setChangingRole(false);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/sentinel/organizations/${orgId}/members`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId: member.id, newRole }),
        },
      );
      if (!res.ok) {
        const json = await res.json();
        alert(json.error || "Failed to update role.");
        return;
      }
      onUpdated();
    } catch {
      alert("Network error.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove() {
    setConfirmRemove(false);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/sentinel/organizations/${orgId}/members`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId: member.id }),
        },
      );
      if (!res.ok) {
        const json = await res.json();
        alert(json.error || "Failed to remove member.");
        return;
      }
      onUpdated();
    } catch {
      alert("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-between py-3 px-4 hover:bg-muted/50 rounded-md">
      <div className="flex items-center gap-3 min-w-0">
        {member.user.image ? (
          <img
            src={member.user.image}
            alt=""
            className="h-8 w-8 rounded-full"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-xs font-medium text-emerald-700 dark:text-emerald-300">
            {(member.user.name || member.user.email || "?")
              .charAt(0)
              .toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">
            {member.user.name || "Unnamed User"}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {member.user.email}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <>
            {isAdmin && !changingRole ? (
              <button
                onClick={() => setChangingRole(true)}
                className="hover:opacity-80 transition-opacity"
              >
                <RoleBadge role={member.role} />
              </button>
            ) : (
              <RoleBadge role={member.role} />
            )}

            {changingRole && (
              <div className="flex items-center gap-1">
                {ROLES.map((r) => (
                  <button
                    key={r}
                    onClick={() => handleRoleChange(r)}
                    className={`text-xs px-2 py-1 rounded border transition-colors ${
                      r === member.role
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950"
                        : "border-border hover:border-emerald-300"
                    }`}
                  >
                    {r}
                  </button>
                ))}
                <button
                  onClick={() => setChangingRole(false)}
                  className="text-muted-foreground hover:text-foreground ml-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {isAdmin && !confirmRemove && (
              <button
                onClick={() => setConfirmRemove(true)}
                className="text-muted-foreground hover:text-red-600 transition-colors ml-2"
                title="Remove member"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}

            {confirmRemove && (
              <div className="flex items-center gap-1 ml-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleRemove}
                  className="h-7 text-xs"
                >
                  Confirm
                </Button>
                <button
                  onClick={() => setConfirmRemove(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ---------- Organization Detail Panel ----------

function OrgDetail({
  org,
  onMembersChanged,
}: {
  org: Organization;
  onMembersChanged: () => void;
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/sentinel/organizations/${org.id}/members`,
      );
      const json = await res.json();
      if (json.data) setMembers(json.data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [org.id]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  function handleRefresh() {
    fetchMembers();
    onMembersChanged();
  }

  return (
    <div className="mt-4 border-t pt-4 space-y-4">
      {/* Members List */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-emerald-500" />
          <h3 className="text-sm font-semibold">
            Members ({members.length})
          </h3>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading members...
          </div>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No active members found.
          </p>
        ) : (
          <div className="space-y-1">
            {members.map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                orgId={org.id}
                currentUserRole={org.role}
                onUpdated={handleRefresh}
              />
            ))}
          </div>
        )}
      </div>

      {/* Invite Form — only shown for ADMINs */}
      {org.role === "ADMIN" && (
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-emerald-500" />
            Invite Member
          </h3>
          <InviteMemberForm orgId={org.id} onInvited={handleRefresh} />
        </div>
      )}
    </div>
  );
}

// ---------- Main Page ----------

export default function SentinelOrganizationsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedOrgId, setExpandedOrgId] = useState<string | null>(null);

  const fetchOrgs = useCallback(async () => {
    try {
      const res = await fetch("/api/sentinel/organizations");
      const json = await res.json();
      if (json.data) setOrgs(json.data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);

  function handleCreated() {
    setShowCreate(false);
    fetchOrgs();
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Organizations</h1>
          <p className="text-muted-foreground">
            Manage your Sentinel organizations and team members
          </p>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Organization
        </Button>
      </div>

      {/* Empty State */}
      {orgs.length === 0 && (
        <div className="rounded-lg border bg-card p-12 text-center">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <h2 className="text-lg font-semibold mb-2">No organizations yet</h2>
          <p className="text-muted-foreground mb-6">
            Create one to start collaborating.
          </p>
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Organization
          </Button>
        </div>
      )}

      {/* Organization Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {orgs.map((org) => {
          const isExpanded = expandedOrgId === org.id;
          return (
            <div
              key={org.id}
              className="rounded-lg border bg-card p-6 hover:shadow-md transition-shadow"
            >
              {/* Card Header */}
              <div
                className="flex items-start justify-between cursor-pointer"
                onClick={() =>
                  setExpandedOrgId(isExpanded ? null : org.id)
                }
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{org.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {org.slug}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <RoleBadge role={org.role} />
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Card Meta */}
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                {org.industry && (
                  <span className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    {org.industry}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {org.memberCount}{" "}
                  {org.memberCount === 1 ? "member" : "members"}
                </span>
              </div>

              {/* Expanded Detail */}
              {isExpanded && (
                <OrgDetail org={org} onMembersChanged={fetchOrgs} />
              )}
            </div>
          );
        })}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <CreateOrgModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
