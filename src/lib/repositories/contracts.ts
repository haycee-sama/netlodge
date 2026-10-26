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
  SavedProperty,
  SearchFilters,
  SearchResult,
  VerificationRecord,
  RentableUnitType,
} from "@/lib/types";

export interface UniversityRepository {
  list(): Promise<University[]>;
  getBySlug(slug: string): Promise<University | null>;
  getById(id: string): Promise<University | null>;
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
  getById(id: string): Promise<Booking | null>;
  initiate(input: {
    studentId: string;
    rentableUnitId: string;
    checkIn: string;
    rentalPeriod: RentableUnitType extends never ? never : import("@/lib/types").RentalPeriod;
  }): Promise<Booking>;
  cancel(id: string, reason: string): Promise<Booking>;
}

export interface PaymentRepository {
  listByStudent(studentId: string): Promise<Payment[]>;
  listByBooking(bookingId: string): Promise<Payment[]>;
  initiate(input: { bookingId: string; channel: Payment["channel"] }): Promise<Payment>;
  /** Confirm a payment. Only the backend may call this in production. */
  confirm(reference: string): Promise<Payment>;
}

export interface PayoutRepository {
  listByLandlord(landlordId: string): Promise<Payout[]>;
}

export interface NotificationRepository {
  listByUser(userId: string): Promise<AppNotification[]>;
  markRead(id: string): Promise<void>;
  markAllRead(userId: string): Promise<void>;
}

export interface SupportRepository {
  listByUser(userId: string): Promise<SupportTicket[]>;
  create(input: Pick<SupportTicket, "subject" | "category" | "priority" | "message">): Promise<SupportTicket>;
  reply(ticketId: string, message: string): Promise<SupportTicket>;
}

export interface SavedPropertyRepository {
  listByUser(userId: string): Promise<SavedProperty[]>;
  toggle(userId: string, propertyId: string): Promise<boolean>;
}

export interface VerificationRepository {
  getForLandlord(landlordId: string): Promise<VerificationRecord | null>;
  submit(landlordId: string, evidenceIds: string[]): Promise<VerificationRecord>;
}

export interface Repositories {
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
}
