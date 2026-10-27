/**
 * Repository contracts.
 *
 * Each repository defines a typed interface for a slice of the domain. The dev
 * adapter in `@/lib/repositories/dev-adapter` returns deterministic fixture
 * data; the production adapter (to be implemented alongside the Supabase
 * backend) will satisfy the same interface.
 *
 * Switching adapters is done via the `REPOSITORY_ADAPTER` env var (see
 * `@/lib/repositories/index.ts`).
 *
 * Security note: privileged operations (approve verification, approve payout,
 * issue refund, change user role, etc.) are exposed here as typed methods so
 * the UI can call them — but the production adapter MUST route each one
 * through a server action that independently authorises the caller, records
 * an audit log, and (for the most sensitive) requires reauthentication. The
 * dev adapter simulates these calls against fixtures and NEVER claims a real
 * provider confirmation.
 */

import type {
  University,
  Neighbourhood,
  Property,
  Floor,
  RentableUnit,
  Booking,
  Payment,
  Payout,
  AppNotification,
  SupportTicket,
  SupportTicketStatus,
  SavedProperty,
  SearchFilters,
  SearchResult,
  VerificationRecord,
  VerificationStatus,
  RentableUnitType,
  RentalPeriod,
  User,
  UserRole,
  Refund,
  RefundReason,
  RefundStatus,
  ReconciliationRecord,
  ReconciliationStatus,
  AuditLog,
  AuditActionCategory,
  AuditSeverity,
  PlatformSetting,
  IntegrationHealth,
  KnowledgeBaseArticle,
  SystemAnnouncement,
  Dispute,
  DisputeStatus,
  InternalNote,
  PaymentChannel,
} from "@/lib/types";

/* ------------------------------------------------------------------ Filters */

/** Generic filter shape for admin list endpoints. */
export interface AdminListFilters {
  q?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  /** Optional date range. */
  from?: string;
  to?: string;
}

export interface VerificationListFilters extends AdminListFilters {
  status?: VerificationStatus;
  submissionType?: VerificationRecord["submissionType"];
  entityType?: VerificationRecord["entityType"];
  assignedOfficerId?: string;
  escalated?: boolean;
  overdue?: boolean;
}

export interface SupportListFilters extends AdminListFilters {
  status?: SupportTicketStatus;
  priority?: "low" | "medium" | "high" | "urgent";
  team?: NonNullable<SupportTicket["team"]>;
  assignedTo?: string;
  escalated?: boolean;
}

export interface PayoutListFilters extends AdminListFilters {
  status?: Payout["status"];
  landlordId?: string;
}

export interface PaymentListFilters extends AdminListFilters {
  status?: Payment["status"];
  channel?: PaymentChannel;
  bookingId?: string;
}

export interface RefundListFilters extends AdminListFilters {
  status?: RefundStatus;
  reason?: RefundReason;
}

export interface ReconciliationListFilters extends AdminListFilters {
  status?: ReconciliationStatus;
}

export interface UserListFilters extends AdminListFilters {
  role?: UserRole;
  active?: boolean;
}

export interface AuditLogFilters extends AdminListFilters {
  category?: AuditActionCategory;
  severity?: AuditSeverity;
  actorId?: string;
  resourceType?: string;
}

export interface DisputeListFilters extends AdminListFilters {
  status?: DisputeStatus;
}

/* ------------------------------------------------------------------ Marketplace */

export interface UniversityRepository {
  list(): Promise<University[]>;
  getBySlug(slug: string): Promise<University | null>;
  getById(id: string): Promise<University | null>;
  create(input: Omit<University, "id" | "totalListings">): Promise<University>;
  update(id: string, patch: Partial<University>): Promise<University>;
  delete(id: string): Promise<void>;
}

export interface NeighbourhoodRepository {
  list(): Promise<Neighbourhood[]>;
  getBySlug(slug: string): Promise<Neighbourhood | null>;
  listByUniversity(universityId: string): Promise<Neighbourhood[]>;
}

export interface PropertyRepository {
  list(): Promise<Property[]>;
  listFeatured(): Promise<Property[]>;
  getBySlug(slug: string): Promise<Property | null>;
  getById(id: string): Promise<Property | null>;
  listByLandlord(landlordId: string): Promise<Property[]>;
  listByManager(managerId: string): Promise<Property[]>;
  listByAgent(agentId: string): Promise<Property[]>;
  search(filters: SearchFilters): Promise<SearchResult<Property>>;
}

export interface FloorRepository {
  listByProperty(propertyId: string): Promise<Floor[]>;
  create(input: Omit<Floor, "id" | "totalUnits" | "availableUnits">): Promise<Floor>;
  update(id: string, patch: Partial<Floor>): Promise<Floor>;
  delete(id: string): Promise<void>;
}

export interface RoomRepository {
  listByProperty(propertyId: string): Promise<RentableUnit[]>;
  listByFloor(floorId: string): Promise<RentableUnit[]>;
  getById(id: string): Promise<RentableUnit | null>;
  create(input: Omit<RentableUnit, "id" | "slug" | "createdAt" | "updatedAt">): Promise<RentableUnit>;
  bulkCreate(input: {
    floorId: string;
    prefix: string;
    startIndex: number;
    count: number;
    base: Omit<RentableUnit, "id" | "slug" | "identifier" | "floorId" | "createdAt" | "updatedAt">;
  }): Promise<RentableUnit[]>;
  update(id: string, patch: Partial<RentableUnit>): Promise<RentableUnit>;
  bulkUpdatePrices(input: { roomIds: string[]; annualRentKobo: number }): Promise<number>;
  delete(id: string): Promise<void>;
}

export interface BookingRepository {
  listByStudent(studentId: string): Promise<Booking[]>;
  listByProperty(propertyId: string): Promise<Booking[]>;
  listByLandlord(landlordId: string): Promise<Booking[]>;
  listAll(filters: AdminListFilters): Promise<{ items: Booking[]; total: number }>;
  getById(id: string): Promise<Booking | null>;
  initiate(input: {
    studentId: string;
    rentableUnitId: string;
    checkIn: string;
    rentalPeriod: RentalPeriod;
  }): Promise<Booking>;
  cancel(id: string, reason: string): Promise<Booking>;
}

export interface PaymentRepository {
  listByStudent(studentId: string): Promise<Payment[]>;
  listByBooking(bookingId: string): Promise<Payment[]>;
  listAll(filters: PaymentListFilters): Promise<{ items: Payment[]; total: number }>;
  getById(id: string): Promise<Payment | null>;
  initiate(input: { bookingId: string; channel: Payment["channel"] }): Promise<Payment>;
  /** Confirm a payment. Only the backend may call this in production. */
  confirm(reference: string): Promise<Payment>;
}

export interface PayoutRepository {
  listByLandlord(landlordId: string): Promise<Payout[]>;
  listAll(filters: PayoutListFilters): Promise<{ items: Payout[]; total: number }>;
  getById(id: string): Promise<Payout | null>;
  /**
   * Approve a pending payout. Records the approver and flips status to
   * `scheduled` (or `in_flight` if dispatched immediately). The actual bank
   * transfer is initiated by the backend — this method does NOT claim a
   * provider confirmation.
   */
  approve(id: string, approverId: string, notes?: string): Promise<Payout>;
  reject(id: string, approverId: string, reason: string): Promise<Payout>;
  /**
   * Reverse a settled or in-flight payout. Requires a reason and is audit-
   * logged. The actual reversal is performed by the backend via Paystack.
   */
  reverse(id: string, approverId: string, reason: string): Promise<Payout>;
  /** Mark a payout as settled — only the backend calls this in production. */
  markSettled(id: string, providerReference: string): Promise<Payout>;
}

export interface NotificationRepository {
  listByUser(userId: string): Promise<AppNotification[]>;
  markRead(id: string): Promise<void>;
  markAllRead(userId: string): Promise<void>;
}

export interface SupportRepository {
  listByUser(userId: string): Promise<SupportTicket[]>;
  listAll(filters: SupportListFilters): Promise<{ items: SupportTicket[]; total: number }>;
  getById(id: string): Promise<SupportTicket | null>;
  create(input: Pick<SupportTicket, "subject" | "category" | "priority" | "message">): Promise<SupportTicket>;
  /** Customer-side reply. */
  reply(ticketId: string, message: string): Promise<SupportTicket>;
  /** Staff-side reply (visible to customer unless `internal` is true). */
  replyAsStaff(ticketId: string, message: string, opts: { authorId: string; authorName: string; internal?: boolean }): Promise<SupportTicket>;
  assignTo(ticketId: string, agentId: string | null): Promise<SupportTicket>;
  updateStatus(ticketId: string, status: SupportTicketStatus, opts: { actorId: string; reason?: string }): Promise<SupportTicket>;
  escalate(ticketId: string, opts: { actorId: string; to: NonNullable<SupportTicket["escalatedTo"]>; reason: string }): Promise<SupportTicket>;
  addInternalNote(ticketId: string, note: Omit<InternalNote, "id" | "createdAt">): Promise<SupportTicket>;
}

export interface SavedPropertyRepository {
  listByUser(userId: string): Promise<SavedProperty[]>;
  toggle(userId: string, propertyId: string): Promise<boolean>;
}

export interface VerificationRepository {
  /** Landlord-side: get the landlord's own verification record. */
  getForLandlord(landlordId: string): Promise<VerificationRecord | null>;
  /** Landlord-side: submit evidence for verification. */
  submit(landlordId: string, evidenceIds: string[]): Promise<VerificationRecord>;
  /** Officer-side: list all verification cases with filters. */
  listAll(filters: VerificationListFilters): Promise<{ items: VerificationRecord[]; total: number }>;
  /** Officer-side: get a single case by ID. */
  getById(id: string): Promise<VerificationRecord | null>;
  /** Officer-side: assign a case to an officer. */
  assignTo(id: string, officerId: string | null): Promise<VerificationRecord>;
  /** Officer-side: approve the case. Audit-logged. */
  approve(id: string, opts: { reviewerId: string; reviewerName: string; notes: string }): Promise<VerificationRecord>;
  /** Officer-side: reject the case. Requires a reason. Audit-logged. */
  reject(id: string, opts: { reviewerId: string; reviewerName: string; reason: string; notes?: string }): Promise<VerificationRecord>;
  /** Officer-side: request additional information from the applicant. */
  requestInfo(id: string, opts: { reviewerId: string; reviewerName: string; request: string }): Promise<VerificationRecord>;
  /** Officer-side: escalate to a higher administrator. */
  escalate(id: string, opts: { reviewerId: string; reviewerName: string; to: NonNullable<VerificationRecord["escalatedTo"]>; reason: string }): Promise<VerificationRecord>;
  /** Officer-side: record an on-site inspection. */
  recordInspection(id: string, inspection: { inspectorName: string; findings: string; recommendations: string; completedAt: string }): Promise<VerificationRecord>;
  /** Officer-side: add an internal note (never visible to applicants). */
  addInternalNote(id: string, note: Omit<InternalNote, "id" | "createdAt">): Promise<VerificationRecord>;
  /** Officer-side: decision history for the current officer or all officers. */
  history(opts: { officerId?: string; from?: string; to?: string }): Promise<VerificationRecord[]>;
}

/* ------------------------------------------------------------------ Admin-only */

export interface UserRepository {
  list(filters: UserListFilters): Promise<{ items: User[]; total: number }>;
  getById(id: string): Promise<User | null>;
  getByEmail(email: string): Promise<User | null>;
  /**
   * Change a user's role. Audit-logged. The production adapter MUST prevent
   * privilege escalation (e.g. a finance_admin granting themselves super_admin)
   * and MUST NOT allow the last super_admin to be demoted.
   */
  updateRole(id: string, opts: { actorId: string; newRole: UserRole; reason: string }): Promise<User>;
  /** Suspend an account. Audit-logged. */
  deactivate(id: string, opts: { actorId: string; reason: string }): Promise<User>;
  /** Reactivate a suspended account. Audit-logged. */
  reactivate(id: string, opts: { actorId: string; reason: string }): Promise<User>;
}

export interface RefundRepository {
  listAll(filters: RefundListFilters): Promise<{ items: Refund[]; total: number }>;
  getById(id: string): Promise<Refund | null>;
  /** Create a refund request. */
  create(input: { paymentId: string; amountKobo: number; reason: RefundReason; reasonDetail: string; createdBy: string }): Promise<Refund>;
  /** Approve a refund request. Audit-logged. Does NOT confirm provider success. */
  approve(id: string, opts: { reviewerId: string; notes?: string }): Promise<Refund>;
  /** Reject a refund request. Audit-logged. */
  reject(id: string, opts: { reviewerId: string; reason: string }): Promise<Refund>;
  /** Mark a refund as completed — only the backend calls this in production. */
  markCompleted(id: string, providerReference: string): Promise<Refund>;
}

export interface ReconciliationRepository {
  listAll(filters: ReconciliationListFilters): Promise<{ items: ReconciliationRecord[]; total: number }>;
  getById(id: string): Promise<ReconciliationRecord | null>;
  /** Mark a discrepancy as resolved. Audit-logged. */
  resolve(id: string, opts: { resolverId: string; notes: string }): Promise<ReconciliationRecord>;
  /**
   * Run a reconciliation pass against the provider's settlement report. In
   * dev mode this is a no-op that returns the existing records. In production
   * it fetches the Paystack settlement report and matches it against internal
   * payment records.
   */
  runReconciliation(opts: { actorId: string; from: string; to: string }): Promise<{ matched: number; unmatched: number; discrepancies: number }>;
}

export interface AuditLogRepository {
  list(filters: AuditLogFilters): Promise<{ items: AuditLog[]; total: number }>;
  /** Record an audit entry. Used by other repositories after state changes. */
  record(entry: Omit<AuditLog, "id" | "timestamp">): Promise<AuditLog>;
}

export interface PlatformSettingRepository {
  list(): Promise<PlatformSetting[]>;
  listByCategory(category: PlatformSetting["category"]): Promise<PlatformSetting[]>;
  getByKey(key: string): Promise<PlatformSetting | null>;
  /**
   * Update a setting. Audit-logged. Settings flagged `requiresReauth` must
   * be preceded by a reauthentication step on the backend.
   */
  update(key: string, opts: { actorId: string; value: string }): Promise<PlatformSetting>;
}

export interface IntegrationHealthRepository {
  list(): Promise<IntegrationHealth[]>;
  getById(id: string): Promise<IntegrationHealth | null>;
  /** Toggle an integration on/off. Audit-logged. */
  toggle(id: string, opts: { actorId: string; enabled: boolean; reason: string }): Promise<IntegrationHealth>;
}

export interface KnowledgeBaseRepository {
  list(): Promise<KnowledgeBaseArticle[]>;
  getBySlug(slug: string): Promise<KnowledgeBaseArticle | null>;
  create(input: Omit<KnowledgeBaseArticle, "id" | "updatedAt" | "views">): Promise<KnowledgeBaseArticle>;
  update(id: string, patch: Partial<KnowledgeBaseArticle>): Promise<KnowledgeBaseArticle>;
  delete(id: string): Promise<void>;
  incrementViews(id: string): Promise<void>;
}

export interface SystemAnnouncementRepository {
  list(): Promise<SystemAnnouncement[]>;
  listActive(audience: SystemAnnouncement["audience"]): Promise<SystemAnnouncement[]>;
  create(input: Omit<SystemAnnouncement, "id" | "createdAt" | "createdBy">, opts: { actorId: string }): Promise<SystemAnnouncement>;
  update(id: string, patch: Partial<SystemAnnouncement>): Promise<SystemAnnouncement>;
  delete(id: string): Promise<void>;
}

export interface DisputeRepository {
  listAll(filters: DisputeListFilters): Promise<{ items: Dispute[]; total: number }>;
  getById(id: string): Promise<Dispute | null>;
  resolve(id: string, opts: { resolverId: string; status: DisputeStatus; notes: string }): Promise<Dispute>;
}

/* ------------------------------------------------------------------ Aggregator */

export interface Repositories {
  // Marketplace
  universities: UniversityRepository;
  neighbourhoods: NeighbourhoodRepository;
  properties: PropertyRepository;
  floors: FloorRepository;
  rooms: RoomRepository;
  bookings: BookingRepository;
  payments: PaymentRepository;
  payouts: PayoutRepository;
  notifications: NotificationRepository;
  support: SupportRepository;
  savedProperties: SavedPropertyRepository;
  verification: VerificationRepository;
  // Admin
  users: UserRepository;
  refunds: RefundRepository;
  reconciliation: ReconciliationRepository;
  auditLogs: AuditLogRepository;
  platformSettings: PlatformSettingRepository;
  integrationHealth: IntegrationHealthRepository;
  knowledgeBase: KnowledgeBaseRepository;
  announcements: SystemAnnouncementRepository;
  disputes: DisputeRepository;
}
