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
  SavedProperty,
  SearchFilters,
  SearchResult,
  VerificationRecord,
  RentalPeriod,
  Facility,
  RentableUnitType,
} from "@/lib/types";
import type { Repositories } from "./contracts";

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
    return fixtures.supportTickets.filter((t) => t.userId === userId);
  },
  async create(input: Pick<SupportTicket, "subject" | "category" | "priority" | "message">) {
    await delay();
    const now = iso();
    const ticket: SupportTicket = {
      id: `tkt_${Math.random().toString(36).slice(2, 9)}`,
      reference: `NLG-TKT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      userId: "dev_student_1",
      status: "open",
      ...input,
      createdAt: now,
      updatedAt: now,
      replies: [],
    };
    fixtures.supportTickets.push(ticket);
    return ticket;
  },
  async reply(ticketId: string, message: string) {
    await delay();
    const idx = fixtures.supportTickets.findIndex((t) => t.id === ticketId);
    if (idx === -1) throw new Error("Ticket not found");
    fixtures.supportTickets[idx].replies.push({
      id: `r_${Math.random().toString(36).slice(2, 6)}`,
      author: "user",
      message,
      createdAt: iso(),
    });
    fixtures.supportTickets[idx].updatedAt = iso();
    return fixtures.supportTickets[idx];
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
    // Always return an unverified example for the demo landlord.
    return {
      id: `ver_${landlordId}`,
      entityType: "landlord" as const,
      entityId: landlordId,
      status: "approved" as const,
      evidence: [
        {
          id: "ev_1",
          type: "identity" as const,
          label: "NIN slip",
          fileName: "nin_slip.pdf",
          fileUrl: null,
          uploadedAt: iso(),
          status: "approved" as const,
        },
        {
          id: "ev_2",
          type: "address" as const,
          label: "Utility bill",
          fileName: "electricity_bill.pdf",
          fileUrl: null,
          uploadedAt: iso(),
          status: "approved" as const,
        },
        {
          id: "ev_3",
          type: "incorporation" as const,
          label: "CAC certificate",
          fileName: "cac_cert.pdf",
          fileUrl: null,
          uploadedAt: iso(),
          status: "approved" as const,
        },
      ],
      inspectionRecords: [
        {
          id: "insp_1",
          scheduledAt: iso(),
          completedAt: iso(),
          inspectorName: "NetLodge Inspection Team",
          findings: "Property meets NetLodge verification standards. Borehole, security and fire safety verified on-site.",
          recommendations: "Install additional smoke detectors on the third floor.",
          status: "completed" as const,
          reportUrl: null,
        },
      ],
      submittedAt: iso(),
      reviewedAt: iso(),
      reviewerId: "reviewer_1",
      reviewNotes: "All documents verified. Inspection passed.",
      outstandingActions: [],
    } satisfies VerificationRecord;
  },
  async submit(landlordId: string, _evidenceIds: string[]) {
    await delay();
    return await this.getForLandlord(landlordId);
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
};

export type { Repositories };
