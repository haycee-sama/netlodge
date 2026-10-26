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

export type UserRole = "student" | "landlord" | "manager" | "agent";

export const USER_ROLES: UserRole[] = [
  "student",
  "landlord",
  "manager",
  "agent",
];

/** Roles excluded from this implementation phase but reserved in the schema. */
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
  entityType: "landlord" | "property";
  entityId: string;
  status: VerificationStatus;
  evidence: VerificationEvidence[];
  inspectionRecords: InspectionRecord[];
  submittedAt?: string | null;
  reviewedAt?: string | null;
  reviewerId?: string | null;
  reviewNotes?: string | null;
  outstandingActions: string[];
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
  | " hostel_block"
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
  createdAt: string;
  updatedAt: string;
  replies: SupportTicketReply[];
}

export interface SupportTicketReply {
  id: string;
  author: "user" | "support";
  message: string;
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
