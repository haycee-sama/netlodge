"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader } from "@/components/admin/admin-page-components";
import { VerificationBadge, PropertyStatusBadge } from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { formatNgn, formatRelativeTime } from "@/lib/utils/format";

export default function AdminPropertiesPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const isSupabaseAuth = session?.authenticated === true;

  const fetchPage = React.useCallback(async () => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const supabase = createClient();
      let query = supabase.from("properties").select("id, name, slug, type, status, verification_status, city, state, price_from_kobo, total_units, available_units, created_at, landlord_id").order("created_at", { ascending: false }).limit(100);
      if (q) query = query.or(`name.ilike.%${q}%,slug.ilike.%${q}%,city.ilike.%${q}%`);
      if (status !== "all") query = query.eq("status", status);
      const { data, error } = await query;
      if (error) setError(error.message);
      else setRows(data ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load"); }
    finally { setLoading(false); }
  }, [isSupabaseAuth, q, status]);

  React.useEffect(() => { fetchPage(); }, [fetchPage]);

  if (!isSupabaseAuth) return <div className="mx-auto max-w-7xl"><AdminPageHeader eyebrow="Oversight" title="Properties" /><Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sign in.</CardContent></Card></div>;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader eyebrow="Platform oversight" title="Properties" description="All properties across the platform." breadcrumbs={[{ label: "Super Admin", href: "/admin" }, { label: "Properties" }]} />
      <Card><CardContent className="flex flex-wrap items-center gap-2 p-4">
        <Input placeholder="Search name, slug, city…" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 w-56" />
        <Select value={status} onValueChange={setStatus}><SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger><SelectContent>
          <SelectItem value="all">All statuses</SelectItem><SelectItem value="verified">Verified</SelectItem><SelectItem value="pending_verification">Pending</SelectItem><SelectItem value="rejected">Rejected</SelectItem><SelectItem value="draft">Draft</SelectItem><SelectItem value="archived">Archived</SelectItem>
        </SelectContent></Select>
        <Button variant="ghost" size="sm" className="h-9 ml-auto" onClick={fetchPage} disabled={loading}>{loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Refresh"}</Button>
      </CardContent></Card>
      {error ? <Card className="border-destructive/40 bg-destructive/5"><CardContent className="p-4 text-sm text-destructive">{error}</CardContent></Card> : rows.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No properties found.</CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <ul className="divide-y divide-border">
            {rows.map((p) => (
              <li key={p.id} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2"><p className="font-medium">{p.name}</p><VerificationBadge status={p.verification_status} /><PropertyStatusBadge status={p.status} /></div>
                  <p className="text-xs text-muted-foreground">{p.slug} · {p.city}, {p.state} · {p.available_units}/{p.total_units} units · {formatRelativeTime(p.created_at)}</p>
                </div>
                <div className="text-right">{p.price_from_kobo > 0 && <p className="text-sm font-medium">{formatNgn(p.price_from_kobo)}</p>}</div>
              </li>
            ))}
          </ul>
        </CardContent></Card>
      )}
    </div>
  );
}
