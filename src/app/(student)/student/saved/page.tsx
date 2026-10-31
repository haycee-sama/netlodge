"use client";

import * as React from "react";
import Link from "next/link";
import { Heart, Search, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, EmptyState } from "@/components/shared/page-components";
import { VerificationBadge } from "@/components/shared/status-badges";
import { Price } from "@/components/shared/price";
import { useAuth } from "@/lib/auth/auth-context";
import { useI18n } from "@/lib/i18n/context";
import { createClient } from "@/lib/supabase/client";
import { formatNgn, formatRelativeTime } from "@/lib/utils/format";
import { toast } from "sonner";

interface SavedPropertyRow {
  id: string;
  property_id: string;
  notes: string | null;
  created_at: string;
  properties: {
    id: string;
    name: string;
    slug: string;
    city: string;
    state: string;
    status: string;
    verification_status: string;
    price_from_kobo: number;
  } | null;
}

export default function StudentSavedPage() {
  const { session } = useAuth();
  const { t } = useI18n();
  const [saved, setSaved] = React.useState<SavedPropertyRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const isSupabaseAuth = session?.authenticated === true;

  const fetchSaved = React.useCallback(async () => {
    if (!isSupabaseAuth) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("saved_properties")
        .select(`
          id, property_id, notes, created_at,
          properties ( id, name, slug, city, state, status, verification_status, price_from_kobo )
        `)
        .eq("user_id", session!.userId)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      setSaved((data ?? []) as unknown as SavedPropertyRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load saved properties");
    } finally {
      setLoading(false);
    }
  }, [isSupabaseAuth, session]);

  React.useEffect(() => { fetchSaved(); }, [fetchSaved]);

  async function removeItem(id: string) {
    if (!isSupabaseAuth) return;
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("saved_properties")
        .delete()
        .eq("id", id)
        .eq("user_id", session!.userId);
      if (error) throw new Error(error.message);
      setSaved((s) => s.filter((x) => x.id !== id));
      toast.success(t("student.saved.removedToast"));
    } catch (e) {
      toast.error(t("student.saved.couldNotRemove"), { description: e instanceof Error ? e.message : "" });
    }
  }

  if (!isSupabaseAuth) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader eyebrow={t("student.saved.eyebrow")} title={t("student.saved.title")} />
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
          {t("student.saved.signInPrompt")}
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow={t("student.saved.eyebrow")}
        title={t("student.saved.title")}
        description={t("student.saved.description")}
      />

      {error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-center justify-between p-4 text-sm text-destructive">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={fetchSaved}>{t("common.retry")}</Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : saved.length === 0 ? (
        <EmptyState
          icon={<Heart className="h-5 w-5" aria-hidden />}
          title={t("student.saved.noSaved.title")}
          description={t("student.saved.noSaved.desc")}
          action={<Button asChild><Link href="/properties"><Search className="mr-2 h-4 w-4" aria-hidden /> {t("student.dashboard.browseProperties")}</Link></Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {saved.map((s) => {
            const p = s.properties;
            if (!p) return null;
            return (
              <Card key={s.id} className="overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/properties/${p.slug}`} className="font-medium hover:underline">
                        {p.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{p.city}, {p.state}</p>
                    </div>
                    <VerificationBadge status={p.verification_status as any} />
                  </div>
                  <div className="flex items-center justify-between">
                    {p.price_from_kobo > 0 ? (
                      <Price kobo={p.price_from_kobo} />
                    ) : (
                      <span className="text-sm text-muted-foreground">{t("student.saved.priceOnRequest")}</span>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => removeItem(s.id)} className="text-destructive hover:bg-destructive/10">
                      <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden /> {t("student.saved.remove")}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">{t("student.saved.savedAt", { time: formatRelativeTime(s.created_at) })}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
