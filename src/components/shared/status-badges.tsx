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
  SupportTicketStatus,
  RefundStatus,
  ReconciliationStatus,
  DisputeStatus,
  IntegrationStatus,
  AuditSeverity,
  UserRole,
} from "@/lib/types";
import {
  BOOKING_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYOUT_STATUS_LABELS,
  REFUND_STATUS_LABELS,
  RECONCILIATION_STATUS_LABELS,
  DISPUTE_STATUS_LABELS,
  INTEGRATION_STATUS_LABELS,
  roleLabel,
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

/* ---------------------------------------------------------- Admin badges */

export function SupportTicketStatusBadge({ status }: { status: SupportTicketStatus }) {
  const tone: Tone =
    status === "resolved" || status === "closed"
      ? "success"
      : status === "in_progress"
        ? "info"
        : status === "awaiting_user"
          ? "warning"
          : "default";
  const labels: Record<SupportTicketStatus, string> = {
    open: "Open",
    in_progress: "In progress",
    awaiting_user: "Awaiting user",
    resolved: "Resolved",
    closed: "Closed",
  };
  return <StatusBadge tone={tone}>{labels[status]}</StatusBadge>;
}

export function RefundStatusBadge({ status }: { status: RefundStatus }) {
  const tone: Tone =
    status === "completed"
      ? "success"
      : status === "approved" || status === "processing"
        ? "info"
        : status === "under_review" || status === "requested"
          ? "warning"
          : status === "rejected" || status === "failed"
            ? "danger"
            : "default";
  return <StatusBadge tone={tone}>{REFUND_STATUS_LABELS[status]}</StatusBadge>;
}

export function ReconciliationStatusBadge({ status }: { status: ReconciliationStatus }) {
  const tone: Tone =
    status === "matched"
      ? "success"
      : status === "resolved"
        ? "info"
        : "warning";
  return <StatusBadge tone={tone}>{RECONCILIATION_STATUS_LABELS[status]}</StatusBadge>;
}

export function DisputeStatusBadge({ status }: { status: DisputeStatus }) {
  const tone: Tone =
    status === "resolved_in_favor_of_student" || status === "resolved_in_favor_of_landlord"
      ? "success"
      : status === "closed"
        ? "muted"
        : status === "evidence_requested"
          ? "warning"
          : "info";
  return <StatusBadge tone={tone}>{DISPUTE_STATUS_LABELS[status]}</StatusBadge>;
}

export function IntegrationStatusBadge({ status }: { status: IntegrationStatus }) {
  const tone: Tone =
    status === "operational"
      ? "success"
      : status === "degraded"
        ? "warning"
        : status === "outage"
          ? "danger"
          : "info";
  return <StatusBadge tone={tone}>{INTEGRATION_STATUS_LABELS[status]}</StatusBadge>;
}

export function AuditSeverityBadge({ severity }: { severity: AuditSeverity }) {
  const tone: Tone =
    severity === "critical"
      ? "danger"
      : severity === "warning"
        ? "warning"
        : "info";
  const labels: Record<AuditSeverity, string> = {
    info: "Info",
    warning: "Warning",
    critical: "Critical",
  };
  return <StatusBadge tone={tone}>{labels[severity]}</StatusBadge>;
}

export function PriorityBadge({ priority }: { priority: "low" | "medium" | "high" | "urgent" }) {
  const tone: Tone =
    priority === "urgent"
      ? "danger"
      : priority === "high"
        ? "warning"
        : priority === "medium"
          ? "info"
          : "muted";
  return <StatusBadge tone={tone} dot={false}>{priority[0].toUpperCase() + priority.slice(1)}</StatusBadge>;
}

export function RoleBadge({ role, active = true }: { role: UserRole; active?: boolean }) {
  const isAdmin = ["verification_officer", "support_staff", "finance_admin", "super_admin"].includes(role);
  const tone: Tone = !active ? "muted" : isAdmin ? "info" : "default";
  return (
    <StatusBadge tone={tone} dot={false}>
      {roleLabel(role)}
      {!active && " · suspended"}
    </StatusBadge>
  );
}
