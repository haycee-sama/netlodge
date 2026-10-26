"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  CalendarCheck,
  CreditCard,
  ShieldCheck,
  Lock,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Building2,
  DoorOpen,
  AlertCircle,
  Receipt,
  Clock,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  BookingStatusBadge,
  PaymentStatusBadge,
} from "@/components/shared/status-badges";
import { Price } from "@/components/shared/price";
import { useAuth } from "@/lib/auth/auth-context";
import { getRepositories } from "@/lib/repositories";
import { bookings as allBookings, properties as allProperties, rooms as allRooms } from "@/lib/data/fixtures";
import type { Booking, Payment } from "@/lib/types";
import { formatNgn, formatDate, formatDateTime, formatRelativeTime } from "@/lib/utils/format";
import { toast } from "sonner";

const workflowSteps: { step: string; label: string }[] = [
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
  const { session } = useAuth();
  const [booking, setBooking] = React.useState<Booking | null>(null);
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [paying, setPaying] = React.useState(false);

  React.useEffect(() => {
    if (!params.id) return;
    const found = allBookings.find((b) => b.id === params.id);
    if (found) {
      setBooking(found);
      getRepositories().payments.listByBooking(found.id).then(setPayments);
    }
  }, [params.id]);

  if (!booking) {
    return (
      <div className="mx-auto max-w-5xl">
        <p className="text-sm text-muted-foreground">Loading booking…</p>
      </div>
    );
  }

  const property = allProperties.find((p) => p.id === booking.propertyId);
  const room = allRooms.find((r) => r.id === booking.rentableUnitId);
  const currentStepIndex = workflowSteps.findIndex((s) => s.step === booking.currentStep);
  const isCancellable = ["pending_payment", "payment_initiated", "confirmed"].includes(booking.status);
  const needsPayment = booking.outstandingKobo > 0 && !["cancelled", "completed", "refunded", "expired"].includes(booking.status);

  async function onPay() {
    setPaying(true);
    try {
      const payment = await getRepositories().payments.initiate({
        bookingId: booking!.id,
        channel: "card",
      });
      toast.success("Payment link generated", {
        description: `Reference ${payment.reference}. In production, you'd be redirected to Paystack.`,
      });
      setPayments((p) => [payment, ...p]);
      // NOTE: We intentionally do NOT mark the payment as successful from the browser.
      // The backend verifies via Paystack webhook, then flips the booking status.
    } catch (e) {
      toast.error("Payment initiation failed", {
        description: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setPaying(false);
    }
  }

  async function onCancel(reason: string) {
    try {
      const updated = await getRepositories().bookings.cancel(booking!.id, reason);
      setBooking(updated);
      toast.success("Booking cancelled", {
        description: "Any payment made will be refunded within 5–7 business days.",
      });
    } catch (e) {
      toast.error("Could not cancel booking");
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-3">
          <Link href="/student/bookings">
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
            Back to bookings
          </Link>
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                {booking.reference}
              </h1>
              <BookingStatusBadge status={booking.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              Placed {formatRelativeTime(booking.createdAt)} · Last updated {formatRelativeTime(booking.updatedAt)}
            </p>
          </div>
          {isCancellable && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <XCircle className="mr-2 h-4 w-4" aria-hidden />
                  Cancel booking
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cancelling releases the hold on the room. If you've already paid, a full refund
                    is issued if you cancel within 24 hours of booking. After that, refund eligibility
                    depends on the lease terms.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep booking</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onCancel("Cancelled by student")}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Cancel booking
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Secure workflow tracker */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
            Secure booking workflow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {workflowSteps.map((s, i) => {
              const done = i < currentStepIndex;
              const active = i === currentStepIndex;
              return (
                <li key={s.step} className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        done
                          ? "bg-success text-success-foreground"
                          : active
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {done ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : i + 1}
                    </span>
                  </div>
                  <p className={`text-xs ${active ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                    {s.label}
                  </p>
                </li>
              );
            })}
          </ol>
          <p className="mt-4 text-xs text-muted-foreground">
            The frontend renders each step but only the backend can transition between them.
            The browser never declares a payment successful without backend confirmation.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {/* Property & room */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Property & unit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href={`/properties/${property?.slug}`} className="flex items-start gap-3">
                <Building2 className="mt-0.5 h-4 w-4 text-primary" aria-hidden />
                <div>
                  <p className="font-medium hover:text-primary">{property?.name}</p>
                  <p className="text-xs text-muted-foreground">{property?.publicAddressLine}</p>
                </div>
              </Link>
              <Separator />
              <Link href={`/rooms/${room?.id}`} className="flex items-start gap-3">
                <DoorOpen className="mt-0.5 h-4 w-4 text-primary" aria-hidden />
                <div>
                  <p className="font-medium hover:text-primary">Unit {room?.identifier}</p>
                  <p className="text-xs text-muted-foreground">
                    {room?.unitType.replace("_", " ")} · sleeps {room?.capacity}
                  </p>
                </div>
              </Link>
              <Separator />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Check-in</p>
                  <p className="font-medium">{formatDate(booking.checkIn)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Check-out</p>
                  <p className="font-medium">{formatDate(booking.checkOut)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payments */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Payments</CardTitle>
              {payments.length > 0 && <Badge variant="secondary">{payments.length} transaction{payments.length === 1 ? "" : "s"}</Badge>}
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No payment transactions yet.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{p.reference}</p>
                          <PaymentStatusBadge status={p.status} />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {p.channel} · {formatDateTime(p.initiatedAt)}
                          {p.gatewayReference && ` · gateway: ${p.gatewayReference}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatNgn(p.amountKobo)}</p>
                        {p.confirmedByBackend && (
                          <p className="text-xs text-success">Backend-confirmed</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cost summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Annual rent</span>
                <span>{formatNgn(booking.baseRentKobo)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Additional charges</span>
                <span>{formatNgn(booking.additionalChargesKobo)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Caution deposit</span>
                <span>{formatNgn(booking.cautionDepositKobo)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service fee</span>
                <span>{formatNgn(booking.serviceFeeKobo)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatNgn(booking.totalKobo)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-success">
                <span>Paid</span>
                <span>{formatNgn(booking.paidKobo)}</span>
              </div>
              {booking.outstandingKobo > 0 && (
                <div className="flex justify-between text-destructive">
                  <span>Outstanding</span>
                  <span>{formatNgn(booking.outstandingKobo)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment action */}
          {needsPayment && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" aria-hidden />
                  <p className="font-display font-semibold">Outstanding balance</p>
                </div>
                <p className="text-2xl font-bold">{formatNgn(booking.outstandingKobo)}</p>
                <p className="text-xs text-muted-foreground">
                  Payment is processed by Paystack. Your booking is confirmed only after the backend
                  confirms payment — never from the browser.
                </p>
                <Button className="w-full" onClick={onPay} disabled={paying}>
                  {paying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                      Generating link…
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" aria-hidden />
                      Pay {formatNgn(booking.outstandingKobo)}
                    </>
                  )}
                </Button>
                {booking.holdExpiresAt && (
                  <p className="flex items-center justify-center gap-1 text-xs text-warning-foreground">
                    <Clock className="h-3 w-3" aria-hidden />
                    Hold expires {formatRelativeTime(booking.holdExpiresAt)}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Confirmed state */}
          {(booking.status === "confirmed" || booking.status === "active") && (
            <Card className="border-success/30 bg-success/5">
              <CardContent className="space-y-2 p-5 text-sm">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  <p className="font-medium">Booking confirmed</p>
                </div>
                <p className="text-muted-foreground">
                  The exact property address has been shared with you. Contact your landlord to
                  arrange move-in.
                </p>
                {property && (
                  <div className="rounded-md bg-background p-3 text-xs">
                    <p className="font-medium">Private address</p>
                    <p className="text-muted-foreground">{property.privateAddressLine}</p>
                  </div>
                )}
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/student/payments">
                    <Receipt className="mr-2 h-4 w-4" aria-hidden />
                    View receipt
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Cancelled state */}
          {booking.status === "cancelled" && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="space-y-2 p-5 text-sm">
                <div className="flex items-center gap-2 text-destructive">
                  <XCircle className="h-4 w-4" aria-hidden />
                  <p className="font-medium">Booking cancelled</p>
                </div>
                <p className="text-muted-foreground">
                  {booking.cancellationReason ?? "No reason provided."}
                </p>
                <p className="text-xs text-muted-foreground">
                  Any payment made is being refunded to your original payment method within 5–7
                  business days.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Help */}
          <Card>
            <CardContent className="space-y-2 p-5 text-sm">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground" aria-hidden />
                <p className="font-medium">Need help?</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Open a support ticket from your dashboard and a human will respond within 4 hours.
              </p>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/student/support">Contact support</Link>
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
