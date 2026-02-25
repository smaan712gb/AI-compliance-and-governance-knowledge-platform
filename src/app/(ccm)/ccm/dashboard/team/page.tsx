"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Users, Plus, Loader2 } from "lucide-react";

interface Member {
  id: string;
  role: string;
  isActive: boolean;
  invitedAt: string;
  acceptedAt: string | null;
  user: { id: string; name: string | null; email: string | null; image: string | null };
}

const ROLES = ["ADMIN", "ANALYST", "VIEWER", "AUDITOR"];

const roleDescriptions: Record<string, string> = {
  OWNER: "Full access, manages billing",
  ADMIN: "Full access, manages team",
  ANALYST: "Create rules, manage findings",
  VIEWER: "Read-only access",
  AUDITOR: "Read + export evidence",
};

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", role: "ANALYST" });

  useEffect(() => {
    fetch("/api/ccm/members")
      .then((r) => r.json())
      .then((res) => setMembers(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleInvite() {
    setInviting(true);
    setError("");
    try {
      const res = await fetch("/api/ccm/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to invite");
        return;
      }
      // Refresh member list
      const refreshRes = await fetch("/api/ccm/members");
      const refreshData = await refreshRes.json();
      setMembers(refreshData.data || []);
      setDialogOpen(false);
      setForm({ email: "", role: "ANALYST" });
    } catch {
      setError("An error occurred");
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(memberId: string, role: string) {
    try {
      await fetch("/api/ccm/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, role }),
      });
      setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role } : m)));
    } catch {}
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
          <p className="text-muted-foreground">Manage your organization members and roles</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Invite Member</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>The user must have an AIGovHub account</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input type="email" placeholder="user@company.com" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm((p) => ({ ...p, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        <div>
                          <span className="font-medium">{r}</span>
                          <span className="text-muted-foreground ml-2">— {roleDescriptions[r]}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {error && (
                <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
              )}
              <Button className="w-full" onClick={handleInvite} disabled={inviting || !form.email}>
                {inviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Invitation
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Role Legend */}
      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
            {Object.entries(roleDescriptions).map(([role, desc]) => (
              <div key={role} className="rounded border p-2">
                <Badge variant="outline" className="mb-1">{role}</Badge>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Members List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="py-4"><div className="h-12 bg-muted rounded" /></CardContent>
            </Card>
          ))}
        </div>
      ) : members.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No Team Members</h3>
        </Card>
      ) : (
        <div className="space-y-3">
          {members.map((member) => (
            <Card key={member.id}>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                  {member.user.name?.[0]?.toUpperCase() || member.user.email?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{member.user.name || "Unnamed"}</h3>
                  <p className="text-sm text-muted-foreground truncate">{member.user.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  {member.role === "OWNER" ? (
                    <Badge>OWNER</Badge>
                  ) : (
                    <Select value={member.role} onValueChange={(v) => handleRoleChange(member.id, v)}>
                      <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  )}
                  <span className="text-xs text-muted-foreground">
                    Joined {new Date(member.acceptedAt || member.invitedAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
