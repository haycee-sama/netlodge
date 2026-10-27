"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, ShieldCheck, UserCog, AlertTriangle, Loader2, CheckCircle2, UserX, UserCheck } from "lucide-react";
import { AdminPageHeader, DemoModeBanner, DetailLayout } from "@/components/admin/admin-page-components";
import { RoleBadge } from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { USER_ROLES, roleLabel } from "@/lib/types";
import { formatRelativeTime, formatDateTime } from "@/lib/utils/format";
import { toast } from "sonner";

interface AdminUserDetail {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  status: string;
  status_reason: string | null;
  created_at: string;
  updated_at: string;
  roles: string[];
  last_seen_at: string | null;
  audit_logs: AuditLogRow[];
}

interface AuditLogRow {
  id: string;
  timestamp: string;
  actor_email: string;
  actor_role: string;
  category: string;
  action: string;
  summary: string;
  severity: string;
}

export default function AdminUserDetailPage() {
  const params = useParams<{ userId: string }>();
  const { session } = useAuth();
  const [user, setUser] = React.useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState<null | string>(null);

  const [newRole, setNewRole] = React.useState<string>("student");
  const [roleReason, setRoleReason] = React.useState("");
  const [suspendReason, setSuspendReason] = React.useState("");
  const [reactivateReason, setReactivateReason] = React.useState("");

  const isSupabaseAuth = session?.authenticated === true;
  const isSelf = user?.id === session?.userId;

  const fetchUser = React.useCallback(async () => {
    if (!params.userId || !isSupabaseAuth) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${params.userId}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load user");
      } else {
        setUser(data);
        if (data.roles?.[0]) setNewRole(data.roles[0]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [params.userId, isSupabaseAuth]);

  React.useEffect(() => { fetchUser(); }, [fetchUser]);

  async function handleRoleChange() {
    if (!user) return;
    if (newRole === user.roles[0]) { toast.error("Select a different role"); return; }
    if (!roleReason.trim()) { toast.error("A reason is required for role changes"); return; }
    if (isSelf) { toast.error("You cannot change your own role"); return; }
    setSubmitting("role");
    try {
      const res = await fetch(`/api/admin/users/${user.id}/role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ newRole, reason: roleReason }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error("Could not change role", { description: data.error }); return; }
      toast.success("Role updated", { description: `${user.email} is now a ${roleLabel(newRole as any)}.` });
      setRoleReason("");
      await fetchUser();
    } catch (e) {
      toast.error("Network error", { description: e instanceof Error ? e.message : "" });
    } finally { setSubmitting(null); }
  }

  async function handleSuspend() {
    if (!user) return;
    if (!suspendReason.trim()) { toast.error("A suspension reason is required"); return; }
    if (isSelf) { toast.error("You cannot suspend your own account"); return; }
    setSubmitting("suspend");
    try {
      const res = await fetch(`/api/admin/users/${user.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ active: false, reason: suspendReason }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error("Could not suspend", { description: data.error }); return; }
      toast.success("Account suspended", { description: `${user.email} can no longer sign in.` });
      setSuspendReason("");
      await fetchUser();
    } catch (e) {
      toast.error("Network error");
    } finally { setSubmitting(null); }
  }

  async function handleReactivate() {
    if (!user) return;
    setSubmitting("reactivate");
    try {
      const res = await fetch(`/api/admin/users/${user.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ active: true, reason: reactivateReason || "Reactivated by admin." }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error("Could not reactivate", { description: data.error }); return; }
      toast.success("Account reactivated");
      setReactivateReason("");
      await fetchUser();
    } catch (e) {
      toast.error("Network error");
    } finally { setSubmitting(null); }
  }

  if (!isSupabaseAuth) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <AdminPageHeader title="User details" />
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
          Sign in with a real Super Admin account to view user details.
        </CardContent></Card>
      </div>
    );
  }

  if (loading) return <div className="mx-auto max-w-5xl"><div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></div>;

  if (error || !user) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Button asChild variant="ghost" size="sm"><Link href="/admin/users"><ArrowLeft className="mr-2 h-4 w-4" /> Back to users</Link></Button>
        <AdminPageHeader title="User not found" />
        <Card><CardContent className="p-6 text-center text-sm text-destructive">
          {error || "This user does not exist or you don't have permission to view them."}
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Button asChild variant="ghost" size="sm"><Link href="/admin/users"><ArrowLeft className="mr-2 h-4 w-4" aria-hidden /> Back to users</Link></Button>
      <AdminPageHeader
        eyebrow={user.email}
        title={`${user.first_name} ${user.last_name}`}
        description={`Member since ${formatRelativeTime(user.created_at)}`}
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Users", href: "/admin/users" }, { label: user.email }]}
        actions={
          <>
            {user.roles.map((r) => <RoleBadge key={r} role={r as any} active={user.status === "active"} />)}
            {user.status === "suspended" && <Badge variant="outline" className="text-destructive">Suspended</Badge>}
          </>
        }
      />
      <DemoModeBanner message="Live data — role changes and suspensions are protected by SECURITY DEFINER RPCs (set_user_role, set_user_active_status) with last-super-admin guards." />

      {isSelf && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="flex items-start gap-2 p-3 text-xs text-warning-foreground">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>You are viewing your own account. The RPCs will reject self-modification attempts server-side.</span>
          </CardContent>
        </Card>
      )}

      <DetailLayout
        sidebar={
          <>
            {/* Account info */}
            <Card>
              <CardHeader><CardTitle className="text-base">Account</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="text-xs">{user.email}</span></div>
                {user.phone && <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span className="text-xs">{user.phone}</span></div>}
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Joined</span><span>{formatDateTime(user.created_at)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Status</span>
                  {user.status === "active"
                    ? <Badge variant="outline" className="text-success">Active</Badge>
                    : <Badge variant="outline" className="text-destructive">Suspended</Badge>}
                </div>
                {user.status === "suspended" && user.status_reason && (
                  <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">Reason: {user.status_reason}</div>
                )}
              </CardContent>
            </Card>

            {/* Role change */}
            {!isSelf && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><UserCog className="h-4 w-4 text-primary" aria-hidden /> Change role</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {USER_ROLES.map((r) => <SelectItem key={r} value={r}>{roleLabel(r)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="space-y-1">
                    <Label htmlFor="roleReason">Reason (required)</Label>
                    <Textarea id="roleReason" value={roleReason} onChange={(e) => setRoleReason(e.target.value)} rows={2} placeholder="e.g. Promoted to handle increased verification load" />
                  </div>
                  <Button className="w-full" onClick={handleRoleChange} disabled={submitting === "role" || newRole === user.roles[0]}>
                    {submitting === "role" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                    Apply role change
                  </Button>
                  <p className="text-xs text-muted-foreground">Server-side guard: cannot demote the last active super_admin.</p>
                </CardContent>
              </Card>
            )}

            {/* Suspend / reactivate */}
            {!isSelf && user.status === "active" && (
              <AlertDialog>
                <CardHeader className="pb-0"><CardTitle className="text-base">Account status</CardTitle></CardHeader>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full border-destructive/40 text-destructive hover:bg-destructive/10">
                    <UserX className="mr-2 h-4 w-4" /> Suspend account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Suspend {user.email}?</AlertDialogTitle>
                    <AlertDialogDescription>The user will no longer be able to sign in. This action is audit-logged with critical severity.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-2">
                    <Label htmlFor="suspendReason">Reason (required)</Label>
                    <Textarea id="suspendReason" value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} rows={3} placeholder="e.g. Policy violation — fraudulent listings" />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setSuspendReason("")}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSuspend} disabled={submitting === "suspend" || !suspendReason.trim()}>
                      {submitting === "suspend" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Confirm suspension
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {!isSelf && user.status === "suspended" && (
              <Card>
                <CardHeader><CardTitle className="text-base">Account status</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <Textarea value={reactivateReason} onChange={(e) => setReactivateReason(e.target.value)} rows={2} placeholder="Reason (optional)…" />
                  <Button className="w-full" onClick={handleReactivate} disabled={submitting === "reactivate"}>
                    {submitting === "reactivate" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserCheck className="mr-2 h-4 w-4" />}
                    Reactivate account
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        }
      >
        {/* Audit timeline */}
        <Card>
          <CardHeader><CardTitle className="text-base">Audit history ({user.audit_logs.length})</CardTitle></CardHeader>
          <CardContent>
            {user.audit_logs.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No audit events recorded for this user.</p>
            ) : (
              <ol className="relative space-y-4 border-l border-border pl-4">
                {user.audit_logs.map((a) => (
                  <li key={a.id} className="space-y-1">
                    <span className={`absolute -left-1.5 h-3 w-3 rounded-full ${a.severity === "critical" ? "bg-destructive" : a.severity === "warning" ? "bg-warning-foreground" : "bg-primary"}`} />
                    <p className="text-xs text-muted-foreground">{a.actor_email} ({a.actor_role}) · {formatDateTime(a.timestamp)}</p>
                    <p className="text-sm font-medium">{a.action}</p>
                    <p className="text-xs text-muted-foreground">{a.summary}</p>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </DetailLayout>
    </div>
  );
}
