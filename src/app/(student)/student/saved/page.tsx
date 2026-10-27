"use client";

import * as React from "react";
import Link from "next/link";
import { Heart, Search, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader, EmptyState } from "@/components/shared/page-components";
import { PropertyCard } from "@/components/public/property-card";
import { Price } from "@/components/shared/price";
import { useAuth } from "@/lib/auth/auth-context";
import { getRepositories } from "@/lib/repositories";
import { properties as allProperties } from "@/lib/data/fixtures";
import type { SavedProperty } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils/format";
import { toast } from "sonner";

export default function StudentSavedPage() {
  const { session } = useAuth();
  const [saved, setSaved] = React.useState<SavedProperty[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!session) return;
    getRepositories()
      .savedProperties.listByUser(session.userId || "dev_student_1")
      .then((s) => {
        setSaved(s);
        setLoading(false);
      });
  }, [session]);

  async function removeItem(id: string) {
    const prev = saved;
    setSaved((s) => s.filter((x) => x.id !== id));
    toast.success("Removed from saved");
    try {
      // For demo: simulate remove
      await new Promise((r) => setTimeout(r, 200));
    } catch {
      setSaved(prev);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Your shortlist"
        title="Saved properties"
        description="Properties you've bookmarked while browsing. Tap the heart icon on any listing to add it here."
      />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
        </div>
      ) : saved.length === 0 ? (
        <EmptyState
          icon={<Heart className="h-5 w-5" aria-hidden />}
          title="No saved properties yet"
          description="Browse the marketplace and tap the heart icon on any listing to save it here for later."
          action={
            <Button asChild>
              <Link href="/student/search">
                <Search className="mr-2 h-4 w-4" aria-hidden />
                Find accommodation
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {saved.map((s) => {
            const property = allProperties.find((p) => p.id === s.propertyId);
            if (!property) return null;
            return (
              <div key={s.id} className="space-y-2">
                <PropertyCard property={property} />
                <Card className="border-dashed">
                  <CardContent className="flex items-center justify-between gap-2 p-3 text-xs">
                    <div>
                      <p className="text-muted-foreground">Saved {formatRelativeTime(s.savedAt)}</p>
                      {s.notes && <p className="mt-0.5 italic">"{s.notes}"</p>}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(s.id)}
                      aria-label="Remove from saved"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
