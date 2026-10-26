import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type {
  BookingStatus,
  PaymentStatus,
  PayoutStatus,
  PropertyStatus,
  RentableUnitStatus,
  VerificationStatus,
} from "@/lib/types";
import {
  BOOKING_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYOUT_STATUS_LABELS,
} from "@/lib/types";

type Tone = "default" | "success" | "warning" | "danger" | "info" | "muted";

const toneClasses: Record<Tone, string> = {
  default: "border-border bg-secondary text-secondary-foreground",
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/15 text-warning-foreground",
  danger: "border-destructive/30 bg-destructive/10 text-destructive",
  info: "border-info/30 bg-info/10 text-info",
  muted: "border-border bg-muted text-muted-foreground",
};

export function StatusBadge({
  tone = "default",
  children,
  className,
  dot = true,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 font-medium", toneClasses[tone], className)}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </Badge>
  );
}

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const tone: Tone =
    status === "confirmed" || status === "active" || status === "completed"
      ? "success"
      : status === "pending_payment" || status === "payment_initiated" || status === "draft"
        ? "warning"
        : status === "cancelled" || status === "expired" || status === "refunded"
          ? "danger"
          : "default";
  return <StatusBadge tone={tone}>{BOOKING_STATUS_LABELS[status]}</StatusBadge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const tone: Tone =
    status === "successful"
      ? "success"
      : status === "pending" || status === "initiated"
        ? "warning"
        : status === "failed" || status === "reversed"
          ? "danger"
          : status === "refunded"
            ? "info"
            : "default";
  return <StatusBadge tone={tone}>{PAYMENT_STATUS_LABELS[status]}</StatusBadge>;
}

export function PayoutStatusBadge({ status }: { status: PayoutStatus }) {
  const tone: Tone =
    status === "settled"
      ? "success"
      : status === "in_flight" || status === "scheduled"
        ? "warning"
        : "danger";
  return <StatusBadge tone={tone}>{PAYOUT_STATUS_LABELS[status]}</StatusBadge>;
}

export function RoomStatusBadge({ status }: { status: RentableUnitStatus }) {
  const tone: Tone =
    status === "available"
      ? "success"
      : status === "held"
        ? "warning"
        : status === "occupied"
          ? "info"
          : status === "maintenance"
            ? "danger"
            : "muted";
  const labels: Record<RentableUnitStatus, string> = {
    available: "Available",
    held: "On hold",
    occupied: "Occupied",
    maintenance: "Maintenance",
    off_market: "Off market",
  };
  return <StatusBadge tone={tone}>{labels[status]}</StatusBadge>;
}

export function PropertyStatusBadge({ status }: { status: PropertyStatus }) {
  const tone: Tone =
    status === "verified"
      ? "success"
      : status === "pending_verification"
        ? "warning"
        : status === "rejected"
          ? "danger"
          : status === "archived"
            ? "muted"
            : "default";
  const labels: Record<PropertyStatus, string> = {
    draft: "Draft",
    pending_verification: "Pending verification",
    verified: "Verified",
    rejected: "Rejected",
    archived: "Archived",
  };
  return <StatusBadge tone={tone}>{labels[status]}</StatusBadge>;
}

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const tone: Tone =
    status === "approved"
      ? "success"
      : status === "pending" || status === "in_review"
        ? "warning"
        : status === "rejected"
          ? "danger"
          : "muted";
  const labels: Record<VerificationStatus, string> = {
    unverified: "Unverified",
    pending: "Pending",
    in_review: "In review",
    approved: "Approved",
    rejected: "Rejected",
  };
  return <StatusBadge tone={tone}>{labels[status]}</StatusBadge>;
}
