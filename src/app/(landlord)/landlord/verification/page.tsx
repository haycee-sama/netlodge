"use client";

import * as React from "react";
import { BadgeCheck, ShieldCheck, FileText, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageHeader, EmptyState } from "@/components/shared/page-components";
import { VerificationBadge } from "@/components/shared/status-badges";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/utils/format";
import { toast } from "sonner";

interface VerificationCase {
  id: string;
  reference: string;
  entity_type: string;
  entity_label: string;
  submission_type: string;
  status: string;
  priority: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export default function LandlordVerificationPage() {
  const { session } = useAuth();
  const [cases, setCases] = React.useState<VerificationCase[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    const supabase = createClient();
    supabase
      .from("verification_cases")
      .select("*")
      .eq("entity_id", session!.userId)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setCases((data as VerificationCase[]) ?? []);
        setLoading(false);
      });
  }, [isSupabaseAuth, session]);

  if (!isSupabaseAuth) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader eyebrow="Verification" title="Identity & listing verification" />
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sign in with a real landlord account.</CardContent></Card>
      </div>
    );
  }

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow="Verification"
        title="Identity & listing verification"
        description="Your verification status and submission history. All listings go through identity, address, and ownership verification."
      />

      {error && (
        <Card className="border-destructive/40 bg-destructive/5"><CardContent className="p-4 text-sm text-destructive">{error}</CardContent></Card>
      )}

      {cases.length === 0 ? (
        <EmptyState
          icon={<BadgeCheck className="h-5 w-5" aria-hidden />}
          title="No verification submissions"
          description="Your verification cases will appear here once submitted."
        />
      ) : (
        <div className="space-y-4">
          {cases.map((c) => (
            <Card key={c.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
                    {c.entity_label}
                  </CardTitle>
                  <VerificationBadge status={c.status as any} />
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Reference</span><span>{c.reference}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span>{c.submission_type.replace(/_/g, " ")}</span></div>
                {c.submitted_at && <div className="flex justify-between"><span className="text-muted-foreground">Submitted</span><span>{formatDateTime(c.submitted_at)}</span></div>}
                {c.reviewed_at && <div className="flex justify-between"><span className="text-muted-foreground">Reviewed</span><span>{formatDateTime(c.reviewed_at)}</span></div>}
                {c.rejection_reason && (
                  <div className="rounded-md bg-destructive/5 p-2 text-destructive">
                    <p className="text-xs font-medium">Rejection reason:</p>
                    <p className="text-xs">{c.rejection_reason}</p>
                  </div>
                )}
                {c.review_notes && (
                  <div className="rounded-md bg-muted p-2">
                    <p className="text-xs font-medium">Review notes:</p>
                    <p className="text-xs">{c.review_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
