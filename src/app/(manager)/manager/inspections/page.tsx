"use client";

import * as React from "react";
import { ClipboardCheck, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, EmptyState } from "@/components/shared/page-components";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/utils/format";

export default function ManagerInspectionsPage() {
  const { session } = useAuth();
  const [inspections, setInspections] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    const supabase = createClient();
    // Inspection records are linked to verification_cases
    // Managers can see inspections for their assigned properties' verification cases
    supabase.from("inspection_records").select("id, status, completed_at, scheduled_at, findings, recommendations, verification_cases(entity_label)").order("scheduled_at", { ascending: false }).limit(50).then(({ data, error }) => {
      if (error) { console.error(error.message); }
      setInspections(data ?? []);
      setLoading(false);
    });
  }, [isSupabaseAuth, session]);

  if (!isSupabaseAuth) return <div className="mx-auto max-w-5xl"><PageHeader title="Inspections" /><Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sign in.</CardContent></Card></div>;
  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader eyebrow="Operations" title="Inspections" description="Property inspection records for your assigned properties." />
      {inspections.length === 0 ? (
        <EmptyState icon={<ClipboardCheck className="h-5 w-5" />} title="No inspections" description="Inspection records will appear here when verification officers schedule them." />
      ) : (
        <Card><CardContent className="p-0">
          <ul className="divide-y divide-border">
            {inspections.map((i) => (
              <li key={i.id} className="space-y-1 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{i.verification_cases?.entity_label ?? "Inspection"}</p>
                  <Badge variant="outline" className="capitalize">{i.status}</Badge>
                </div>
                {i.scheduled_at && <p className="text-xs text-muted-foreground">Scheduled: {formatDateTime(i.scheduled_at)}</p>}
                {i.completed_at && <p className="text-xs text-muted-foreground">Completed: {formatDateTime(i.completed_at)}</p>}
                {i.findings && <p className="text-xs">{i.findings}</p>}
              </li>
            ))}
          </ul>
        </CardContent></Card>
      )}
    </div>
  );
}
