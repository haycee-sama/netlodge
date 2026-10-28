"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Users, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader } from "@/components/admin/admin-page-components";
import { RoleBadge } from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/utils/format";

export default function AdminSupportCustomersPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    const supabase = createClient();
    // Get users who have support tickets
    supabase.from("support_tickets")
      .select("user_id, profiles!inner(id, email, first_name, last_name, status, created_at)")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        // Deduplicate by user_id
        const seen = new Set<string>();
        const unique = (data ?? []).filter((t: any) => {
          if (seen.has(t.user_id)) return false;
          seen.add(t.user_id);
          return true;
        }).map((t: any) => t.profiles);
        setRows(unique);
        setLoading(false);
      });
  }, [isSupabaseAuth, session]);

  if (!isSupabaseAuth) return <div className="mx-auto max-w-5xl"><AdminPageHeader title="Customers" /><Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sign in.</CardContent></Card></div>;
  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminPageHeader eyebrow="Support operations" title="Customers" description="Users who have submitted support tickets." breadcrumbs={[{ label: "Support Agent", href: "/admin/support" }, { label: "Customers" }]} />
      {rows.length === 0 ? <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No customers with tickets.</CardContent></Card> : (
        <Card><CardContent className="p-0">
          <ul className="divide-y divide-border">
            {rows.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0 space-y-1">
                  <p className="font-medium">{p.first_name} {p.last_name}</p>
                  <p className="text-xs text-muted-foreground">{p.email} · Joined {formatRelativeTime(p.created_at)}</p>
                </div>
                <Badge variant="outline" className={p.status === "active" ? "text-success" : "text-destructive"}>{p.status}</Badge>
              </li>
            ))}
          </ul>
        </CardContent></Card>
      )}
    </div>
  );
}
