/**
 * Development repository adapter.
 *
 * All methods return data from `/lib/data/fixtures`. Nothing here persists —
 * writes return updated objects but do not survive a refresh. This adapter is
 * intended for local UI development only.
 *
 * Replace with `prod-adapter.ts` (Supabase + server actions) for production.
 */

import * as fixtures from "@/lib/data/fixtures";
import * as adminFixtures from "@/lib/data/admin-fixtures";
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
  RentalPeriod,
  Facility,
  RentableUnitType,
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
import type {
  Repositories,
  AdminListFilters,
  VerificationListFilters,
  SupportListFilters,
  PayoutListFilters,
  PaymentListFilters,
  RefundListFilters,
  ReconciliationListFilters,
  UserListFilters,
  AuditLogFilters,
  DisputeListFilters,
} from "./contracts";

const delay = (ms = 120) => new Promise<void>((r) => setTimeout(r, ms));
const iso = (d = new Date()) => d.toISOString();

/* ------------------------------------------------------------- Universities */

const universityRepo = {
  async list() {
    await delay();
    return fixtures.universities;
  },
  async getBySlug(slug: string) {
    await delay();
    return fixtures.getUniversityBySlug(slug) ?? null;
  },
  async getById(id: string) {
    await delay();
    return fixtures.universities.find((u) => u.id === id) ?? null;
  },
  async create(input: Omit<University, "id" | "totalListings">) {
    await delay();
    const u: University = { ...input, id: `uni_${Math.random().toString(36).slice(2, 8)}`, totalListings: 0 };
    fixtures.universities.push(u);
    return u;
  },
  async update(id: string, patch: Partial<University>) {
    await delay();
    const u = fixtures.universities.find((x) => x.id === id);
    if (!u) throw new Error("University not found");
    Object.assign(u, patch);
    return u;
  },
  async delete(id: string) {
    await delay();
    const idx = fixtures.universities.findIndex((x) => x.id === id);
    if (idx !== -1) fixtures.universities.splice(idx, 1);
  },
};

/* ----------------------------------------------------------- Neighbourhoods */

const neighbourhoodRepo = {
  async list() {
    await delay();
    return fixtures.neighbourhoods;
  },
  async getBySlug(slug: string) {
    await delay();
    return fixtures.getNeighbourhoodBySlug(slug) ?? null;
  },
  async listByUniversity(universityId: string) {
    await delay();
    return fixtures.neighbourhoods.filter((n) => n.universityId === universityId);
  },
};

/* --------------------------------------------------------------- Properties */

function matchesFilters(p: Property, filters: SearchFilters): boolean {
  if (filters.universityId && p.universityId !== filters.universityId) return false;
  if (filters.neighbourhoodId && p.neighbourhoodId !== filters.neighbourhoodId) return false;
  if (filters.verificationStatus && p.verificationStatus !== filters.verificationStatus) return false;
  if (filters.q) {
    const q = filters.q.toLowerCase();
    const blob = `${p.name} ${p.description} ${p.publicAddressLine} ${p.city}`.toLowerCase();
    if (!blob.includes(q)) return false;
  }
  // Price filter is checked against rooms in the property.
  const rooms = fixtures.getRoomsForProperty(p.id);
  if (filters.minPriceKobo !== undefined && rooms.every((r) => r.annualRentKobo < filters.minPriceKobo!)) return false;
  if (filters.maxPriceKobo !== undefined && rooms.every((r) => r.annualRentKobo > filters.maxPriceKobo!)) return false;
  if (filters.unitTypes?.length && !rooms.some((r) => filters.unitTypes!.includes(r.unitType))) return false;
  if (filters.facilities?.length) {
    const hasAll = filters.facilities.every((f) =>
      rooms.some((r) => r.facilities.includes(f as Facility)) || p.facilities.includes(f as Facility),
    );
    if (!hasAll) return false;
  }
  return true;
}

const propertyRepo = {
  async list() {
    await delay();
    return fixtures.properties;
  },
  async listFeatured() {
    await delay();
    return fixtures.properties.filter((p) => p.status === "verified").slice(0, 6);
  },
  async getBySlug(slug: string) {
    await delay();
    return fixtures.getPropertyBySlug(slug) ?? null;
  },
  async getById(id: string) {
    await delay();
    return fixtures.properties.find((p) => p.id === id) ?? null;
  },
  async listByLandlord(landlordId: string) {
    await delay();
    return fixtures.properties.filter((p) => p.landlordId === landlordId);
  },
  async listByManager(managerId: string) {
    await delay();
    return fixtures.properties.filter((p) => p.managerIds.includes(managerId));
  },
  async listByAgent(agentId: string) {
    await delay();
    return fixtures.properties.filter((p) => p.agentIds.includes(agentId));
  },
  async search(filters: SearchFilters): Promise<SearchResult<Property>> {
    await delay(180);
    const all = fixtures.properties.filter((p) => matchesFilters(p, filters));
    const sortBy = filters.sortBy ?? "relevance";
    const sorted = [...all];
    if (sortBy === "price_asc") sorted.sort((a, b) => a.priceFromKobo - b.priceFromKobo);
    if (sortBy === "price_desc") sorted.sort((a, b) => b.priceFromKobo - a.priceFromKobo);
    if (sortBy === "newest") sorted.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 9;
    const items = sorted.slice((page - 1) * pageSize, page * pageSize);

    // Facets
    const unitTypeCounts = new Map<RentableUnitType, number>();
    const facilityCounts = new Map<Facility, number>();
    fixtures.rooms.forEach((r) => {
      unitTypeCounts.set(r.unitType, (unitTypeCounts.get(r.unitType) ?? 0) + 1);
      r.facilities.forEach((f) => facilityCounts.set(f, (facilityCounts.get(f) ?? 0) + 1));
    });

    return {
      items,
      total: all.length,
      page,
      pageSize,
      facets: {
        unitTypes: Array.from(unitTypeCounts.entries()).map(([value, count]) => ({ value, count })),
        facilities: Array.from(facilityCounts.entries()).map(([value, count]) => ({ value, count })),
        priceBuckets: [
          { label: "Under ₦400K", count: fixtures.rooms.filter((r) => r.annualRentKobo < 40_000_000).length },
          { label: "₦400K–₦600K", count: fixtures.rooms.filter((r) => r.annualRentKobo >= 40_000_000 && r.annualRentKobo < 60_000_000).length },
          { label: "₦600K–₦1M", count: fixtures.rooms.filter((r) => r.annualRentKobo >= 60_000_000 && r.annualRentKobo < 100_000_000).length },
          { label: "Over ₦1M", count: fixtures.rooms.filter((r) => r.annualRentKobo >= 100_000_000).length },
        ],
      },
    };
  },
};

/* ------------------------------------------------------------------- Floors */

const floorRepo = {
  async listByProperty(propertyId: string) {
    await delay();
    return fixtures.getFloorsForProperty(propertyId);
  },
  async create(input: Omit<Floor, "id" | "totalUnits" | "availableUnits">) {
    await delay();
    const floor: Floor = {
      ...input,
      id: `flr_${Math.random().toString(36).slice(2, 8)}`,
      totalUnits: 0,
      availableUnits: 0,
    };
    fixtures.floors.push(floor);
    return floor;
  },
  async update(id: string, patch: Partial<Floor>) {
    await delay();
    const idx = fixtures.floors.findIndex((f) => f.id === id);
    if (idx === -1) throw new Error("Floor not found");
    fixtures.floors[idx] = { ...fixtures.floors[idx], ...patch };
    return fixtures.floors[idx];
  },
  async delete(id: string) {
    await delay();
    const idx = fixtures.floors.findIndex((f) => f.id === id);
    if (idx !== -1) fixtures.floors.splice(idx, 1);
  },
};

/* ------------------------------------------------------------------- Rooms */

const roomRepo = {
  async listByProperty(propertyId: string) {
    await delay();
    return fixtures.getRoomsForProperty(propertyId);
  },
  async listByFloor(floorId: string) {
    await delay();
    return fixtures.rooms.filter((r) => r.floorId === floorId);
  },
  async getById(id: string) {
    await delay();
    return fixtures.getRoomById(id) ?? null;
  },
  async create(input: Omit<RentableUnit, "id" | "slug" | "createdAt" | "updatedAt">) {
    await delay();
    const now = iso();
    const room: RentableUnit = {
      ...input,
      id: `room_${Math.random().toString(36).slice(2, 9)}`,
      slug: input.identifier.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      createdAt: now,
      updatedAt: now,
    };
    fixtures.rooms.push(room);
    return room;
  },
  async bulkCreate(input: {
    floorId: string;
    prefix: string;
    startIndex: number;
    count: number;
    base: Omit<RentableUnit, "id" | "slug" | "identifier" | "floorId" | "createdAt" | "updatedAt">;
  }) {
    await delay(200);
    const created: RentableUnit[] = [];
    const now = iso();
    for (let i = 0; i < input.count; i++) {
      const num = input.startIndex + i;
      const identifier = `${input.prefix}-${String(num).padStart(3, "0")}`;
      created.push({
        ...input.base,
        identifier,
        slug: identifier.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        floorId: input.floorId,
        id: `room_${Math.random().toString(36).slice(2, 9)}`,
        createdAt: now,
        updatedAt: now,
      });
    }
    fixtures.rooms.push(...created);
    return created;
  },
  async update(id: string, patch: Partial<RentableUnit>) {
    await delay();
    const idx = fixtures.rooms.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error("Room not found");
    fixtures.rooms[idx] = { ...fixtures.rooms[idx], ...patch, updatedAt: iso() };
    return fixtures.rooms[idx];
  },
  async bulkUpdatePrices(input: { roomIds: string[]; annualRentKobo: number }) {
    await delay(180);
    let count = 0;
    fixtures.rooms.forEach((r) => {
      if (input.roomIds.includes(r.id)) {
        r.annualRentKobo = input.annualRentKobo;
        r.updatedAt = iso();
        count += 1;
      }
    });
    return count;
  },
  async delete(id: string) {
    await delay();
    const idx = fixtures.rooms.findIndex((r) => r.id === id);
    if (idx !== -1) fixtures.rooms.splice(idx, 1);
  },
};

/* ----------------------------------------------------------------- Bookings */

const bookingRepo = {
  async listByStudent(studentId: string) {
    await delay();
    return fixtures.getBookingsForStudent(studentId);
  },
  async listByProperty(propertyId: string) {
    await delay();
    return fixtures.bookings.filter((b) => b.propertyId === propertyId);
  },
  async listByLandlord(landlordId: string) {
    await delay();
    const props = fixtures.properties.filter((p) => p.landlordId === landlordId);
    const propIds = new Set(props.map((p) => p.id));
    return fixtures.bookings.filter((b) => propIds.has(b.propertyId));
  },
  async listAll(filters: import("./contracts").AdminListFilters) {
    await delay(150);
    let items = [...fixtures.bookings];
    if (filters.q) {
      const q = filters.q.toLowerCase();
      items = items.filter(
        (b) => b.reference.toLowerCase().includes(q) || b.studentId.toLowerCase().includes(q),
      );
    }
    const total = items.length;
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const paged = items.slice((page - 1) * pageSize, page * pageSize);
    return { items: paged, total };
  },
  async getById(id: string) {
    await delay();
    return fixtures.bookings.find((b) => b.id === id) ?? null;
  },
  async initiate(input: {
    studentId: string;
    rentableUnitId: string;
    checkIn: string;
    rentalPeriod: RentalPeriod;
  }) {
    await delay();
    const room = fixtures.getRoomById(input.rentableUnitId);
    if (!room) throw new Error("Room not found");
    if (room.status !== "available") throw new Error("Room is not available");
    const baseRent = room.annualRentKobo;
    const additional = room.additionalCharges
      .filter((c) => c.frequency !== "one_time")
      .reduce((s, c) => s + c.amountKobo, 0);
    const caution = room.cautionDepositKobo ?? 0;
    const serviceFee = Math.round(baseRent * 0.05);
    const total = baseRent + additional + caution + serviceFee;
    const booking: Booking = {
      id: `bkg_${Math.random().toString(36).slice(2, 9)}`,
      reference: `NLG-BKG-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      studentId: input.studentId,
      propertyId: room.propertyId,
      rentableUnitId: room.id,
      status: "pending_payment",
      currentStep: "payment_initiation",
      checkIn: input.checkIn,
      checkOut: new Date(+new Date(input.checkIn) + 365 * 86400000).toISOString(),
      rentalPeriod: input.rentalPeriod,
      baseRentKobo: baseRent,
      additionalChargesKobo: additional,
      cautionDepositKobo: caution,
      serviceFeeKobo: serviceFee,
      totalKobo: total,
      paidKobo: 0,
      outstandingKobo: total,
      holdExpiresAt: new Date(+new Date() + 24 * 3600000).toISOString(),
      createdAt: iso(),
      updatedAt: iso(),
    };
    fixtures.bookings.push(booking);
    return booking;
  },
  async cancel(id: string, reason: string) {
    await delay();
    const idx = fixtures.bookings.findIndex((b) => b.id === id);
    if (idx === -1) throw new Error("Booking not found");
    fixtures.bookings[idx] = {
      ...fixtures.bookings[idx],
      status: "cancelled",
      cancelledAt: iso(),
      cancellationReason: reason,
      updatedAt: iso(),
    };
    return fixtures.bookings[idx];
  },
};

/* ----------------------------------------------------------------- Payments */

const paymentRepo = {
  async listByStudent(studentId: string) {
    await delay();
    return fixtures.getPaymentsForStudent(studentId);
  },
  async listByBooking(bookingId: string) {
    await delay();
    return fixtures.payments.filter((p) => p.bookingId === bookingId);
  },
  async listAll(filters: import("./contracts").PaymentListFilters) {
    await delay(150);
    let items = [...fixtures.payments];
    if (filters.status) items = items.filter((p) => p.status === filters.status);
    if (filters.channel) items = items.filter((p) => p.channel === filters.channel);
    if (filters.bookingId) items = items.filter((p) => p.bookingId === filters.bookingId);
    if (filters.q) {
      const q = filters.q.toLowerCase();
      items = items.filter(
        (p) => p.reference.toLowerCase().includes(q) || (p.gatewayReference ?? "").toLowerCase().includes(q),
      );
    }
    const total = items.length;
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const paged = items.slice((page - 1) * pageSize, page * pageSize);
    return { items: paged, total };
  },
  async getById(id: string) {
    await delay();
    return fixtures.payments.find((p) => p.id === id) ?? null;
  },
  async initiate(input: { bookingId: string; channel: Payment["channel"] }) {
    await delay();
    const booking = fixtures.bookings.find((b) => b.id === input.bookingId);
    if (!booking) throw new Error("Booking not found");
    const payment: Payment = {
      id: `pay_${Math.random().toString(36).slice(2, 9)}`,
      reference: `NLG-PAY-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      bookingId: booking.id,
      studentId: booking.studentId,
      amountKobo: booking.outstandingKobo,
      feeKobo: Math.round(booking.outstandingKobo * 0.0235),
      netKobo: booking.outstandingKobo - Math.round(booking.outstandingKobo * 0.0235),
      currency: "NGN",
      channel: input.channel,
      status: "initiated",
      confirmedByBackend: false,
      initiatedAt: iso(),
    };
    fixtures.payments.push(payment);
    return payment;
  },
  /**
   * In production this method MUST be a server action that calls Paystack's
   * verify endpoint and only then flips `confirmedByBackend` to true.
   */
  async confirm(reference: string) {
    await delay(300);
    const idx = fixtures.payments.findIndex((p) => p.reference === reference);
    if (idx === -1) throw new Error("Payment not found");
    fixtures.payments[idx] = {
      ...fixtures.payments[idx],
      status: "successful",
      confirmedByBackend: true,
      confirmedAt: iso(),
      gatewayReference: `PSK_${Math.random().toString(36).slice(2, 14).toUpperCase()}`,
    };
    return fixtures.payments[idx];
  },
};

/* ------------------------------------------------------------------ Payouts */

const payoutRepo = {
  async listByLandlord(landlordId: string) {
    await delay();
    return fixtures.payouts.filter((p) => p.landlordId === landlordId);
  },
  async listAll(filters: import("./contracts").PayoutListFilters) {
    await delay(150);
    const items = fixtures.payouts.map((p) => ({
      ...p,
      eligibilityFlags: p.eligibilityFlags ?? [],
    }));
    let filtered = [...items];
    if (filters.status) filtered = filtered.filter((p) => p.status === filters.status);
    if (filters.landlordId) filtered = filtered.filter((p) => p.landlordId === filters.landlordId);
    if (filters.q) {
      const q = filters.q.toLowerCase();
      filtered = filtered.filter(
        (p) => p.reference.toLowerCase().includes(q) || p.landlordId.toLowerCase().includes(q),
      );
    }
    const total = filtered.length;
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
    return { items: paged, total };
  },
  async getById(id: string) {
    await delay();
    const p = fixtures.payouts.find((x) => x.id === id) ?? null;
    if (!p) return null;
    return { ...p, eligibilityFlags: p.eligibilityFlags ?? [] };
  },
  async approve(id: string, approverId: string, _notes?: string) {
    await delay(200);
    const p = fixtures.payouts.find((x) => x.id === id);
    if (!p) throw new Error("Payout not found");
    if (p.status !== "scheduled") throw new Error(`Cannot approve payout in status ${p.status}`);
    p.status = "in_flight";
    p.approvedBy = approverId;
    p.approvedAt = iso();
    // Backfill eligibility flags if missing.
    if (!(p as Payout).eligibilityFlags) (p as Payout).eligibilityFlags = [];
    await auditLogRepo.record({
      actorId: approverId,
      actorEmail: adminFixtures.users.find((u) => u.id === approverId)?.email ?? "unknown",
      actorRole: "finance_admin",
      category: "payout",
      action: "payout.approve",
      resourceType: "payout",
      resourceId: id,
      summary: `Approved payout ${p.reference} for ₦${p.netKobo / 100} to ${p.landlordId}.`,
      severity: "info",
      before: { status: "scheduled" },
      after: { status: "in_flight", approvedBy: approverId },
    });
    return p as Payout;
  },
  async reject(id: string, approverId: string, reason: string) {
    await delay(200);
    const p = fixtures.payouts.find((x) => x.id === id);
    if (!p) throw new Error("Payout not found");
    p.status = "failed";
    p.rejectionReason = reason;
    p.approvedBy = approverId;
    p.approvedAt = iso();
    if (!(p as Payout).eligibilityFlags) (p as Payout).eligibilityFlags = [];
    await auditLogRepo.record({
      actorId: approverId,
      actorEmail: adminFixtures.users.find((u) => u.id === approverId)?.email ?? "unknown",
      actorRole: "finance_admin",
      category: "payout",
      action: "payout.reject",
      resourceType: "payout",
      resourceId: id,
      summary: `Rejected payout ${p.reference}: ${reason}`,
      severity: "warning",
      before: { status: p.status },
      after: { status: "failed", rejectionReason: reason },
    });
    return p as Payout;
  },
  async reverse(id: string, approverId: string, reason: string) {
    await delay(200);
    const p = fixtures.payouts.find((x) => x.id === id);
    if (!p) throw new Error("Payout not found");
    p.status = "reversed";
    p.reversalReason = reason;
    if (!(p as Payout).eligibilityFlags) (p as Payout).eligibilityFlags = [];
    await auditLogRepo.record({
      actorId: approverId,
      actorEmail: adminFixtures.users.find((u) => u.id === approverId)?.email ?? "unknown",
      actorRole: "finance_admin",
      category: "payout",
      action: "payout.reverse",
      resourceType: "payout",
      resourceId: id,
      summary: `Reversed payout ${p.reference}: ${reason}`,
      severity: "critical",
      before: { status: p.status },
      after: { status: "reversed", reversalReason: reason },
    });
    return p as Payout;
  },
  async markSettled(id: string, providerReference: string) {
    await delay(300);
    const p = fixtures.payouts.find((x) => x.id === id);
    if (!p) throw new Error("Payout not found");
    p.status = "settled";
    p.settledAt = iso();
    p.providerReference = providerReference;
    if (!(p as Payout).eligibilityFlags) (p as Payout).eligibilityFlags = [];
    return p as Payout;
  },
};

/* ----------------------------------------------------------- Notifications */

const notificationRepo = {
  async listByUser(userId: string) {
    await delay(60);
    return fixtures.getNotificationsForUser(userId);
  },
  async markRead(id: string) {
    await delay(40);
    const n = fixtures.notifications.find((n) => n.id === id);
    if (n) n.read = true;
  },
  async markAllRead(userId: string) {
    await delay(80);
    fixtures.notifications.forEach((n) => {
      if (n.userId === userId) n.read = true;
    });
  },
};

/* ------------------------------------------------------------------ Support */

const supportRepo = {
  async listByUser(userId: string) {
    await delay();
    // Merge marketplace + admin support ticket fixtures so students see their
    // own tickets (both legacy and the richer admin ones).
    const adminOwn = adminFixtures.supportTickets.filter((t) => t.userId === userId);
    const legacy = fixtures.supportTickets.filter((t) => t.userId === userId);
    // De-duplicate by reference (admin fixtures override legacy).
    const seen = new Set(adminOwn.map((t) => t.reference));
    const merged = [...adminOwn, ...legacy.filter((t) => !seen.has(t.reference))];
    return merged.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  },
  async listAll(filters: import("./contracts").SupportListFilters) {
    await delay(150);
    let items = [...adminFixtures.supportTickets];
    if (filters.status) items = items.filter((t) => t.status === filters.status);
    if (filters.priority) items = items.filter((t) => t.priority === filters.priority);
    if (filters.team) items = items.filter((t) => t.team === filters.team);
    if (filters.assignedTo) items = items.filter((t) => t.assignedTo === filters.assignedTo);
    if (filters.escalated) items = items.filter((t) => t.escalated);
    if (filters.q) {
      const q = filters.q.toLowerCase();
      items = items.filter(
        (t) =>
          t.reference.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          t.message.toLowerCase().includes(q),
      );
    }
    const total = items.length;
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const paged = items.slice((page - 1) * pageSize, page * pageSize);
    return { items: paged, total };
  },
  async getById(id: string) {
    await delay();
    return adminFixtures.supportTickets.find((t) => t.id === id) ?? null;
  },
  async create(input: Pick<SupportTicket, "subject" | "category" | "priority" | "message">) {
    await delay();
    const now = iso();
    const ticket: SupportTicket = {
      id: `tkt_${Math.random().toString(36).slice(2, 9)}`,
      reference: `NLG-TKT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      // Use a dev student ID; in production this would be the authenticated user's ID.
      userId: "dev_student_1",
      status: "open",
      escalated: false,
      team: "general",
      internalNotes: [],
      ...input,
      createdAt: now,
      updatedAt: now,
      replies: [],
    };
    adminFixtures.supportTickets.push(ticket);
    return ticket;
  },
  async reply(ticketId: string, message: string) {
    await delay();
    const t = adminFixtures.supportTickets.find((x) => x.id === ticketId) ?? fixtures.supportTickets.find((x) => x.id === ticketId);
    if (!t) throw new Error("Ticket not found");
    t.replies.push({
      id: `r_${Math.random().toString(36).slice(2, 6)}`,
      author: "user",
      message,
      createdAt: iso(),
    });
    t.updatedAt = iso();
    return t;
  },
  async replyAsStaff(ticketId: string, message: string, opts: { authorId: string; authorName: string; internal?: boolean }) {
    await delay();
    const t = adminFixtures.supportTickets.find((x) => x.id === ticketId);
    if (!t) throw new Error("Ticket not found");
    t.replies.push({
      id: `r_${Math.random().toString(36).slice(2, 6)}`,
      author: "support",
      authorName: opts.authorName,
      message,
      internal: opts.internal ?? false,
      createdAt: iso(),
    });
    // First staff reply sets firstResponseAt.
    if (!t.firstResponseAt) t.firstResponseAt = iso();
    if (t.status === "open") t.status = "in_progress";
    t.updatedAt = iso();
    return t;
  },
  async assignTo(ticketId: string, agentId: string | null) {
    await delay();
    const t = adminFixtures.supportTickets.find((x) => x.id === ticketId);
    if (!t) throw new Error("Ticket not found");
    t.assignedTo = agentId;
    if (t.status === "open") t.status = "in_progress";
    t.updatedAt = iso();
    return t;
  },
  async updateStatus(ticketId: string, status: SupportTicketStatus, opts: { actorId: string; reason?: string }) {
    await delay();
    const t = adminFixtures.supportTickets.find((x) => x.id === ticketId);
    if (!t) throw new Error("Ticket not found");
    t.status = status;
    if (status === "resolved") t.resolvedAt = iso();
    t.updatedAt = iso();
    return t;
  },
  async escalate(ticketId: string, opts: { actorId: string; to: NonNullable<SupportTicket["escalatedTo"]>; reason: string }) {
    await delay();
    const t = adminFixtures.supportTickets.find((x) => x.id === ticketId);
    if (!t) throw new Error("Ticket not found");
    t.escalated = true;
    t.escalatedTo = opts.to;
    t.escalatedReason = opts.reason;
    t.priority = "urgent";
    t.updatedAt = iso();
    await auditLogRepo.record({
      actorId: opts.actorId,
      actorEmail: adminFixtures.users.find((u) => u.id === opts.actorId)?.email ?? "unknown",
      actorRole: "support_staff",
      category: "support",
      action: "support.escalate",
      resourceType: "support_ticket",
      resourceId: ticketId,
      summary: `Escalated ticket ${t.reference} to ${opts.to}: ${opts.reason}`,
      severity: "warning",
    });
    return t;
  },
  async addInternalNote(ticketId: string, note: Omit<InternalNote, "id" | "createdAt">) {
    await delay(60);
    const t = adminFixtures.supportTickets.find((x) => x.id === ticketId);
    if (!t) throw new Error("Ticket not found");
    t.internalNotes = [...(t.internalNotes ?? []), { ...note, id: `note_${Math.random().toString(36).slice(2, 8)}`, createdAt: iso() }];
    t.updatedAt = iso();
    return t;
  },
};

/* --------------------------------------------------------- Saved properties */

const savedRepo = {
  async listByUser(userId: string) {
    await delay();
    return fixtures.savedProperties.filter((s) => s.userId === userId);
  },
  async toggle(userId: string, propertyId: string) {
    await delay(60);
    const idx = fixtures.savedProperties.findIndex(
      (s) => s.userId === userId && s.propertyId === propertyId,
    );
    if (idx === -1) {
      fixtures.savedProperties.push({
        id: `sav_${Math.random().toString(36).slice(2, 6)}`,
        userId,
        propertyId,
        savedAt: iso(),
      });
      return true;
    }
    fixtures.savedProperties.splice(idx, 1);
    return false;
  },
};

/* ------------------------------------------------------------ Verification */

const verificationRepo = {
  async getForLandlord(landlordId: string) {
    await delay();
    // Look up the landlord's verification record from the admin fixtures.
    // If none exists, return null (the landlord UI handles the empty state).
    return adminFixtures.verificationRecords.find(
      (v) => v.entityType === "landlord" && v.entityId === landlordId,
    ) ?? null;
  },
  async submit(landlordId: string, _evidenceIds: string[]) {
    await delay();
    // In dev mode, submit just returns the existing record. If none exists,
    // create a stub pending record so the landlord UI can render.
    const existing = await this.getForLandlord(landlordId);
    if (existing) return existing;
    const stub: VerificationRecord = {
      id: `ver_${landlordId}`,
      reference: `NLG-VER-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      entityType: "landlord",
      entityId: landlordId,
      entityLabel: landlordId,
      submissionType: "landlord_identity",
      status: "pending",
      priority: "medium",
      evidence: [],
      inspectionRecords: [],
      assignedOfficerId: null,
      submittedAt: iso(),
      outstandingActions: ["Submit identity document", "Submit address document"],
      internalNotes: [],
      createdAt: iso(),
      updatedAt: iso(),
    };
    adminFixtures.verificationRecords.push(stub);
    return stub;
  },
  // ---- Officer-side methods ----
  async listAll(filters: import("./contracts").VerificationListFilters) {
    await delay(150);
    let items = [...adminFixtures.verificationRecords];
    if (filters.status) items = items.filter((v) => v.status === filters.status);
    if (filters.submissionType) items = items.filter((v) => v.submissionType === filters.submissionType);
    if (filters.entityType) items = items.filter((v) => v.entityType === filters.entityType);
    if (filters.assignedOfficerId) items = items.filter((v) => v.assignedOfficerId === filters.assignedOfficerId);
    if (filters.escalated) items = items.filter((v) => v.escalatedTo !== null && v.escalatedTo !== undefined);
    if (filters.overdue) {
      const nowIso = new Date().toISOString();
      items = items.filter((v) => v.slaDueAt && v.slaDueAt < nowIso && (v.status === "pending" || v.status === "in_review"));
    }
    if (filters.q) {
      const q = filters.q.toLowerCase();
      items = items.filter(
        (v) =>
          v.reference.toLowerCase().includes(q) ||
          v.entityLabel.toLowerCase().includes(q) ||
          v.submissionType.toLowerCase().includes(q),
      );
    }
    const total = items.length;
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const paged = items.slice((page - 1) * pageSize, page * pageSize);
    return { items: paged, total };
  },
  async getById(id: string) {
    await delay();
    return adminFixtures.verificationRecords.find((v) => v.id === id) ?? null;
  },
  async assignTo(id: string, officerId: string | null) {
    await delay();
    const v = adminFixtures.verificationRecords.find((x) => x.id === id);
    if (!v) throw new Error("Verification case not found");
    v.assignedOfficerId = officerId;
    v.status = v.status === "pending" ? "in_review" : v.status;
    v.updatedAt = iso();
    return v;
  },
  async approve(id: string, opts: { reviewerId: string; reviewerName: string; notes: string }) {
    await delay(200);
    const v = adminFixtures.verificationRecords.find((x) => x.id === id);
    if (!v) throw new Error("Verification case not found");
    v.status = "approved";
    v.reviewerId = opts.reviewerId;
    v.reviewNotes = opts.notes;
    v.reviewedAt = iso();
    v.outstandingActions = [];
    v.updatedAt = iso();
    // Record an audit entry.
    await auditLogRepo.record({
      actorId: opts.reviewerId,
      actorEmail: adminFixtures.users.find((u) => u.id === opts.reviewerId)?.email ?? "unknown",
      actorRole: "verification_officer",
      category: "verification",
      action: "verification.approve",
      resourceType: "verification_case",
      resourceId: id,
      summary: `Approved verification ${v.reference} for ${v.entityLabel}.`,
      severity: "info",
      before: { status: "in_review" },
      after: { status: "approved" },
    });
    return v;
  },
  async reject(id: string, opts: { reviewerId: string; reviewerName: string; reason: string; notes?: string }) {
    await delay(200);
    const v = adminFixtures.verificationRecords.find((x) => x.id === id);
    if (!v) throw new Error("Verification case not found");
    v.status = "rejected";
    v.reviewerId = opts.reviewerId;
    v.rejectionReason = opts.reason;
    v.reviewNotes = opts.notes ?? null;
    v.reviewedAt = iso();
    v.updatedAt = iso();
    await auditLogRepo.record({
      actorId: opts.reviewerId,
      actorEmail: adminFixtures.users.find((u) => u.id === opts.reviewerId)?.email ?? "unknown",
      actorRole: "verification_officer",
      category: "verification",
      action: "verification.reject",
      resourceType: "verification_case",
      resourceId: id,
      summary: `Rejected verification ${v.reference}: ${opts.reason}`,
      severity: "warning",
      before: { status: v.status },
      after: { status: "rejected", rejectionReason: opts.reason },
    });
    return v;
  },
  async requestInfo(id: string, opts: { reviewerId: string; reviewerName: string; request: string }) {
    await delay();
    const v = adminFixtures.verificationRecords.find((x) => x.id === id);
    if (!v) throw new Error("Verification case not found");
    v.outstandingActions = [...v.outstandingActions, opts.request];
    v.status = "in_review";
    v.updatedAt = iso();
    return v;
  },
  async escalate(id: string, opts: { reviewerId: string; reviewerName: string; to: NonNullable<VerificationRecord["escalatedTo"]>; reason: string }) {
    await delay();
    const v = adminFixtures.verificationRecords.find((x) => x.id === id);
    if (!v) throw new Error("Verification case not found");
    v.escalatedFrom = opts.reviewerId;
    v.escalatedTo = opts.to;
    v.escalatedAt = iso();
    v.escalationReason = opts.reason;
    v.priority = "urgent";
    v.updatedAt = iso();
    await auditLogRepo.record({
      actorId: opts.reviewerId,
      actorEmail: adminFixtures.users.find((u) => u.id === opts.reviewerId)?.email ?? "unknown",
      actorRole: "verification_officer",
      category: "verification",
      action: "verification.escalate",
      resourceType: "verification_case",
      resourceId: id,
      summary: `Escalated verification ${v.reference} to ${opts.to}: ${opts.reason}`,
      severity: "warning",
    });
    return v;
  },
  async recordInspection(id: string, inspection: { inspectorName: string; findings: string; recommendations: string; completedAt: string }) {
    await delay();
    const v = adminFixtures.verificationRecords.find((x) => x.id === id);
    if (!v) throw new Error("Verification case not found");
    v.inspectionRecords.push({
      id: `insp_${Math.random().toString(36).slice(2, 8)}`,
      scheduledAt: iso(),
      completedAt: inspection.completedAt,
      inspectorName: inspection.inspectorName,
      findings: inspection.findings,
      recommendations: inspection.recommendations,
      status: "completed",
      reportUrl: null,
    });
    v.updatedAt = iso();
    return v;
  },
  async addInternalNote(id: string, note: Omit<InternalNote, "id" | "createdAt">) {
    await delay(60);
    const v = adminFixtures.verificationRecords.find((x) => x.id === id);
    if (!v) throw new Error("Verification case not found");
    v.internalNotes = [...(v.internalNotes ?? []), { ...note, id: `note_${Math.random().toString(36).slice(2, 8)}`, createdAt: iso() }];
    v.updatedAt = iso();
    return v;
  },
  async history(opts: { officerId?: string; from?: string; to?: string }) {
    await delay();
    let items = adminFixtures.verificationRecords.filter((v) => v.status === "approved" || v.status === "rejected");
    if (opts.officerId) items = items.filter((v) => v.reviewerId === opts.officerId);
    if (opts.from) items = items.filter((v) => v.reviewedAt && v.reviewedAt >= opts.from!);
    if (opts.to) items = items.filter((v) => v.reviewedAt && v.reviewedAt <= opts.to!);
    return items.sort((a, b) => +new Date(b.reviewedAt ?? 0) - +new Date(a.reviewedAt ?? 0));
  },
};

/* ================================================================ ADMIN REPOS
   The repositories below back the four administrative workspaces. They read
   from /lib/data/admin-fixtures and record audit entries for state-changing
   operations. In production, each method maps to a Supabase server action
   with independent authorisation.
   ================================================================== */

/* ------------------------------------------------------------------ Audit logs
   Declared first because other repos call auditLogRepo.record() after state
   changes. */

const auditLogRepo = {
  async list(filters: AuditLogFilters) {
    await delay(150);
    let items = [...adminFixtures.auditLogs];
    if (filters.category) items = items.filter((a) => a.category === filters.category);
    if (filters.severity) items = items.filter((a) => a.severity === filters.severity);
    if (filters.actorId) items = items.filter((a) => a.actorId === filters.actorId);
    if (filters.resourceType) items = items.filter((a) => a.resourceType === filters.resourceType);
    if (filters.q) {
      const q = filters.q.toLowerCase();
      items = items.filter(
        (a) =>
          a.summary.toLowerCase().includes(q) ||
          a.action.toLowerCase().includes(q) ||
          a.actorEmail.toLowerCase().includes(q),
      );
    }
    items.sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
    const total = items.length;
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const paged = items.slice((page - 1) * pageSize, page * pageSize);
    return { items: paged, total };
  },
  async record(entry: Omit<AuditLog, "id" | "timestamp">) {
    // No delay — audit recording should be fast and never block the user.
    const log: AuditLog = {
      ...entry,
      id: `aud_${Math.random().toString(36).slice(2, 10)}`,
      timestamp: iso(),
    };
    adminFixtures.auditLogs.unshift(log);
    return log;
  },
};

/* ------------------------------------------------------------------ Users */

const userRepo = {
  async list(filters: UserListFilters) {
    await delay(150);
    let items = [...adminFixtures.users];
    if (filters.role) items = items.filter((u) => u.role === filters.role);
    if (filters.active !== undefined) items = items.filter((u) => u.active === filters.active);
    if (filters.q) {
      const q = filters.q.toLowerCase();
      items = items.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
          u.id.toLowerCase().includes(q),
      );
    }
    const total = items.length;
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const paged = items.slice((page - 1) * pageSize, page * pageSize);
    return { items: paged, total };
  },
  async getById(id: string) {
    await delay();
    return adminFixtures.users.find((u) => u.id === id) ?? null;
  },
  async getByEmail(email: string) {
    await delay();
    return adminFixtures.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
  },
  async updateRole(id: string, opts: { actorId: string; newRole: UserRole; reason: string }) {
    await delay(200);
    const u = adminFixtures.users.find((x) => x.id === id);
    if (!u) throw new Error("User not found");
    // Guard: prevent demoting the last super_admin.
    if (u.role === "super_admin" && opts.newRole !== "super_admin") {
      const superAdminCount = adminFixtures.users.filter((x) => x.role === "super_admin" && x.active).length;
      if (superAdminCount <= 1) {
        throw new Error("Cannot demote the last active super administrator.");
      }
    }
    const oldRole = u.role;
    u.role = opts.newRole;
    u.roleUpdatedAt = iso();
    u.roleChangedBy = opts.actorId;
    await auditLogRepo.record({
      actorId: opts.actorId,
      actorEmail: adminFixtures.users.find((x) => x.id === opts.actorId)?.email ?? "unknown",
      actorRole: adminFixtures.users.find((x) => x.id === opts.actorId)?.role ?? "super_admin",
      category: "role_management",
      action: "user.role.change",
      resourceType: "user",
      resourceId: id,
      summary: `Changed ${u.email} role from ${oldRole} to ${opts.newRole}. Reason: ${opts.reason}`,
      severity: "warning",
      before: { role: oldRole },
      after: { role: opts.newRole },
    });
    return u;
  },
  async deactivate(id: string, opts: { actorId: string; reason: string }) {
    await delay(200);
    const u = adminFixtures.users.find((x) => x.id === id);
    if (!u) throw new Error("User not found");
    // Guard: prevent suspending the last super_admin.
    if (u.role === "super_admin") {
      const activeSuperAdmins = adminFixtures.users.filter((x) => x.role === "super_admin" && x.active).length;
      if (activeSuperAdmins <= 1) {
        throw new Error("Cannot suspend the last active super administrator.");
      }
    }
    u.active = false;
    u.deactivatedAt = iso();
    u.statusReason = opts.reason;
    u.statusChangedBy = opts.actorId;
    await auditLogRepo.record({
      actorId: opts.actorId,
      actorEmail: adminFixtures.users.find((x) => x.id === opts.actorId)?.email ?? "unknown",
      actorRole: adminFixtures.users.find((x) => x.id === opts.actorId)?.role ?? "super_admin",
      category: "user_management",
      action: "user.deactivate",
      resourceType: "user",
      resourceId: id,
      summary: `Suspended ${u.email}. Reason: ${opts.reason}`,
      severity: "critical",
      before: { active: true },
      after: { active: false, deactivatedAt: u.deactivatedAt, statusReason: opts.reason },
    });
    return u;
  },
  async reactivate(id: string, opts: { actorId: string; reason: string }) {
    await delay(200);
    const u = adminFixtures.users.find((x) => x.id === id);
    if (!u) throw new Error("User not found");
    u.active = true;
    u.deactivatedAt = null;
    u.statusReason = opts.reason;
    u.statusChangedBy = opts.actorId;
    await auditLogRepo.record({
      actorId: opts.actorId,
      actorEmail: adminFixtures.users.find((x) => x.id === opts.actorId)?.email ?? "unknown",
      actorRole: adminFixtures.users.find((x) => x.id === opts.actorId)?.role ?? "super_admin",
      category: "user_management",
      action: "user.reactivate",
      resourceType: "user",
      resourceId: id,
      summary: `Reactivated ${u.email}. Reason: ${opts.reason}`,
      severity: "info",
      before: { active: false },
      after: { active: true },
    });
    return u;
  },
};

/* ------------------------------------------------------------------ Refunds */

const refundRepo = {
  async listAll(filters: RefundListFilters) {
    await delay(150);
    let items = [...adminFixtures.refunds];
    if (filters.status) items = items.filter((r) => r.status === filters.status);
    if (filters.reason) items = items.filter((r) => r.reason === filters.reason);
    if (filters.q) {
      const q = filters.q.toLowerCase();
      items = items.filter(
        (r) => r.reference.toLowerCase().includes(q) || r.paymentReference.toLowerCase().includes(q),
      );
    }
    const total = items.length;
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const paged = items.slice((page - 1) * pageSize, page * pageSize);
    return { items: paged, total };
  },
  async getById(id: string) {
    await delay();
    return adminFixtures.refunds.find((r) => r.id === id) ?? null;
  },
  async create(input: { paymentId: string; amountKobo: number; reason: RefundReason; reasonDetail: string; createdBy: string }) {
    await delay();
    const payment = fixtures.payments.find((p) => p.id === input.paymentId);
    const refund: Refund = {
      id: `ref_${Math.random().toString(36).slice(2, 9)}`,
      reference: `NLG-REF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      paymentId: input.paymentId,
      paymentReference: payment?.reference ?? "unknown",
      bookingId: payment?.bookingId ?? "unknown",
      studentId: payment?.studentId ?? "unknown",
      amountKobo: input.amountKobo,
      currency: "NGN",
      reason: input.reason,
      reasonDetail: input.reasonDetail,
      status: "requested",
      createdAt: iso(),
      updatedAt: iso(),
    };
    adminFixtures.refunds.push(refund);
    return refund;
  },
  async approve(id: string, opts: { reviewerId: string; notes?: string }) {
    await delay(200);
    const r = adminFixtures.refunds.find((x) => x.id === id);
    if (!r) throw new Error("Refund not found");
    r.status = "approved";
    r.reviewedBy = opts.reviewerId;
    r.reviewedAt = iso();
    r.reviewNotes = opts.notes ?? null;
    await auditLogRepo.record({
      actorId: opts.reviewerId,
      actorEmail: adminFixtures.users.find((u) => u.id === opts.reviewerId)?.email ?? "unknown",
      actorRole: "finance_admin",
      category: "refund",
      action: "refund.approve",
      resourceType: "refund",
      resourceId: id,
      summary: `Approved refund ${r.reference} for ₦${r.amountKobo / 100}.`,
      severity: "info",
      before: { status: "requested" },
      after: { status: "approved" },
    });
    return r;
  },
  async reject(id: string, opts: { reviewerId: string; reason: string }) {
    await delay(200);
    const r = adminFixtures.refunds.find((x) => x.id === id);
    if (!r) throw new Error("Refund not found");
    r.status = "rejected";
    r.reviewedBy = opts.reviewerId;
    r.reviewedAt = iso();
    r.reviewNotes = opts.reason;
    await auditLogRepo.record({
      actorId: opts.reviewerId,
      actorEmail: adminFixtures.users.find((u) => u.id === opts.reviewerId)?.email ?? "unknown",
      actorRole: "finance_admin",
      category: "refund",
      action: "refund.reject",
      resourceType: "refund",
      resourceId: id,
      summary: `Rejected refund ${r.reference}: ${opts.reason}`,
      severity: "warning",
      before: { status: r.status },
      after: { status: "rejected" },
    });
    return r;
  },
  async markCompleted(id: string, providerReference: string) {
    await delay(300);
    const r = adminFixtures.refunds.find((x) => x.id === id);
    if (!r) throw new Error("Refund not found");
    r.status = "completed";
    r.providerReference = providerReference;
    r.completedAt = iso();
    return r;
  },
};

/* ------------------------------------------------------------------ Reconciliation */

const reconciliationRepo = {
  async listAll(filters: ReconciliationListFilters) {
    await delay(150);
    let items = [...adminFixtures.reconciliationRecords];
    if (filters.status) items = items.filter((r) => r.status === filters.status);
    if (filters.q) {
      const q = filters.q.toLowerCase();
      items = items.filter(
        (r) =>
          r.internalReference.toLowerCase().includes(q) ||
          (r.providerReference ?? "").toLowerCase().includes(q),
      );
    }
    const total = items.length;
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const paged = items.slice((page - 1) * pageSize, page * pageSize);
    return { items: paged, total };
  },
  async getById(id: string) {
    await delay();
    return adminFixtures.reconciliationRecords.find((r) => r.id === id) ?? null;
  },
  async resolve(id: string, opts: { resolverId: string; notes: string }) {
    await delay(200);
    const r = adminFixtures.reconciliationRecords.find((x) => x.id === id);
    if (!r) throw new Error("Reconciliation record not found");
    r.status = "resolved";
    r.resolvedBy = opts.resolverId;
    r.resolvedAt = iso();
    r.resolutionNotes = opts.notes;
    await auditLogRepo.record({
      actorId: opts.resolverId,
      actorEmail: adminFixtures.users.find((u) => u.id === opts.resolverId)?.email ?? "unknown",
      actorRole: "finance_admin",
      category: "finance",
      action: "reconciliation.resolve",
      resourceType: "reconciliation_record",
      resourceId: id,
      summary: `Resolved reconciliation discrepancy for ${r.internalReference}.`,
      severity: "info",
    });
    return r;
  },
  async runReconciliation(opts: { actorId: string; from: string; to: string }) {
    await delay(300);
    // Dev mode: return a summary based on existing records.
    const matched = adminFixtures.reconciliationRecords.filter((r) => r.status === "matched").length;
    const unmatched = adminFixtures.reconciliationRecords.filter(
      (r) => r.status === "unmatched_internal" || r.status === "unmatched_provider",
    ).length;
    const discrepancies = adminFixtures.reconciliationRecords.filter(
      (r) =>
        r.status === "amount_discrepancy" ||
        r.status === "duplicate_reference" ||
        r.status === "settlement_date_mismatch",
    ).length;
    await auditLogRepo.record({
      actorId: opts.actorId,
      actorEmail: adminFixtures.users.find((u) => u.id === opts.actorId)?.email ?? "unknown",
      actorRole: "finance_admin",
      category: "finance",
      action: "reconciliation.run",
      resourceType: "reconciliation_batch",
      resourceId: `batch_${opts.from}_${opts.to}`,
      summary: `Ran reconciliation for ${opts.from} to ${opts.to}. ${matched} matched, ${unmatched} unmatched, ${discrepancies} discrepancies.`,
      severity: "info",
    });
    return { matched, unmatched, discrepancies };
  },
};

/* ------------------------------------------------------------------ Platform settings */

const platformSettingRepo = {
  async list() {
    await delay();
    return adminFixtures.platformSettings;
  },
  async listByCategory(category: PlatformSetting["category"]) {
    await delay();
    return adminFixtures.platformSettings.filter((s) => s.category === category);
  },
  async getByKey(key: string) {
    await delay();
    return adminFixtures.platformSettings.find((s) => s.key === key) ?? null;
  },
  async update(key: string, opts: { actorId: string; value: string }) {
    await delay(200);
    const s = adminFixtures.platformSettings.find((x) => x.key === key);
    if (!s) throw new Error("Setting not found");
    const oldValue = s.value;
    s.value = opts.value;
    s.updatedAt = iso();
    s.updatedBy = opts.actorId;
    await auditLogRepo.record({
      actorId: opts.actorId,
      actorEmail: adminFixtures.users.find((u) => u.id === opts.actorId)?.email ?? "unknown",
      actorRole: adminFixtures.users.find((u) => u.id === opts.actorId)?.role ?? "super_admin",
      category: "configuration",
      action: "setting.update",
      resourceType: "platform_setting",
      resourceId: key,
      summary: `Updated ${key} from ${oldValue} to ${opts.value}.`,
      severity: s.requiresReauth ? "warning" : "info",
      before: { value: oldValue },
      after: { value: opts.value },
    });
    return s;
  },
};

/* ------------------------------------------------------------------ Integration health */

const integrationHealthRepo = {
  async list() {
    await delay();
    return adminFixtures.integrationHealth;
  },
  async getById(id: string) {
    await delay();
    return adminFixtures.integrationHealth.find((i) => i.id === id) ?? null;
  },
  async toggle(id: string, opts: { actorId: string; enabled: boolean; reason: string }) {
    await delay(200);
    const i = adminFixtures.integrationHealth.find((x) => x.id === id);
    if (!i) throw new Error("Integration not found");
    i.enabled = opts.enabled;
    await auditLogRepo.record({
      actorId: opts.actorId,
      actorEmail: adminFixtures.users.find((u) => u.id === opts.actorId)?.email ?? "unknown",
      actorRole: adminFixtures.users.find((u) => u.id === opts.actorId)?.role ?? "super_admin",
      category: "integration",
      action: "integration.toggle",
      resourceType: "integration",
      resourceId: id,
      summary: `${opts.enabled ? "Enabled" : "Disabled"} integration ${i.name}. Reason: ${opts.reason}`,
      severity: opts.enabled ? "info" : "critical",
    });
    return i;
  },
};

/* ------------------------------------------------------------------ Knowledge base */

const knowledgeBaseRepo = {
  async list() {
    await delay();
    return adminFixtures.knowledgeBase;
  },
  async getBySlug(slug: string) {
    await delay();
    return adminFixtures.knowledgeBase.find((a) => a.slug === slug) ?? null;
  },
  async create(input: Omit<KnowledgeBaseArticle, "id" | "updatedAt" | "views">) {
    await delay();
    const article: KnowledgeBaseArticle = {
      ...input,
      id: `kb_${Math.random().toString(36).slice(2, 9)}`,
      views: 0,
      updatedAt: iso(),
    };
    adminFixtures.knowledgeBase.push(article);
    return article;
  },
  async update(id: string, patch: Partial<KnowledgeBaseArticle>) {
    await delay();
    const a = adminFixtures.knowledgeBase.find((x) => x.id === id);
    if (!a) throw new Error("Article not found");
    Object.assign(a, patch, { updatedAt: iso() });
    return a;
  },
  async delete(id: string) {
    await delay();
    const idx = adminFixtures.knowledgeBase.findIndex((x) => x.id === id);
    if (idx !== -1) adminFixtures.knowledgeBase.splice(idx, 1);
  },
  async incrementViews(id: string) {
    const a = adminFixtures.knowledgeBase.find((x) => x.id === id);
    if (a) a.views += 1;
  },
};

/* ------------------------------------------------------------------ Announcements */

const announcementRepo = {
  async list() {
    await delay();
    return adminFixtures.systemAnnouncements;
  },
  async listActive(audience: SystemAnnouncement["audience"]) {
    await delay();
    const nowIso = iso();
    return adminFixtures.systemAnnouncements.filter(
      (a) =>
        a.active &&
        a.startsAt <= nowIso &&
        (!a.endsAt || a.endsAt >= nowIso) &&
        (a.audience === "all" || a.audience === audience),
    );
  },
  async create(input: Omit<SystemAnnouncement, "id" | "createdAt" | "createdBy">, opts: { actorId: string }) {
    await delay();
    const ann: SystemAnnouncement = {
      ...input,
      id: `ann_${Math.random().toString(36).slice(2, 9)}`,
      createdAt: iso(),
      createdBy: opts.actorId,
    };
    adminFixtures.systemAnnouncements.push(ann);
    await auditLogRepo.record({
      actorId: opts.actorId,
      actorEmail: adminFixtures.users.find((u) => u.id === opts.actorId)?.email ?? "unknown",
      actorRole: adminFixtures.users.find((u) => u.id === opts.actorId)?.role ?? "super_admin",
      category: "configuration",
      action: "announcement.create",
      resourceType: "announcement",
      resourceId: ann.id,
      summary: `Created announcement "${ann.title}" (audience: ${ann.audience}).`,
      severity: "info",
    });
    return ann;
  },
  async update(id: string, patch: Partial<SystemAnnouncement>) {
    await delay();
    const a = adminFixtures.systemAnnouncements.find((x) => x.id === id);
    if (!a) throw new Error("Announcement not found");
    Object.assign(a, patch);
    return a;
  },
  async delete(id: string) {
    await delay();
    const idx = adminFixtures.systemAnnouncements.findIndex((x) => x.id === id);
    if (idx !== -1) adminFixtures.systemAnnouncements.splice(idx, 1);
  },
};

/* ------------------------------------------------------------------ Disputes */

const disputeRepo = {
  async listAll(filters: DisputeListFilters) {
    await delay(150);
    let items = [...adminFixtures.disputes];
    if (filters.status) items = items.filter((d) => d.status === filters.status);
    if (filters.q) {
      const q = filters.q.toLowerCase();
      items = items.filter(
        (d) => d.reference.toLowerCase().includes(q) || d.subject.toLowerCase().includes(q),
      );
    }
    const total = items.length;
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const paged = items.slice((page - 1) * pageSize, page * pageSize);
    return { items: paged, total };
  },
  async getById(id: string) {
    await delay();
    return adminFixtures.disputes.find((d) => d.id === id) ?? null;
  },
  async resolve(id: string, opts: { resolverId: string; status: DisputeStatus; notes: string }) {
    await delay(200);
    const d = adminFixtures.disputes.find((x) => x.id === id);
    if (!d) throw new Error("Dispute not found");
    d.status = opts.status;
    d.resolvedAt = iso();
    d.resolvedBy = opts.resolverId;
    d.resolutionNotes = opts.notes;
    await auditLogRepo.record({
      actorId: opts.resolverId,
      actorEmail: adminFixtures.users.find((u) => u.id === opts.resolverId)?.email ?? "unknown",
      actorRole: adminFixtures.users.find((u) => u.id === opts.resolverId)?.role ?? "super_admin",
      category: "finance",
      action: "dispute.resolve",
      resourceType: "dispute",
      resourceId: id,
      summary: `Resolved dispute ${d.reference} as ${opts.status}.`,
      severity: "info",
    });
    return d;
  },
};

/* ------------------------------------------------------------------ Export */

export const devRepositories: Repositories = {
  universities: universityRepo,
  neighbourhoods: neighbourhoodRepo,
  properties: propertyRepo,
  floors: floorRepo,
  rooms: roomRepo,
  bookings: bookingRepo,
  payments: paymentRepo,
  payouts: payoutRepo,
  notifications: notificationRepo,
  support: supportRepo,
  savedProperties: savedRepo,
  verification: verificationRepo,
  // Admin
  users: userRepo,
  refunds: refundRepo,
  reconciliation: reconciliationRepo,
  auditLogs: auditLogRepo,
  platformSettings: platformSettingRepo,
  integrationHealth: integrationHealthRepo,
  knowledgeBase: knowledgeBaseRepo,
  announcements: announcementRepo,
  disputes: disputeRepo,
};

export type { Repositories };
