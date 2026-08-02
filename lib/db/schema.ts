// lib/db/schema.ts
import {
  pgTable, pgEnum, uuid, varchar, text, boolean, timestamp,
  integer, numeric, decimal, jsonb, date, uniqueIndex, index,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// ── ENUMS ──────────────────────────────────────────────────────
export const userRoleEnum        = pgEnum('user_role', ['student', 'landlord', 'admin'])
export const kycStatusEnum       = pgEnum('kyc_status', ['pending', 'approved', 'rejected'])
export const roomStatusEnum      = pgEnum('room_status', ['available', 'booked', 'maintenance'])
export const roomTypeEnum        = pgEnum('room_type', ['single', 'shared', 'self_contain'])
export const bathroomTypeEnum    = pgEnum('bathroom_type', ['ensuite', 'shared'])
export const furnishedStatusEnum = pgEnum('furnished_status', ['yes', 'no', 'partially'])
export const leaseDurationEnum   = pgEnum('lease_duration', ['full_year', 'per_semester', 'half_year'])
export const bookingStatusEnum   = pgEnum('booking_status', ['draft', 'pending_payment', 'confirmed', 'cancelled'])
export const paymentStatusEnum   = pgEnum('payment_status', ['unpaid', 'paid', 'failed'])
export const paymentMethodEnum   = pgEnum('payment_method', ['card', 'bank_transfer', 'ussd', 'opay', 'moniepoint', 'qr', 'mobile_money'])
export const amenityCategoryEnum = pgEnum('amenity_category', ['power', 'water', 'internet', 'security', 'extras'])
export const otpPurposeEnum = pgEnum('otp_purpose', ['email_verification', 'password_reset'])

// ── 1. USERS ───────────────────────────────────────────────────
export const users = pgTable('users', {
  id:              uuid('id').primaryKey().defaultRandom(),
  email:           varchar('email', { length: 255 }).notNull().unique(),
  phone:           varchar('phone', { length: 20 }).notNull(),
  passwordHash:    text('password_hash'), // nullable — OAuth-only accounts (Google) have none
  oauthProvider:   varchar('oauth_provider', { length: 20 }), // 'google', null for credentials accounts
  role:            userRoleEnum('role').notNull(),
  firstName:       varchar('first_name', { length: 100 }).notNull(),
  lastName:        varchar('last_name', { length: 100 }).notNull(),
  isEmailVerified: boolean('is_email_verified').notNull().default(false),
  lastLoginAt:     timestamp('last_login_at', { withTimezone: true }),
  createdAt:       timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:       timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  roleIdx: index('idx_users_role').on(t.role),
}))

// ── verification_tokens (new) ───────────────────────────────────
export const emailOtps = pgTable('email_otps', {
  id:         uuid('id').primaryKey().defaultRandom(),
  userId:     uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  purpose:    otpPurposeEnum('purpose').notNull(),
  codeHash:   text('code_hash').notNull(),
  expiresAt:  timestamp('expires_at', { withTimezone: true }).notNull(),
  attempts:   integer('attempts').notNull().default(0),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  createdAt:  timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userPurposeIdx: index('idx_email_otps_user_purpose').on(t.userId, t.purpose),
}))

// ── 2. CITIES ──────────────────────────────────────────────────
export const cities = pgTable('cities', {
  id:        uuid('id').primaryKey().defaultRandom(),
  name:      varchar('name', { length: 100 }).notNull().unique(),
  state:     varchar('state', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ── 3. UNIVERSITIES ────────────────────────────────────────────
export const universities = pgTable('universities', {
  id:        uuid('id').primaryKey().defaultRandom(),
  cityId:    uuid('city_id').notNull().references(() => cities.id, { onDelete: 'restrict' }),
  name:      varchar('name', { length: 200 }).notNull(),
  shortName: varchar('short_name', { length: 50 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  cityIdx: index('idx_universities_city').on(t.cityId),
  uniqCityName: uniqueIndex('uniq_university_city_name').on(t.cityId, t.name),
}))

// ── 4. AMENITIES ───────────────────────────────────────────────
export const amenities = pgTable('amenities', {
  id:       uuid('id').primaryKey().defaultRandom(),
  category: amenityCategoryEnum('category').notNull(),
  label:    varchar('label', { length: 100 }).notNull(),
}, (t) => ({
  uniqCategoryLabel: uniqueIndex('uniq_amenity_category_label').on(t.category, t.label),
}))

// ── 5. STUDENTS ────────────────────────────────────────────────
export const students = pgTable('students', {
  id:                     uuid('id').primaryKey().defaultRandom(),
  userId:                 uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  universityId:           uuid('university_id').notNull().references(() => universities.id, { onDelete: 'restrict' }),
  course:                 varchar('course', { length: 150 }).notNull(),
  yearLevel:              varchar('year_level', { length: 50 }).notNull(),
  verificationStatus:     kycStatusEnum('verification_status').notNull().default('pending'),
  verificationProvider:   varchar('verification_provider', { length: 50 }),
  verificationReference:  varchar('verification_reference', { length: 150 }),
  reviewedBy:             uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
  reviewedAt:             timestamp('reviewed_at', { withTimezone: true }),
  createdAt:              timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:              timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  universityIdx: index('idx_students_university').on(t.universityId),
  verificationIdx: index('idx_students_verification').on(t.verificationStatus),
}))

// ── 6. LANDLORDS ───────────────────────────────────────────────
export const landlords = pgTable('landlords', {
  id:                      uuid('id').primaryKey().defaultRandom(),
  userId:                  uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  businessName:            varchar('business_name', { length: 200 }),
  verificationStatus:      kycStatusEnum('verification_status').notNull().default('pending'),
  verificationProvider:    varchar('verification_provider', { length: 50 }),
  verificationReference:   varchar('verification_reference', { length: 150 }),
  reviewedBy:              uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
  reviewedAt:              timestamp('reviewed_at', { withTimezone: true }),
  bankName:                varchar('bank_name', { length: 100 }),
  bankAccountNumberEncrypted: text('bank_account_number_encrypted'),
  bankAccountName:         varchar('bank_account_name', { length: 200 }),
  kycDocuments:            jsonb('kyc_documents').notNull().default(sql`'[]'::jsonb`), // [{type, url, name}]
  createdAt:               timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:               timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  verificationIdx: index('idx_landlords_verification').on(t.verificationStatus),
}))

// ── 7. PROPERTIES ──────────────────────────────────────────────
export const properties = pgTable('properties', {
  id:                        uuid('id').primaryKey().defaultRandom(),
  landlordId:                uuid('landlord_id').notNull().references(() => landlords.id, { onDelete: 'cascade' }),
  cityId:                    uuid('city_id').notNull().references(() => cities.id, { onDelete: 'restrict' }),
  universityId:              uuid('university_id').notNull().references(() => universities.id, { onDelete: 'restrict' }),
  name:                      varchar('name', { length: 200 }).notNull(),
  address:                   text('address').notNull(),
  latitude:                  decimal('latitude', { precision: 9, scale: 6 }),
  longitude:                 decimal('longitude', { precision: 9, scale: 6 }),
  distanceToGateMeters:      integer('distance_to_gate_meters'),
  distanceToFacultyMeters:   integer('distance_to_faculty_meters'),
  distanceToMarketMeters:    integer('distance_to_market_meters'),
  amenityIds:                uuid('amenity_ids').array().notNull().default(sql`'{}'::uuid[]`),
  rules:                     text('rules').array().notNull().default(sql`'{}'::text[]`),
  isVerified:                boolean('is_verified').notNull().default(false),
  createdAt:                 timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:                 timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  landlordIdx: index('idx_properties_landlord').on(t.landlordId),
  cityIdx: index('idx_properties_city').on(t.cityId),
  universityIdx: index('idx_properties_university').on(t.universityId),
  coordsIdx: index('idx_properties_coords').on(t.latitude, t.longitude),
}))

// ── 8. ROOMS ───────────────────────────────────────────────────
export const rooms = pgTable('rooms', {
  id:            uuid('id').primaryKey().defaultRandom(),
  propertyId:    uuid('property_id').notNull().references(() => properties.id, { onDelete: 'cascade' }),
  blockName:     varchar('block_name', { length: 100 }).notNull(),
  roomNumber:    varchar('room_number', { length: 20 }).notNull(),
  roomType:      roomTypeEnum('room_type').notNull(),
  floor:         varchar('floor', { length: 20 }),
  bathroomType:  bathroomTypeEnum('bathroom_type').notNull(),
  furnished:     furnishedStatusEnum('furnished').notNull(),
  dimensions:    varchar('dimensions', { length: 50 }),
  description:   text('description'),
  status:        roomStatusEnum('status').notNull().default('available'),
  amenityIds:    uuid('amenity_ids').array().notNull().default(sql`'{}'::uuid[]`),
  images:        jsonb('images').notNull().default(sql`'[]'::jsonb`),
  createdAt:     timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:     timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  propertyIdx: index('idx_rooms_property').on(t.propertyId),
  statusIdx: index('idx_rooms_status').on(t.status),
  typeIdx: index('idx_rooms_type').on(t.roomType),
  uniqRoom: uniqueIndex('uniq_property_block_room').on(t.propertyId, t.blockName, t.roomNumber),
}))

// ── 9. ROOM_LEASE_OPTIONS (source of pricing truth) ────────────
export const roomLeaseOptions = pgTable('room_lease_options', {
  id:        uuid('id').primaryKey().defaultRandom(),
  roomId:    uuid('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  leaseType: leaseDurationEnum('lease_type').notNull(),
  price:     numeric('price', { precision: 12, scale: 2 }).notNull(),
  isEnabled: boolean('is_enabled').notNull().default(true),
}, (t) => ({
  roomIdx: index('idx_lease_options_room').on(t.roomId),
  uniqRoomLease: uniqueIndex('uniq_room_lease_type').on(t.roomId, t.leaseType),
}))

// ── 10. BOOKINGS ───────────────────────────────────────────────
export const bookings = pgTable('bookings', {
  id:                uuid('id').primaryKey().defaultRandom(),
  bookingRef:        varchar('booking_ref', { length: 30 }).notNull().unique()
                        .default(sql`generate_booking_ref()`), // requires the SQL fn from Phase 1 schema
  studentId:         uuid('student_id').notNull().references(() => students.id, { onDelete: 'restrict' }),
  roomId:            uuid('room_id').notNull().references(() => rooms.id, { onDelete: 'restrict' }),
  leaseType:         leaseDurationEnum('lease_type').notNull(),
  roomPrice:         numeric('room_price', { precision: 12, scale: 2 }).notNull(),
  serviceFee:        numeric('service_fee', { precision: 12, scale: 2 }).notNull(),
  totalAmount:       numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
  moveInDate:        date('move_in_date').notNull(),
  leaseEndDate:      date('lease_end_date').notNull(),
  status:            bookingStatusEnum('status').notNull().default('draft'),
  agreedToTermsAt:   timestamp('agreed_to_terms_at', { withTimezone: true }),
  paymentMethod:     paymentMethodEnum('payment_method'),
  paymentStatus:     paymentStatusEnum('payment_status').notNull().default('unpaid'),
  paymentProvider:   varchar('payment_provider', { length: 50 }).default('paystack'),
  paymentReference:  varchar('payment_reference', { length: 150 }),
  paidAt:            timestamp('paid_at', { withTimezone: true }),
  createdAt:         timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:         timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  studentIdx: index('idx_bookings_student').on(t.studentId),
  roomIdx: index('idx_bookings_room').on(t.roomId),
  statusIdx: index('idx_bookings_status').on(t.status),
  paymentStatusIdx: index('idx_bookings_payment_status').on(t.paymentStatus),
  paymentRefIdx: uniqueIndex('uniq_bookings_payment_ref').on(t.paymentReference),
}))

// ── 11. SAVED_ROOMS (added — required by getSavedRoomsByStudent) ──
export const savedRooms = pgTable('saved_rooms', {
  id:        uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  roomId:    uuid('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  savedAt:   timestamp('saved_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  studentIdx: index('idx_saved_rooms_student').on(t.studentId),
  uniqStudentRoom: uniqueIndex('uniq_saved_room_student_room').on(t.studentId, t.roomId),
}))