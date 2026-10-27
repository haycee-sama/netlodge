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
import { AuditTimeline } from "@/components/admin/audit-timeline";
import { RoleBadge } from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { getRepositories } from "@/lib/repositories";
import type { User, UserRole, AuditLog } from "@/lib/types";
import { USER_ROLES, roleLabel } from "@/lib/types";
import { formatRelativeTime, formatDateTime } from "@/lib/utils/format";
import { toast } from "sonner";

export default function AdminUserDetailPage() {
  const params = useParams<{ userId: string }>();
  const { session } = useAuth();
  const [user, setUser] = React.useState<User | null>(null);
  const [auditLogs, setAuditLogs] = React.useState<AuditLog[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  // Action state
  const [newRole, setNewRole] = React.useState<UserRole>("student");
  const [roleReason, setRoleReason] = React.useState("");
  const [suspendReason, setSuspendReason] = React.useState("");
  const [reactivateReason, setReactivateReason] = React.useState("");

  const actorId = session?.userId ?? "dev_super_admin_1";
  const isSelf = user?.id === actorId;

  React.useEffect(() => {
    if (!params.userId) return;
    Promise.all([
      getRepositories().users.getById(params.userId),
      getRepositories().auditLogs.list({ resourceType: "user", resourceId: params.userId, pageSize: 50 }),
    ]).then(([u, a]) => {
      setUser(u); if (u) setNewRole(u.role);
      setAuditLogs(a.items); setLoading(false);
    });
  }, [params.userId]);

  async function refresh() {
    if (!user) return;
    const u = await getRepositories().users.getById(user.id);
    setUser(u);
    const a = await getRepositories().auditLogs.list({ resourceType: "user", resourceId: user.id, pageSize: 50 });
    setAuditLogs(a.items);
  }

  async function handleRoleChange() {
    if (!user) return;
    if (newRole === user.role) { toast.error("Select a different role"); return; }
    if (!roleReason.trim()) { toast.error("A reason is required for role changes"); return; }
    setSubmitting(true);
    try {
      await getRepositories().users.updateRole(user.id, { actorId, newRole, reason: roleReason });
      toast.success("Role updated", { description: `${user.email} is now a ${roleLabel(newRole)}.` });
      setRoleReason("");
      await refresh();
    } catch (e) {
      toast.error("Could not change role", { description: e instanceof Error ? e.message : "Please try again." });
    } finally { setSubmitting(false); }
  }

  async function handleSuspend() {
    if (!user) return;
    if (!suspendReason.trim()) { toast.error("A suspension reason is required"); return; }
    setSubmitting(true);
    try {
      await getRepositories().users.deactivate(user.id, { actorId, reason: suspendReason });
      toast.success("Account suspended", { description: `${user.email} can no longer sign in.` });
      setSuspendReason("");
      await refresh();
    } catch (e) {
      toast.error("Could not suspend", { description: e instanceof Error ? e.message : "Please try again." });
    } finally { setSubmitting(false); }
  }

  async function handleReactivate() {
    if (!user) return;
    setSubmitting(true);
    try {
      await getRepositories().users.reactivate(user.id, { actorId, reason: reactivateReason || "Reactivated by admin." });
      toast.success("Account reactivated");
      setReactivateReason("");
      await refresh();
    } catch (e) {
      toast.error("Could not reactivate", { description: e instanceof Error ? e.message : "Please try again." });
    } finally { setSubmitting(false); }
  }

  if (loading) return <div className="mx-auto max-w-5xl"><p className="text-sm text-muted-foreground">Loading user…</p></div>;
  if (!user) return (
    <div className="mx-auto max-w-5xl">
      <AdminPageHeader title="User not found" breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Not found" }]} />
      <Button asChild variant="outline"><Link href="/admin/users">Back to users</Link></Button>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Button asChild variant="ghost" size="sm"><Link href="/admin/users"><ArrowLeft className="mr-2 h-4 w-4" aria-hidden /> Back to users</Link></Button>
      <AdminPageHeader
        eyebrow={user.email}
        title={`${user.firstName} ${user.lastName}`}
        description={`Member since ${formatRelativeTime(user.createdAt)}`}
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Users", href: "/admin/users" }, { label: user.email }]}
        actions={<RoleBadge role={user.role} active={user.active} />}
      />
      <DemoModeBanner />

      {isSelf && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="flex items-start gap-2 p-3 text-xs text-warning-foreground">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>You are viewing your own account. Be careful — suspending yourself will lock you out.</span>
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
                <div className="flex justify-between"><span className="text-muted-foreground">Joined</span><span>{formatDateTime(user.createdAt)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Last seen</span><span>{user.lastSeenAt ? formatRelativeTime(user.lastSeenAt) : "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Email verified</span><Badge variant="outline" className={user.emailVerified ? "text-success" : "text-warning-foreground"}>{user.emailVerified ? "Yes" : "No"}</Badge></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Status</span>{user.active ? <Badge variant="outline" className="text-success">Active</Badge> : <Badge variant="outline" className="text-destructive">Suspended</Badge>}</div>
                {user.deactivatedAt && <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">Suspended {formatRelativeTime(user.deactivatedAt)} — {user.statusReason}</div>}
                {user.roleUpdatedAt && <div className="text-xs text-muted-foreground">Role last changed {formatRelativeTime(user.roleUpdatedAt)}</div>}
              </CardContent>
            </Card>

            {/* Role change */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><UserCog className="h-4 w-4 text-primary" aria-hidden />Change role</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label>New role</Label>
                  <Select value={newRole} onValueChange={(v) => setNewRole(v as UserRole)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {USER_ROLES.map((r) => <SelectItem key={r} value={r}>{roleLabel(r)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="roleReason">Reason (required)</Label>
                  <Textarea id="roleReason" rows={2} placeholder="e.g. Promoted to support staff after training." value={roleReason} onChange={(e) => setRoleReason(e.target.value)} />
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="w-full" disabled={submitting || newRole === user.role || !roleReason.trim()}>
                      <UserCog className="mr-2 h-4 w-4" aria-hidden /> Change role
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Change {user.email}'s role to {roleLabel(newRole)}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will grant the user all permissions associated with the {roleLabel(newRole)} role. The change is audit-logged. {user.role === "super_admin" && newRole !== "super_admin" && "Warning: demoting a super administrator."}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleRoleChange} disabled={submitting}>
                        {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden />}
                        Confirm role change
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>

            {/* Suspend / reactivate */}
            <Card className={user.active ? "border-destructive/30" : "border-success/30"}>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base">
                {user.active ? <><UserX className="h-4 w-4 text-destructive" aria-hidden /> Suspend account</> : <><UserCheck className="h-4 w-4 text-success" aria-hidden /> Reactivate account</>}
              </CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {user.active ? (
                  <>
                    <p className="text-xs text-muted-foreground">Suspension prevents the user from signing in. A reason is required and will be audit-logged.</p>
                    <div className="space-y-1.5">
                      <Label htmlFor="suspendReason">Reason (required)</Label>
                      <Textarea id="suspendReason" rows={2} placeholder="e.g. Off-platform payment solicitation." value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} />
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={submitting || !suspendReason.trim()}>
                          <UserX className="mr-2 h-4 w-4" aria-hidden /> Suspend
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Suspend {user.email}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            The user will be immediately signed out and unable to sign in. {user.role === "super_admin" && "Warning: you are suspending a super administrator."}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleSuspend} disabled={submitting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <UserX className="mr-2 h-4 w-4" aria-hidden />}
                            Confirm suspension
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">Reactivate the account to allow the user to sign in again.</p>
                    <div className="space-y-1.5">
                      <Label htmlFor="reactivateReason">Reason (optional)</Label>
                      <Textarea id="reactivateReason" rows={2} value={reactivateReason} onChange={(e) => setReactivateReason(e.target.value)} />
                    </div>
                    <Button className="w-full" onClick={handleReactivate} disabled={submitting}>
                      {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <UserCheck className="mr-2 h-4 w-4" aria-hidden />}
                      Reactivate
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </>
        }
      >
        {/* Audit timeline */}
        <AuditTimeline logs={auditLogs} title="Account activity" emptyMessage="No activity recorded for this user." />

        {/* Security notice */}
        <Card className="border-info/30 bg-info/5">
          <CardContent className="flex items-start gap-2 p-4 text-sm">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-info" aria-hidden />
            <div>
              <p className="font-medium">Security note</p>
              <p className="text-xs text-muted-foreground">
                In production, role changes and suspensions require reauthentication (re-entering your password) and are enforced by Supabase Row-Level Security policies. The last active super administrator cannot be demoted or suspended.
              </p>
            </div>
          </CardContent>
        </Card>
      </DetailLayout>
    </div>
  );
}
