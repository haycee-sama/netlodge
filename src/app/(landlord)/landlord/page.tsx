"use client";

import * as React from "react";
import Link from "next/link";
import { Building2, DoorOpen, CalendarCheck, Banknote, AlertCircle, Plus, Loader2, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, StatCard, EmptyState, SectionHeading } from "@/components/shared/page-components";
import { PropertyStatusBadge, VerificationBadge } from "@/components/shared/status-badges";
import { Price } from "@/components/shared/price";
import { useAuth } from "@/lib/auth/auth-context";
import { fetchLandlordProperties, fetchLandlordBookings, fetchLandlordVerificationCases } from "@/lib/supabase/landlord-service";
import { formatNgn, formatRelativeTime } from "@/lib/utils/format";
import { BookingStatusBadge } from "@/components/shared/status-badges";

export default function LandlordDashboardPage() {
  const { session } = useAuth();
  const [properties, setProperties] = React.useState<any[]>([]);
  const [bookings, setBookings] = React.useState<any[]>([]);
  const [verification, setVerification] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const isSupabaseAuth = session?.authenticated === true;

  React.useEffect(() => {
    if (!session?.userId || !isSupabaseAuth) {
      setLoading(false);
      return;
    }
    Promise.all([
      fetchLandlordProperties(),
      fetchLandlordBookings(),
      fetchLandlordVerificationCases(),
    ]).then(([propsRes, bookingsRes, verifRes]) => {
      if (propsRes.data) setProperties(propsRes.data);
      if (bookingsRes.data) setBookings(bookingsRes.data);
      if (verifRes.data) setVerification(verifRes.data);
      if (propsRes.error) setError(propsRes.error);
      setLoading(false);
    });
  }, [session, isSupabaseAuth]);

  const totalUnits = properties.reduce((s, p) => s + (p.total_units || 0), 0);
  const availableUnits = properties.reduce((s, p) => s + (p.available_units || 0), 0);
  const occupiedUnits = properties.reduce((s, p) => s + (p.occupied_units || 0), 0);
  const heldUnits = properties.reduce((s, p) => s + (p.held_units || 0), 0);
  const pendingBookings = bookings.filter((b) => ["pending_payment", "payment_initiated"].includes(b.status));
  const confirmedBookings = bookings.filter((b) => ["confirmed", "active"].includes(b.status));
  const pendingVerification = verification.filter((v) => v.verification_status === "pending" || v.verification_status === "under_review");

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow={`Welcome${session ? `, ${session.firstName}` : ""}`}
        title="Landlord dashboard"
        description="Your portfolio at a glance — properties, rooms, bookings and finances."
        actions={
          <Button asChild>
            <Link href="/landlord/properties/new">
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              Add property
            </Link>
          </Button>
        }
      />

      {!isSupabaseAuth && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="flex items-start gap-2 p-3 text-xs text-warning-foreground">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>Sign in with a landlord account to manage your properties.</span>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
        </div>
      ) : error ? (
        <EmptyState
          icon={<AlertCircle className="h-5 w-5" aria-hidden />}
          title="Could not load dashboard"
          description={error}
          action={<Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>}
        />
      ) : (
        <>
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total units" value={totalUnits} hint={`Across ${properties.length} ${properties.length === 1 ? "property" : "properties"}`} icon={<DoorOpen className="h-4 w-4" aria-hidden />} />
            <StatCard label="Available" value={availableUnits} hint={`${occupiedUnits} occupied · ${heldUnits} on hold`} icon={<Building2 className="h-4 w-4" aria-hidden />} />
            <StatCard label="Pending bookings" value={pendingBookings.length} hint={`${confirmedBookings.length} confirmed`} icon={<CalendarCheck className="h-4 w-4" aria-hidden />} />
            <StatCard label="Pending verification" value={pendingVerification.length} hint={pendingVerification.length === 0 ? "All clear" : "Needs attention"} icon={<CheckCircle2 className="h-4 w-4" aria-hidden />} />
          </div>

          {/* Properties */}
          <section>
            <SectionHeading
              eyebrow="Portfolio"
              title="Your properties"
              action={<Button asChild variant="ghost" size="sm"><Link href="/landlord/properties">All properties</Link></Button>}
            />
            {properties.length === 0 ? (
              <EmptyState
                className="mt-4"
                icon={<Building2 className="h-5 w-5" aria-hidden />}
                title="No properties yet"
                description="Add your first property to start listing rooms."
                action={<Button asChild size="sm"><Link href="/landlord/properties/new"><Plus className="mr-2 h-4 w-4" aria-hidden />Add property</Link></Button>}
              />
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {properties.map((p) => (
                  <Card key={p.id}>
                    <CardContent className="space-y-3 p-5">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/landlord/properties/${p.id}`} className="space-y-1">
                          <p className="font-medium leading-tight hover:text-primary">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.public_address_line}</p>
                        </Link>
                        <PropertyStatusBadge status={p.status} />
                      </div>
                      <div className="flex items-center gap-2">
                        <VerificationBadge status={p.verification_status} />
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="rounded-md bg-muted/40 p-2">
                          <p className="font-semibold text-foreground">{p.total_units}</p>
                          <p className="text-muted-foreground">Total</p>
                        </div>
                        <div className="rounded-md bg-success/10 p-2">
                          <p className="font-semibold text-success">{p.available_units}</p>
                          <p className="text-muted-foreground">Available</p>
                        </div>
                        <div className="rounded-md bg-info/10 p-2">
                          <p className="font-semibold text-info">{p.occupied_units}</p>
                          <p className="text-muted-foreground">Occupied</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <Price kobo={p.price_from_kobo} fromLabel period="/yr" />
                        <Link href={`/landlord/properties/${p.id}/rooms`} className="text-primary hover:underline">Manage rooms →</Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Recent bookings */}
          {bookings.length > 0 && (
            <section>
              <SectionHeading eyebrow="Activity" title="Recent bookings" />
              <Card className="mt-4">
                <CardContent className="p-0">
                  <ul className="divide-y divide-border">
                    {bookings.slice(0, 5).map((b) => (
                      <li key={b.id} className="flex items-center justify-between gap-3 p-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-medium">{b.properties?.name ?? "Property"}</p>
                            <BookingStatusBadge status={b.status} />
                          </div>
                          <p className="text-xs text-muted-foreground">{b.reference} · {formatRelativeTime(b.created_at)}</p>
                          {b.rentable_units && <p className="text-xs text-muted-foreground">Unit {b.rentable_units.identifier}</p>}
                        </div>
                        <Price kobo={b.total_kobo} compact />
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </section>
          )}
        </>
      )}
    </div>
  );
}
