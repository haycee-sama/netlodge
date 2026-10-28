"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader, DemoModeBanner } from "@/components/admin/admin-page-components";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDateTime, formatRelativeTime } from "@/lib/utils/format";
import { Loader2, Lock } from "lucide-react";

interface SettingRow {
  id: string;
  key: string;
  label: string;
  description: string;
  type: string;
  value: string;
  is_sensitive: boolean;
  unit: string | null;
  category: string;
  requires_reauth: boolean;
  updated_at: string;
}

const CATEGORY_ORDER = [
  "commission", "booking", "verification", "support", "payments", "operations", "security",
];

export default function AdminSettingsPage() {
  const { session } = useAuth();
  const [rows, setRows] = React.useState<SettingRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [q, setQ] = React.useState("");
  const isSupabaseAuth = session?.authenticated === true;

  const fetchPage = React.useCallback(async () => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/admin/settings", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) { setError(data.error || `Failed (${res.status})`); setRows([]); }
      else { setRows(data.items ?? []); setError(null); }
    } catch (e) { setError(e instanceof Error ? e.message : "Network error"); }
    finally { setLoading(false); }
  }, [isSupabaseAuth]);

  React.useEffect(() => { fetchPage(); }, [fetchPage]);

  const filtered = React.useMemo(() => {
    if (!q) return rows;
    const needle = q.toLowerCase();
    return rows.filter((r) =>
      r.key.toLowerCase().includes(needle) ||
      r.label.toLowerCase().includes(needle) ||
      r.category.toLowerCase().includes(needle),
    );
  }, [rows, q]);

  const grouped = React.useMemo(() => {
    const map = new Map<string, SettingRow[]>();
    for (const r of filtered) {
      const list = map.get(r.category) ?? [];
      list.push(r);
      map.set(r.category, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => {
      const ai = CATEGORY_ORDER.indexOf(a);
      const bi = CATEGORY_ORDER.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }, [filtered]);

  if (!isSupabaseAuth) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <AdminPageHeader eyebrow="System" title="Platform settings" />
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
          Sign in with a real Super Admin account.
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="System"
        title="Platform settings"
        description="Read-only view of platform_settings. Sensitive values are masked server-side and never exposed. Mutations require an audited, reauthenticated workflow that is not yet implemented."
        breadcrumbs={[{ label: "Super Admin", href: "/admin" }, { label: "Settings" }]}
      />
      <DemoModeBanner message="Live data — values are read from the platform_settings table. Sensitive keys (containing secret/password/token/key) are masked server-side. No mutation endpoints exist." />

      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-4">
          <Input placeholder="Search key, label, or category…" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 w-64" />
          <Button variant="ghost" size="sm" className="h-9 ml-auto" onClick={fetchPage} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Refresh"}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-center justify-between p-4 text-sm text-destructive">
            <span>{error}</span><Button variant="outline" size="sm" onClick={fetchPage}>Retry</Button>
          </CardContent>
        </Card>
      )}

      {!error && loading && (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      )}

      {!error && !loading && grouped.length === 0 && (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No settings match your filters.</CardContent></Card>
      )}

      {!error && !loading && grouped.map(([category, items]) => (
        <Card key={category}>
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b border-border p-4">
              <p className="text-sm font-medium capitalize">{category.replace(/_/g, " ")} settings</p>
              <Badge variant="outline" className="text-xs">{items.length}</Badge>
            </div>
            <ul className="divide-y divide-border">
              {items.map((s) => (
                <li key={s.id} className="space-y-1 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-mono text-sm font-medium">{s.key}</p>
                    {s.is_sensitive && (
                      <Badge variant="outline" className="text-xs text-warning-foreground">
                        <Lock className="mr-1 h-3 w-3" /> sensitive
                      </Badge>
                    )}
                    {s.requires_reauth && (
                      <Badge variant="outline" className="text-xs text-info">requires reauth</Badge>
                    )}
                    <Badge variant="outline" className="text-xs">{s.type}</Badge>
                    {s.unit && <Badge variant="outline" className="text-xs">{s.unit}</Badge>}
                    <span className="ml-auto text-xs text-muted-foreground" title={formatDateTime(s.updated_at)}>
                      Updated {formatRelativeTime(s.updated_at)}
                    </span>
                  </div>
                  <p className="text-sm">{s.label}</p>
                  {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
                  <p className="text-xs">
                    <span className="text-muted-foreground">Value:</span>{" "}
                    <span className={`font-mono ${s.is_sensitive ? "text-muted-foreground" : "text-foreground"}`}>
                      {s.value}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
