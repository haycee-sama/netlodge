/**
 * NetLodge domain types.
 *
 * These types model the entire product domain. They are deliberately backend-
 * agnostic: a Supabase/Postgres adapter can map database rows into these shapes
 * and a development fixture adapter returns the same shapes from local data.
 *
 * Money rule: monetary values in backend-facing models are expressed in integer
 * kobo (1 NGN = 100 kobo) to avoid floating-point drift. Display helpers in
 * `@/lib/utils/format` convert kobo to formatted NGN strings for the UI.
 */

/* ------------------------------------------------------------------ Roles */

export type UserRole =
  | "student"
  | "landlord"
  | "manager"
  | "agent"
  | "verification_officer"
  | "support_staff"
  | "finance_admin"
  | "super_admin";

export const USER_ROLES: UserRole[] = [
  "student",
  "landlord",
  "manager",
  "agent",
  "verification_officer",
  "support_staff",
  "finance_admin",
  "super_admin",
];

/** Marketplace roles — students, landlords and their staff. */
export const MARKETPLACE_ROLES: UserRole[] = [
  "student",
  "landlord",
  "manager",
  "agent",
];

/** Administrative / back-office roles. */
export const ADMIN_ROLES: UserRole[] = [
  "verification_officer",
  "support_staff",
  "finance_admin",
  "super_admin",
];

/** Human-readable label for any role, with underscores replaced. */
export function roleLabel(role: UserRole): string {
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** @deprecated Use `UserRole` directly. Kept for backwards compatibility. */
export type ReservedRole =
  | "verification_officer"
  | "support_staff"
  | "finance_admin"
  | "super_admin";

/* ------------------------------------------------------------------ Users */

export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  phone?: string | null;
  phoneVerified: boolean;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  role: UserRole;
  createdAt: string;
  lastSeenAt?: string | null;
  /** Account status — set by super_admin. Inactive accounts cannot sign in. */
  active: boolean;
  /** When the account was deactivated, if applicable. */
  deactivatedAt?: string | null;
  /** Reason recorded for the most recent activation/deactivation change. */
  statusReason?: string | null;
  /** ID of the admin who last changed the account's status. */
  statusChangedBy?: string | null;
  /** When the user's role was last changed. */
  roleUpdatedAt?: string | null;
  /** ID of the admin who last changed the user's role. */
  roleChangedBy?: string | null;
}

export interface StudentProfile {
  userId: string;
  universityId?: string | null;
  matricNumber?: string | null;
  level?: string | null;
  department?: string | null;
  bio?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
}

export interface LandlordProfile {
  userId: string;
  displayName: string;
  businessName?: string | null;
  officeAddress?: string | null;
  rcNumber?: string | null;
  verificationStatus: VerificationStatus;
  verificationSubmittedAt?: string | null;
  verificationReviewedAt?: string | null;
  verificationReviewNotes?: string | null;
  /** Indicates whether the landlord can list properties publicly. */
  canPublish: boolean;
}

export interface ManagerProfile {
  userId: string;
  employerUserId?: string | null;
  displayName: string;
  permissions: ManagerPermission[];
  active: boolean;
}

export interface AgentProfile {
  userId: string;
  agencyName?: string | null;
  displayName: string;
  referralCode: string;
  active: boolean;
}

export type ManagerPermission =
  | "manage_inventory"
  | "manage_bookings"
  | "manage_availability"
  | "record_inspections"
  | "view_assigned_finances";

/* ------------------------------------------------------ Verification */

export type VerificationStatus =
  | "unverified"
  | "pending"
  | "in_review"
  | "approved"
  | "rejected";

export type VerificationEvidenceType =
  | "identity"
  | "address"
  | "ownership"
  | "management_authority"
  | "incorporation"
  | "tax_clearance"
  | "inspection_report";

export interface VerificationEvidence {
  id: string;
  type: VerificationEvidenceType;
  label: string;
  fileName: string;
  fileUrl?: string | null;
  uploadedAt: string;
  status: "pending" | "approved" | "rejected";
  reviewerNotes?: string | null;
}

export interface VerificationRecord {
  id: string;
  /** Public case reference, e.g. NLG-VER-3KQ8FV. */
  reference: string;
  entityType: "landlord" | "property" | "room" | "student";
  entityId: string;
  /** Display name of the entity being verified (landlord name, property name, etc.). */
  entityLabel: string;
  /** Sub-type of the submission — drives the review checklist. */
  submissionType:
    | "student_kyc"
    | "landlord_identity"
    | "landlord_business"
    | "property_listing"
    | "room_evidence"
    | "inspection_report";
  status: VerificationStatus;
  /** Priority set by the queue or by escalation. */
  priority: "low" | "medium" | "high" | "urgent";
  evidence: VerificationEvidence[];
  inspectionRecords: InspectionRecord[];
  /** ID of the verification officer currently assigned. */
  assignedOfficerId?: string | null;
  /** SLA deadline for first review or resolution. */
  slaDueAt?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  reviewerId?: string | null;
  reviewNotes?: string | null;
  /** Internal notes — visible only to officers, never to applicants. */
  internalNotes?: InternalNote[];
  /** Reason recorded when status moved to rejected/escalated. */
  rejectionReason?: string | null;
  /** Escalation chain — populated when an officer escalates the case. */
  escalatedFrom?: string | null;
  escalatedTo?: "super_admin" | "finance_admin" | null;
  escalatedAt?: string | null;
  escalationReason?: string | null;
  outstandingActions: string[];
  createdAt: string;
  updatedAt: string;
}

/** Internal note attached to a verification case by an officer. */
export interface InternalNote {
  id: string;
  authorId: string;
  authorName: string;
  message: string;
  createdAt: string;
}

export interface InspectionRecord {
  id: string;
  scheduledAt: string;
  completedAt?: string | null;
  inspectorName: string;
  findings: string;
  recommendations: string;
  status: "scheduled" | "completed" | "cancelled" | "rescheduled";
  reportUrl?: string | null;
}

/* ------------------------------------------------------ Geography */

export interface University {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  city: string;
  state: string;
  /** Approximate geographic centre, used only when real coordinates exist. */
  latitude?: number | null;
  longitude?: number | null;
  description: string;
  logoUrl?: string | null;
  totalListings: number;
  popularNeighbourhoods: string[];
}

export interface Neighbourhood {
  id: string;
  slug: string;
  name: string;
  city: string;
  state: string;
  universityId?: string | null;
  /** Average rent in kobo per typical annual lease — informational only. */
  averageAnnualRentKobo?: number | null;
  walkingMinutesToCampus?: number | null;
  totalListings: number;
  imageUrl?: string | null;
}

/* ------------------------------------------------------ Properties */

export type PropertyType =
  | "hostel_block"
  | "apartment_building"
  | "terrace_house"
  | "detached_house"
  | "self_contain_block"
  | "shared_house";

export const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: "hostel_block", label: "Hostel block" },
  { value: "apartment_building", label: "Apartment building" },
  { value: "terrace_house", label: "Terrace house" },
  { value: "detached_house", label: "Detached house" },
  { value: "self_contain_block", label: "Self-contain block" },
  { value: "shared_house", label: "Shared house" },
];

export type PropertyStatus =
  | "draft"
  | "pending_verification"
  | "verified"
  | "rejected"
  | "archived";

export interface Property {
  id: string;
  slug: string;
  landlordId: string;
  managerIds: string[];
  agentIds: string[];
  name: string;
  description: string;
  type: PropertyType;
  status: PropertyStatus;
  verificationStatus: VerificationStatus;

  /* Location — never expose the exact room-level address publicly. */
  city: string;
  state: string;
  neighbourhoodId: string;
  universityId: string;
  /** Public-facing approximate address (street name + area only). */
  publicAddressLine: string;
  /** Private precise address — visible only to booked students and staff. */
  privateAddressLine: string;
  latitude?: number | null;
  longitude?: number | null;

  /* Building-wide facilities (shared, NOT in-room facilities). */
  facilities: Facility[];
  rules: PropertyRule[];
  images: PropertyImage[];

  /* Counts rolled up from rooms. */
  totalFloors: number;
  totalUnits: number;
  availableUnits: number;
  occupiedUnits: number;
  heldUnits: number;
  /** Lowest current room price in kobo — display only. */
  priceFromKobo: number;

  createdAt: string;
  updatedAt: string;
}

export interface PropertyImage {
  id: string;
  url: string;
  altText: string;
  /** Whether the image depicts the actual property or is representative. */
  isVerified: boolean;
  caption?: string | null;
  position: number;
}

export type Facility =
  | "wifi"
  | "power_backup"
  | "water_borehole"
  | "cctv"
  | "security_guard"
  | "parking"
  | "kitchen_shared"
  | "kitchen_private"
  | "laundry"
  | "study_room"
  | "gym"
  | "common_room"
  | "generator"
  | "solar_power"
  | "waste_disposal"
  | "furnished"
  | "wardrobe"
  | "bed_mattress"
  | "desk_chair"
  | "ac"
  | "fan"
  | "ensuite_bathroom"
  | "shared_bathroom"
  | "balcony"
  | "window";

export const FACILITY_LABELS: Record<Facility, string> = {
  wifi: "Wi-Fi",
  power_backup: "Power backup (inverter)",
  water_borehole: "Borehole water",
  cctv: "CCTV surveillance",
  security_guard: "Security guard",
  parking: "Parking",
  kitchen_shared: "Shared kitchen",
  kitchen_private: "Private kitchen",
  laundry: "Laundry",
  study_room: "Study room",
  gym: "Gym",
  common_room: "Common room",
  generator: "Generator",
  solar_power: "Solar power",
  waste_disposal: "Waste disposal",
  furnished: "Furnished",
  wardrobe: "Wardrobe",
  bed_mattress: "Bed & mattress",
  desk_chair: "Desk & chair",
  ac: "Air conditioning",
  fan: "Ceiling fan",
  ensuite_bathroom: "Ensuite bathroom",
  shared_bathroom: "Shared bathroom",
  balcony: "Balcony",
  window: "Window",
};

export interface PropertyRule {
  id: string;
  label: string;
  description?: string | null;
  category: "quiet_hours" | "visitors" | "pets" | "smoking" | "cooking" | "payment" | "other";
}

/* ------------------------------------------------------ Floors */

export interface Floor {
  id: string;
  propertyId: string;
  label: string;
  /** Numeric floor level. 0 = ground floor, -1 = basement, 1+ = upper floors. */
  level: number;
  description?: string | null;
  /** Default annual rent applied to all rooms on this floor, in kobo. */
  defaultPriceKobo?: number | null;
  totalUnits: number;
  availableUnits: number;
  position: number;
}

/* ------------------------------------------------------ Rentable units */

/**
 * The bookable entity. A two-bedroom apartment rented as a single unit is
 * represented as ONE RentableUnit with `unitType: "apartment"` and
 * `bedrooms: 2`, not as two independently bookable rooms.
 */
export type RentableUnitType =
  | "self_contain"
  | "single_room"
  | "shared_room"
  | "bed_space"
  | "apartment"
  | "studio";

export const UNIT_TYPE_LABELS: Record<RentableUnitType, string> = {
  self_contain: "Self-contain",
  single_room: "Single room",
  shared_room: "Shared room",
  bed_space: "Bed space",
  apartment: "Apartment",
  studio: "Studio",
};

export type RentableUnitStatus =
  | "available"
  | "held"
  | "occupied"
  | "maintenance"
  | "off_market";

export type RentalPeriod = "annual" | "biannual" | "quarterly" | "monthly";

export const RENTAL_PERIOD_LABELS: Record<RentalPeriod, string> = {
  annual: "Annual",
  biannual: "Biannual (2 payments/yr)",
  quarterly: "Quarterly (4 payments/yr)",
  monthly: "Monthly",
};

export interface RentableUnit {
  id: string;
  /** Stable human-readable identifier shown publicly (e.g. "B-101"). */
  identifier: string;
  /** Internal slug used in URLs. */
  slug: string;
  propertyId: string;
  floorId: string;
  unitType: RentableUnitType;
  status: RentableUnitStatus;

  /* Capacity & layout */
  capacity: number;
  bedrooms: number;
  bathrooms: number;
  hasBalcony: boolean;
  hasWindow: boolean;
  sizeSqM?: number | null;

  /* Facilities *inside* this specific unit (not building-wide). */
  facilities: Facility[];
  furnishing: "unfurnished" | "semi_furnished" | "fully_furnished";

  /* Imagery associated with THIS unit, not the building. */
  images: PropertyImage[];
  /** If true, displayed photos are representative, not of the exact unit. */
  representativeImagesOnly: boolean;

  /* Pricing in kobo. */
  annualRentKobo: number;
  rentalPeriod: RentalPeriod;
  /** Additional one-time or recurring charges. */
  additionalCharges: AdditionalCharge[];
  cautionDepositKobo?: number | null;

  /* Availability window. */
  availableFrom?: string | null;
  availableTo?: string | null;
  bookingTerms: string;

  /* Holds & active bookings — backend-controlled. */
  activeHoldId?: string | null;
  activeBookingId?: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface AdditionalCharge {
  id: string;
  label: string;
  amountKobo: number;
  /** Whether the charge is recurring or one-time. */
  frequency: "one_time" | "annual" | "monthly";
}

/* ------------------------------------------------------ Bookings */

export type BookingStatus =
  | "draft"
  | "pending_payment"
  | "payment_initiated"
  | "confirmed"
  | "active"
  | "completed"
  | "cancelled"
  | "refunded"
  | "expired";

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  draft: "Draft",
  pending_payment: "Pending payment",
  payment_initiated: "Payment initiated",
  confirmed: "Confirmed",
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
  expired: "Expired",
};

export type BookingStep =
  | "availability_check"
  | "temporary_hold"
  | "booking_creation"
  | "payment_initiation"
  | "payment_confirmation"
  | "booking_confirmation"
  | "payment_reconciliation"
  | "refund_or_payout";

export interface Booking {
  id: string;
  reference: string;
  studentId: string;
  propertyId: string;
  rentableUnitId: string;
  status: BookingStatus;
  /** The step of the secure workflow the booking currently occupies. */
  currentStep: BookingStep;

  checkIn: string;
  checkOut: string;
  rentalPeriod: RentalPeriod;

  /* Money in kobo */
  baseRentKobo: number;
  additionalChargesKobo: number;
  cautionDepositKobo: number;
  serviceFeeKobo: number;
  totalKobo: number;
  paidKobo: number;
  outstandingKobo: number;

  holdExpiresAt?: string | null;
  confirmedAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;

  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------ Payments */

export type PaymentStatus =
  | "initiated"
  | "pending"
  | "successful"
  | "failed"
  | "refunded"
  | "reversed";

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  initiated: "Initiated",
  pending: "Pending",
  successful: "Successful",
  failed: "Failed",
  refunded: "Refunded",
  reversed: "Reversed",
};

export type PaymentChannel = "paystack" | "bank_transfer" | "card" | "ussd";

export interface Payment {
  id: string;
  reference: string;
  /** Paystack transaction reference, populated after gateway confirmation. */
  gatewayReference?: string | null;
  bookingId: string;
  studentId: string;
  amountKobo: number;
  feeKobo: number;
  netKobo: number;
  currency: "NGN";
  channel: PaymentChannel;
  status: PaymentStatus;
  /** Frontend may display "initiated" but must not declare "successful" without backend confirmation. */
  confirmedByBackend: boolean;
  initiatedAt: string;
  confirmedAt?: string | null;
  failureReason?: string | null;
  receiptUrl?: string | null;
}

export type PayoutStatus =
  | "scheduled"
  | "in_flight"
  | "settled"
  | "failed"
  | "reversed";

export const PAYOUT_STATUS_LABELS: Record<PayoutStatus, string> = {
  scheduled: "Scheduled",
  in_flight: "In flight",
  settled: "Settled",
  failed: "Failed",
  reversed: "Reversed",
};

export interface Payout {
  id: string;
  reference: string;
  landlordId: string;
  bookingId: string;
  grossKobo: number;
  platformFeeKobo: number;
  netKobo: number;
  status: PayoutStatus;
  /** Settlement date — only populated when actually settled by backend. */
  settledAt?: string | null;
  bankAccountMasked: string;
  scheduledFor: string;
  createdAt: string;
  /** ID of the finance admin who approved/rejected the payout. */
  approvedBy?: string | null;
  approvedAt?: string | null;
  /** Reason recorded when a payout was rejected or reversed. */
  rejectionReason?: string | null;
  reversalReason?: string | null;
  /** Provider (Paystack transfer) reference, populated after dispatch. */
  providerReference?: string | null;
  /** Eligibility flags surfaced for the finance admin's review. */
  eligibilityFlags: string[];
}

/* ------------------------------------------------------ Notifications */

export type NotificationType =
  | "booking_update"
  | "payment_update"
  | "verification_update"
  | "message"
  | "system"
  | "promotion";

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href?: string | null;
  read: boolean;
  createdAt: string;
}

/* ------------------------------------------------------ Support */

export type SupportTicketStatus =
  | "open"
  | "in_progress"
  | "awaiting_user"
  | "resolved"
  | "closed";

export interface SupportTicket {
  id: string;
  reference: string;
  userId: string;
  subject: string;
  category: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: SupportTicketStatus;
  message: string;
  /** ID of the support agent currently assigned. */
  assignedTo?: string | null;
  /** Team/category the ticket is routed to. */
  team?: "general" | "payments" | "verification" | "safety" | "legal" | "technical" | null;
  /** When the first agent responded. Drives first-response-time metric. */
  firstResponseAt?: string | null;
  /** When the ticket was resolved. */
  resolvedAt?: string | null;
  /** SLA deadline for first response. */
  slaDueAt?: string | null;
  /** Whether the ticket has been escalated beyond the front-line queue. */
  escalated: boolean;
  escalatedTo?: "verification_officer" | "finance_admin" | "super_admin" | null;
  escalatedReason?: string | null;
  /** Related booking reference, when the ticket concerns a specific booking. */
  relatedBookingId?: string | null;
  /** Related payment reference, when applicable. */
  relatedPaymentReference?: string | null;
  /** Related property ID, when applicable. */
  relatedPropertyId?: string | null;
  /** Internal-only notes attached by support staff. */
  internalNotes?: InternalNote[];
  createdAt: string;
  updatedAt: string;
  replies: SupportTicketReply[];
}

export interface SupportTicketReply {
  id: string;
  author: "user" | "support";
  /** Display name of the author (for support-side replies). */
  authorName?: string | null;
  message: string;
  /** Whether the reply is internal-only (not visible to the customer). */
  internal?: boolean;
  createdAt: string;
}

/* ------------------------------------------------------ Search */

export interface SearchFilters {
  q?: string;
  universityId?: string;
  neighbourhoodId?: string;
  /** Min and max annual rent in kobo. */
  minPriceKobo?: number;
  maxPriceKobo?: number;
  unitTypes?: RentableUnitType[];
  rentalPeriod?: RentalPeriod;
  facilities?: Facility[];
  furnishing?: ("unfurnished" | "semi_furnished" | "fully_furnished")[];
  availableFrom?: string;
  availableTo?: string;
  verificationStatus?: VerificationStatus;
  sortBy?: "relevance" | "price_asc" | "price_desc" | "newest" | "distance";
  page?: number;
  pageSize?: number;
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  facets: {
    unitTypes: { value: RentableUnitType; count: number }[];
    facilities: { value: Facility; count: number }[];
    priceBuckets: { label: string; count: number }[];
  };
}

/* ------------------------------------------------------ Saved items */

export interface SavedProperty {
  id: string;
  userId: string;
  propertyId: string;
  savedAt: string;
  notes?: string | null;
}

/* =========================================================================
   ADMIN DOMAIN TYPES
   =========================================================================
   The types below back the four administrative workspaces (Verification
   Officer, Support Agent, Finance Administrator, Super Administrator). They
   are deliberately backend-agnostic and use the same conventions as the
   marketplace types above (integer kobo for money, ISO timestamps, explicit
   status enums).

   These types are the contract the production adapter (Supabase + server
   actions) will satisfy. The dev adapter returns deterministic fixtures in
   the same shapes.
   ========================================================================= */

/* ------------------------------------------------------ Refunds */

export type RefundStatus =
  | "requested"
  | "under_review"
  | "approved"
  | "rejected"
  | "processing"
  | "completed"
  | "failed";

export const REFUND_STATUS_LABELS: Record<RefundStatus, string> = {
  requested: "Requested",
  under_review: "Under review",
  approved: "Approved",
  rejected: "Rejected",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
};

export type RefundReason =
  | "booking_cancelled_within_24h"
  | "landlord_failed_to_confirm"
  | "duplicate_payment"
  | "failed_payment"
  | "service_not_delivered"
  | "mutual_agreement"
  | "policy_violation"
  | "other";

export interface Refund {
  id: string;
  reference: string;
  /** Original payment being refunded. */
  paymentId: string;
  paymentReference: string;
  bookingId: string;
  studentId: string;
  /** Refund amount in kobo — may be partial. */
  amountKobo: number;
  currency: "NGN";
  reason: RefundReason;
  reasonDetail: string;
  status: RefundStatus;
  /** ID of the finance admin who approved/rejected. */
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  /** Paystack refund reference, populated after provider confirms. */
  providerReference?: string | null;
  /** When the refund was actually completed by the provider. */
  completedAt?: string | null;
  failureReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------ Reconciliation */

export type ReconciliationStatus =
  | "matched"
  | "unmatched_provider"
  | "unmatched_internal"
  | "amount_discrepancy"
  | "duplicate_reference"
  | "settlement_date_mismatch"
  | "resolved";

export const RECONCILIATION_STATUS_LABELS: Record<ReconciliationStatus, string> = {
  matched: "Matched",
  unmatched_provider: "Unmatched (provider)",
  unmatched_internal: "Unmatched (internal)",
  amount_discrepancy: "Amount discrepancy",
  duplicate_reference: "Duplicate reference",
  settlement_date_mismatch: "Settlement date mismatch",
  resolved: "Resolved",
};

export interface ReconciliationRecord {
  id: string;
  /** Internal transaction reference. */
  internalReference: string;
  /** Provider (Paystack) transaction reference. */
  providerReference?: string | null;
  internalAmountKobo: number;
  providerAmountKobo?: number | null;
  internalSettledAt?: string | null;
  providerSettledAt?: string | null;
  status: ReconciliationStatus;
  /** Officer/admin who marked the record resolved. */
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  resolutionNotes?: string | null;
  createdAt: string;
}

/* ------------------------------------------------------ Audit logs */

/**
 * Immutable record of an administrative action. Audit logs MUST NOT be
 * editable or deletable through any ordinary application interface — they
 * are the trust anchor for compliance and dispute resolution.
 */
export type AuditActionCategory =
  | "auth"
  | "user_management"
  | "role_management"
  | "verification"
  | "support"
  | "finance"
  | "payout"
  | "refund"
  | "configuration"
  | "security"
  | "integration";

export type AuditSeverity = "info" | "warning" | "critical";

export interface AuditLog {
  id: string;
  /** When the action occurred. */
  timestamp: string;
  /** ID of the user who performed the action. */
  actorId: string;
  actorEmail: string;
  actorRole: UserRole;
  /** Category of the action — drives filtering in the audit log viewer. */
  category: AuditActionCategory;
  /** Specific action taken, e.g. "user.suspend", "payout.approve". */
  action: string;
  /** Type of resource affected, e.g. "user", "payout", "verification_case". */
  resourceType: string;
  /** ID of the affected resource. */
  resourceId: string;
  /** Human-readable summary of the action. */
  summary: string;
  /** Severity — drives alerting. */
  severity: AuditSeverity;
  /** IP address of the actor, when known. */
  ipAddress?: string | null;
  /** User agent of the actor, when known. */
  userAgent?: string | null;
  /** Before/after snapshot for state-changing actions. */
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}

/* ------------------------------------------------------ Platform settings */

export type PlatformSettingType =
  | "string"
  | "number"
  | "boolean"
  | "json"
  | "percentage";

export interface PlatformSetting {
  id: string;
  /** Dotted key, e.g. "commission.default_rate", "booking.hold_hours". */
  key: string;
  label: string;
  description: string;
  type: PlatformSettingType;
  /** Current value, serialised as a string. */
  value: string;
  /** Unit hint for display, e.g. "%", "hours", "NGN". */
  unit?: string | null;
  /** Category for grouping in the admin UI. */
  category: "commission" | "booking" | "verification" | "support" | "payments" | "operations" | "security";
  /** Whether changing this setting requires reauthentication. */
  requiresReauth: boolean;
  /** Last updated at. */
  updatedAt: string;
  /** ID of the admin who last updated the setting. */
  updatedBy?: string | null;
}

/* ------------------------------------------------------ Integration health */

export type IntegrationStatus = "operational" | "degraded" | "outage" | "maintenance";

export const INTEGRATION_STATUS_LABELS: Record<IntegrationStatus, string> = {
  operational: "Operational",
  degraded: "Degraded",
  outage: "Outage",
  maintenance: "Maintenance",
};

export interface IntegrationHealth {
  id: string;
  /** Integration name, e.g. "Paystack", "Supabase Auth", "Cloudinary". */
  name: string;
  /** Service category. */
  category: "payments" | "database" | "storage" | "auth" | "email" | "sms" | "analytics";
  status: IntegrationStatus;
  /** Last successful heartbeat / ping timestamp. */
  lastSuccessAt?: string | null;
  /** Last error message, when degraded or in outage. */
  lastError?: string | null;
  lastErrorAt?: string | null;
  /** Uptime percentage over the last 24 hours. */
  uptime24h: number;
  /** Average response time in ms over the last hour. */
  avgResponseMs: number;
  /** Whether the integration is currently enabled. */
  enabled: boolean;
}

/* ------------------------------------------------------ Permissions (admin) */

/**
 * Coarse-grained permission groups. Each role maps to a set of these groups,
 * and each group maps to a set of fine-grained `Action` values (defined in
 * `@/lib/auth/permissions`). This two-level model keeps the role-permission
 * matrix readable while staying extensible.
 */
export type PermissionGroup =
  | "marketplace:student"
  | "marketplace:landlord"
  | "marketplace:manager"
  | "marketplace:agent"
  | "verification:review"
  | "verification:assign"
  | "verification:escalate"
  | "support:handle"
  | "support:assign"
  | "support:escalate"
  | "finance:view"
  | "finance:refund"
  | "finance:payout"
  | "finance:reconcile"
  | "admin:manage_users"
  | "admin:manage_roles"
  | "admin:manage_settings"
  | "admin:view_audit"
  | "admin:manage_integrations";

/* ------------------------------------------------------ Knowledge base */

export interface KnowledgeBaseArticle {
  id: string;
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  content: string;
  tags: string[];
  /** Number of times the article has been viewed. */
  views: number;
  /** Whether the article is published and visible to support agents. */
  published: boolean;
  updatedAt: string;
  authorId: string;
}

/* ------------------------------------------------------ Announcements */

export interface SystemAnnouncement {
  id: string;
  title: string;
  body: string;
  /** Audience that will see the announcement. */
  audience: "all" | "students" | "landlords" | "staff" | "admins";
  severity: "info" | "warning" | "critical";
  active: boolean;
  /** When the announcement should start being shown. */
  startsAt: string;
  /** When the announcement should stop being shown. */
  endsAt?: string | null;
  createdAt: string;
  createdBy: string;
}

/* ------------------------------------------------------ Disputes */

export type DisputeStatus =
  | "open"
  | "under_investigation"
  | "evidence_requested"
  | "resolved_in_favor_of_student"
  | "resolved_in_favor_of_landlord"
  | "closed";

export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
  open: "Open",
  under_investigation: "Under investigation",
  evidence_requested: "Evidence requested",
  resolved_in_favor_of_student: "Resolved for student",
  resolved_in_favor_of_landlord: "Resolved for landlord",
  closed: "Closed",
};

export interface Dispute {
  id: string;
  reference: string;
  bookingId: string;
  studentId: string;
  landlordId: string;
  subject: string;
  description: string;
  status: DisputeStatus;
  /** Amount in dispute, in kobo. */
  amountKobo: number;
  openedAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  resolutionNotes?: string | null;
  /** Evidence attached by either party. */
  evidence: { id: string; uploaderId: string; fileName: string; uploadedAt: string }[];
}

