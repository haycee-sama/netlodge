"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AdminPageHeader } from "@/components/admin/admin-page-components";
import { VerificationBadge, PriorityBadge } from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/utils/format";

export default function AdminVerificationStudentsPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    const supabase = createClient();
    supabase.from("verification_cases")
      .select("id, reference, entity_label, status, priority, submitted_at, created_at")
      .eq("entity_type", "student")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => { setRows(data ?? []); setLoading(false); });
  }, [isSupabaseAuth, session]);

  if (!isSupabaseAuth) return <div className="mx-auto max-w-5xl"><AdminPageHeader title="Student KYC" /><Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sign in.</CardContent></Card></div>;
  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminPageHeader eyebrow="Verification operations" title="Student KYC" description="Student identity verification cases." breadcrumbs={[{ label: "Verification Officer", href: "/admin/verification" }, { label: "Students" }]} />
      {rows.length === 0 ? <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No student verification cases.</CardContent></Card> : (
        <Card><CardContent className="p-0">
          <ul className="divide-y divide-border">
            {rows.map((c) => (
              <li key={c.id}>
                <button onClick={() => router.push(`/admin/verification/${c.id}`)} className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-muted/40">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2"><GraduationCap className="h-4 w-4 text-muted-foreground" /><p className="font-medium">{c.entity_label}</p><PriorityBadge priority={c.priority} /></div>
                    <p className="text-xs text-muted-foreground">{c.reference} · {formatRelativeTime(c.submitted_at ?? c.created_at)}</p>
                  </div>
                  <VerificationBadge status={c.status} />
                </button>
              </li>
            ))}
          </ul>
        </CardContent></Card>
      )}
    </div>
  );
}
