"use client";

import * as React from "react";
import { Users, Loader2, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader } from "@/components/admin/admin-page-components";
import { RoleBadge } from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/utils/format";

const ADMIN_ROLES = ["verification_officer", "support_staff", "finance_admin", "super_admin"];

export default function AdminStaffPage() {
  const { session } = useAuth();
  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    const supabase = createClient();
    supabase.from("user_roles")
      .select("user_id, role, assigned_at, reason, profiles!user_roles_user_id_fkey(email, first_name, last_name, status)")
      .in("role", ADMIN_ROLES)
      .order("assigned_at", { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setRows(data ?? []);
        setLoading(false);
      });
  }, [isSupabaseAuth, session]);

  if (!isSupabaseAuth) return <div className="mx-auto max-w-5xl"><AdminPageHeader title="Staff" /><Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sign in.</CardContent></Card></div>;
  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminPageHeader eyebrow="User administration" title="Staff" description="Administrative staff and their roles. Role changes require Super Admin authorization." breadcrumbs={[{ label: "Super Admin", href: "/admin" }, { label: "Staff" }]} />
      <Card className="border-info/30 bg-info/5"><CardContent className="p-3 text-xs text-info">
        <ShieldCheck className="mr-1 inline h-3.5 w-3.5" /> Role assignment and suspension are managed via the <Link href="/admin/users" className="underline">Users</Link> page with Super Admin authorization. This page is read-only.
      </CardContent></Card>
      {error ? <Card className="border-destructive/40 bg-destructive/5"><CardContent className="p-4 text-sm text-destructive">{error}</CardContent></Card> : rows.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No staff members found.</CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <ul className="divide-y divide-border">
            {rows.map((r) => {
              const p = r.profiles;
              return (
                <li key={`${r.user_id}-${r.role}`} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2"><p className="font-medium">{p?.first_name ?? ""} {p?.last_name ?? ""}</p><RoleBadge role={r.role as any} active={p?.status === "active"} /></div>
                    <p className="text-xs text-muted-foreground">{p?.email ?? "—"} · Assigned {formatRelativeTime(r.assigned_at)}</p>
                    {r.reason && <p className="text-xs italic text-muted-foreground">Reason: {r.reason}</p>}
                  </div>
                  <Badge variant="outline" className={p?.status === "active" ? "text-success" : "text-destructive"}>{p?.status ?? "—"}</Badge>
                </li>
              );
            })}
          </ul>
        </CardContent></Card>
      )}
    </div>
  );
}

import Link from "next/link";
