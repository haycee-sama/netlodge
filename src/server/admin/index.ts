/**
 * Admin module — Phase 10.
 *
 * Public surface: server actions + types for admin operations
 * (property suspension, booking/payment monitoring, audit log viewer).
 *
 * Verification approve/reject and property approve/reject actions are
 * exported from their existing modules (`src/server/verification` and
 * `src/server/properties`). They're re-exported here for convenience.
 */
export {
  approveProperty,
  rejectProperty,
  suspendProperty,
  liftSuspensionProperty,
  listBookingsAdmin,
  listPaymentsAdmin,
  listWebhookEventsAdmin,
} from "@/server/admin/actions";
export {
  suspendPropertyCore,
  liftSuspensionPropertyCore,
  listBookingsAdminCore,
  listPaymentsAdminCore,
  listWebhookEventsAdminCore,
  type SupabaseDbClient as AdminDbClient,
} from "@/server/admin/core";
// Re-export approve/reject core (originally defined in properties/core.ts).
export {
  approvePropertyCore,
  rejectPropertyCore,
} from "@/server/properties/core";
