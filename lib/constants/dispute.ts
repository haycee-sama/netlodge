// lib/constants/dispute.ts
// Shared dispute-status display config. Previously LandlordBookingsClient.jsx
// and app/(student)/booking/BookingsClient.jsx each defined their own
// DISPUTE_STATUS_CONFIG object with identical resolved_refund and
// resolved_release entries and only the "pending" wording differing by
// audience.

export const DISPUTE_STATUS_LABELS = {
  pending: { label: 'Dispute Under Review', badge: 'bg-amber-100 text-amber-700' },
  resolved_refund: { label: 'Dispute Resolved — Refunded', badge: 'bg-blue-100 text-blue-700' },
  resolved_release: { label: 'Dispute Resolved — Funds Released', badge: 'bg-green-100 text-green-700' },
}

// Landlord-facing copy for an open dispute is more urgent ("Action
// Needed") than the student-facing copy — kept as a second export so
// each side's wording is still owned in one place instead of two
// hand-copied objects.
export const LANDLORD_DISPUTE_STATUS_LABELS = {
  pending: { label: 'Dispute Filed — Action Needed', badge: 'bg-red-100 text-red-700' },
  resolved_refund: { label: 'Dispute Resolved — Refunded', badge: 'bg-blue-100 text-blue-700' },
  resolved_release: { label: 'Dispute Resolved — Funds Released', badge: 'bg-green-100 text-green-700' },
}