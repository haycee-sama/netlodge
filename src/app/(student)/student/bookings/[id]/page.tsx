"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, Loader2, CreditCard, ShieldCheck, CheckCircle2, AlertCircle,
  Clock, XCircle, Banknote, Receipt,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/shared/page-components";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/shared/status-badges";
import { Price } from "@/components/shared/price";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import { formatNgn, formatDate, formatRelativeTime } from "@/lib/utils/format";
import { toast } from "sonner";

const workflowSteps = [
  { step: "availability_check", label: "Availability check" },
  { step: "temporary_hold", label: "Temporary hold" },
  { step: "booking_creation", label: "Booking created" },
  { step: "payment_initiation", label: "Payment initiated" },
  { step: "payment_confirmation", label: "Payment confirmed" },
  { step: "booking_confirmation", label: "Booking confirmed" },
  { step: "payment_reconciliation", label: "Reconciled" },
  { step: "refund_or_payout", label: "Payout/refund" },
];

export default function BookingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useAuth();
  const [booking, setBooking] = React.useState<any>(null);
  const [payments, setPayments] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [paying, setPaying] = React.useState(false);
  const isSupabaseAuth = session?.authenticated === true;

  const paymentStatus = searchParams.get("payment");

  React.useEffect(() => {
    if (!params.id || !isSupabaseAuth) { setLoading(false); return; }
    const supabase = createClient();
    Promise.all([
      supabase.from("bookings").select("*, rentable_units(*), properties(*)").eq("id", params.id).single(),
      supabase.from("payments").select("*").eq("booking_id", params.id).order("initiated_at", { ascending: false }),
    ]).then(([bookingRes, paymentsRes]) => {
      if (bookingRes.data) setBooking(bookingRes.data);
      if (paymentsRes.data) setPayments(paymentsRes.data);
      setLoading(false);
    });
  }, [params.id, isSupabaseAuth]);

  // Show payment result toast
  React.useEffect(() => {
    if (paymentStatus === "success") {
      toast.success("Payment confirmed!", { description: "Your booking has been confirmed." });
    } else if (paymentStatus === "pending") {
      toast.info("Payment pending", { description: "We're verifying your payment. Please check back shortly." });
    } else if (paymentStatus === "failed") {
      toast.error("Payment failed", { description: "Your payment was not completed. You can try again." });
    } else if (paymentStatus === "error") {
      toast.error("Payment error", { description: "Something went wrong. Please contact support if the issue persists." });
    } else if (paymentStatus === "needs-reconciliation") {
      toast.warning("Payment received", { description: "Your payment was received but your booking needs manual review. Our team will contact you." });
    }
  }, [paymentStatus]);

  async function handlePay() {
    if (!booking || !isSupabaseAuth) return;
    setPaying(true);
    try {
      const response = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error("Payment initialization failed", { description: data.error });
        return;
      }

      // Redirect to Paystack's authorization URL
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      }
    } catch (e) {
      toast.error("Payment initialization failed", {
        description: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setPaying(false);
    }
  }

  async function handleCancel() {
    if (!booking) return;
    if (!confirm("Cancel this booking? The room hold will be released.")) return;
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("cancel_booking", {
        p_booking_id: booking.id,
        p_reason: "Cancelled by student",
      });
      if (error) {
        toast.error("Could not cancel booking", { description: error.message });
      } else {
        toast.success("Booking cancelled");
        router.push("/student/bookings");
      }
    } catch (e) {
      toast.error("Could not cancel booking");
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-5xl"><div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden /></div></div>;
  }

  if (!isSupabaseAuth) {
    return (
      <div className="mx-auto max-w-5xl">
        <PageHeader title="Booking details" />
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
          Sign in with a real account to view booking details.
        </CardContent></Card>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="mx-auto max-w-5xl">
        <PageHeader title="Booking not found" />
        <Button asChild variant="outline"><Link href="/student/bookings">Back to bookings</Link></Button>
      </div>
    );
  }

  const currentStepIndex = workflowSteps.findIndex((s) => s.step === booking.current_step);
  const isCancellable = ["pending_payment", "payment_initiated"].includes(booking.status);
  const needsPayment = booking.outstanding_kobo > 0 && ["pending_payment", "payment_initiated"].includes(booking.status);
  const isConfirmed = booking.status === "confirmed" || booking.status === "active";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Button asChild variant="ghost" size="sm"><Link href="/student/bookings"><ArrowLeft className="mr-2 h-4 w-4" aria-hidden /> Back to bookings</Link></Button>

      <PageHeader
        eyebrow={booking.reference}
        title="Booking detail"
        description={`Placed ${formatRelativeTime(booking.created_at)}`}
        actions={<BookingStatusBadge status={booking.status} />}
      />

      {/* Payment result banner */}
      {paymentStatus === "success" && (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="flex items-center gap-2 p-4 text-sm text-success">
            <CheckCircle2 className="h-5 w-5" aria-hidden />
            <span>Payment confirmed! Your booking is now active.</span>
          </CardContent>
        </Card>
      )}
      {paymentStatus === "pending" && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="flex items-center gap-2 p-4 text-sm text-warning-foreground">
            <Clock className="h-5 w-5" aria-hidden />
            <span>Payment is being verified. Please check back in a few minutes.</span>
          </CardContent>
        </Card>
      )}
      {paymentStatus === "failed" && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center gap-2 p-4 text-sm text-destructive">
            <XCircle className="h-5 w-5" aria-hidden />
            <span>Payment was not completed. You can try again below.</span>
          </CardContent>
        </Card>
      )}

      {/* Workflow tracker */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-primary" aria-hidden /> Secure booking workflow</CardTitle></CardHeader>
        <CardContent>
          <ol className="grid gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {workflowSteps.map((s, i) => {
              const done = i < currentStepIndex;
              const active = i === currentStepIndex;
              return (
                <li key={s.step} className="space-y-1.5">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${done ? "bg-success text-success-foreground" : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {done ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : i + 1}
                  </span>
                  <p className={`text-xs ${active ? "font-medium text-foreground" : "text-muted-foreground"}`}>{s.label}</p>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {/* Property & room */}
          <Card>
            <CardHeader><CardTitle className="text-base">Property & unit</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {booking.properties && (
                <div>
                  <p className="font-medium">{booking.properties.name}</p>
                  <p className="text-xs text-muted-foreground">{booking.properties.public_address_line}</p>
                </div>
              )}
              <Separator />
              {booking.rentable_units && (
                <div>
                  <p className="font-medium">Unit {booking.rentable_units.identifier}</p>
                  <p className="text-xs text-muted-foreground capitalize">{booking.rentable_units.unit_type?.replace(/_/g, " ")}</p>
                </div>
              )}
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-muted-foreground">Check-in</p><p className="font-medium">{formatDate(booking.check_in)}</p></div>
                <div><p className="text-xs text-muted-foreground">Check-out</p><p className="font-medium">{formatDate(booking.check_out)}</p></div>
              </div>
            </CardContent>
          </Card>

          {/* Payment history */}
          {payments.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Payments</CardTitle></CardHeader>
              <CardContent>
                <ul className="divide-y divide-border">
                  {payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{p.reference}</p>
                          <PaymentStatusBadge status={p.status} />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {p.channel} · {formatRelativeTime(p.initiated_at)}
                          {p.gateway_reference && ` · ${p.gateway_reference}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatNgn(p.amount_kobo)}</p>
                        {p.confirmed_by_backend && <p className="text-xs text-success">Backend-confirmed</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          {/* Cost summary */}
          <Card>
            <CardHeader><CardTitle className="text-base">Cost summary</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Annual rent</span><span>{formatNgn(booking.base_rent_kobo)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Additional charges</span><span>{formatNgn(booking.additional_charges_kobo)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Caution deposit</span><span>{formatNgn(booking.caution_deposit_kobo)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Service fee</span><span>{formatNgn(booking.service_fee_kobo)}</span></div>
              <Separator />
              <div className="flex justify-between font-semibold"><span>Total</span><span>{formatNgn(booking.total_kobo)}</span></div>
              <Separator />
              <div className="flex justify-between text-success"><span>Paid</span><span>{formatNgn(booking.paid_kobo)}</span></div>
              {booking.outstanding_kobo > 0 && (
                <div className="flex justify-between text-destructive"><span>Outstanding</span><span>{formatNgn(booking.outstanding_kobo)}</span></div>
              )}
            </CardContent>
          </Card>

          {/* Payment action */}
          {needsPayment && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" aria-hidden />
                  <p className="font-display font-semibold">Outstanding balance</p>
                </div>
                <p className="text-2xl font-bold">{formatNgn(booking.outstanding_kobo)}</p>
                <p className="text-xs text-muted-foreground">
                  Payment is processed by Paystack. Your booking is confirmed only after the backend confirms payment.
                </p>
                <Button className="w-full" onClick={handlePay} disabled={paying}>
                  {paying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Redirecting…</> : <><CreditCard className="mr-2 h-4 w-4" aria-hidden /> Pay {formatNgn(booking.outstanding_kobo)}</>}
                </Button>
                {booking.hold_expires_at && (
                  <p className="flex items-center justify-center gap-1 text-xs text-warning-foreground">
                    <Clock className="h-3 w-3" aria-hidden />
                    Hold expires {formatRelativeTime(booking.hold_expires_at)}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Confirmed state */}
          {isConfirmed && (
            <Card className="border-success/30 bg-success/5">
              <CardContent className="space-y-2 p-5 text-sm">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  <p className="font-medium">Booking confirmed</p>
                </div>
                <p className="text-muted-foreground">
                  The exact property address has been shared with you. Contact your landlord to arrange move-in.
                </p>
                {booking.properties && (
                  <div className="rounded-md bg-background p-3 text-xs">
                    <p className="font-medium">Private address</p>
                    <p className="text-muted-foreground">{booking.properties.private_address_line}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Cancel */}
          {isCancellable && (
            <Button variant="outline" className="w-full border-destructive/40 text-destructive hover:bg-destructive/10" onClick={handleCancel}>
              Cancel booking
            </Button>
          )}
        </aside>
      </div>
    </div>
  );
}
