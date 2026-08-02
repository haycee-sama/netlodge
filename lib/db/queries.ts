// lib/db/queries.ts
import { cache } from 'react'
import { eq, and, inArray, desc } from 'drizzle-orm'
import { db } from './index'
import {
  properties, rooms, roomLeaseOptions, cities, universities,
  amenities, landlords, users, bookings, savedRooms, students,
} from './schema'

// ── Formatting helpers — DB stores machine values, UI expects display strings ──
function formatRoomType(t: string) {
  if (t === 'self_contain') return 'Self-Contain'
  if (t === 'shared') return 'Shared'
  return 'Single'
}

function formatStatus(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function formatBathroom(b: string) {
  return b === 'ensuite' ? 'En-suite' : 'Shared'
}

function formatFurnished(f: string) {
  if (f === 'yes') return 'Yes'
  if (f === 'partially') return 'Partially'
  return 'No'
}

// ~80m/min average walking pace
function metersToWalkString(m: number | null) {
  if (!m) return ''
  const mins = Math.max(1, Math.round(m / 80))
  return `${mins} min${mins === 1 ? '' : 's'} walk`
}

type AmenityCategory = 'power' | 'water' | 'internet' | 'security' | 'extras'
type AmenityGroups = Record<AmenityCategory, string[]>

function emptyAmenityGroups(): AmenityGroups {
  return { power: [], water: [], internet: [], security: [], extras: [] }
}

// Fetches ALL amenity rows needed in a single query, keyed by id — callers
// pass in the union of every id they'll need, then group per-item in JS.
// This replaces the old pattern of one amenities query per room per property.
async function fetchAmenitiesMap(ids: string[]) {
  const map = new Map<string, { category: AmenityCategory; label: string }>()
  if (!ids || ids.length === 0) return map
  const uniqueIds = [...new Set(ids)]
  const rows = await db.select().from(amenities).where(inArray(amenities.id, uniqueIds))
  for (const row of rows) map.set(row.id, { category: row.category as AmenityCategory, label: row.label })
  return map
}

function groupAmenityIds(ids: string[] | null | undefined, map: Map<string, { category: AmenityCategory; label: string }>) {
  const grouped = emptyAmenityGroups()
  for (const id of ids ?? []) {
    const found = map.get(id)
    if (found) grouped[found.category].push(found.label)
  }
  return grouped
}

async function getFullYearPrice(roomId: string): Promise<number> {
  const leaseRows = await db.select().from(roomLeaseOptions)
    .where(and(eq(roomLeaseOptions.roomId, roomId), eq(roomLeaseOptions.isEnabled, true)))
  const fullYear = leaseRows.find((l) => l.leaseType === 'full_year')
  if (fullYear) return Number(fullYear.price)
  return leaseRows[0] ? Number(leaseRows[0].price) : 0
}

// Given a set of room ids, fetch ALL their lease options in one query and
// group them by roomId — replaces per-room lease-option queries.
async function fetchLeaseOptionsGrouped(roomIds: string[], enabledOnly = false) {
  const grouped = new Map<string, typeof roomLeaseOptions.$inferSelect[]>()
  if (roomIds.length === 0) return grouped

  const condition = enabledOnly
    ? and(inArray(roomLeaseOptions.roomId, roomIds), eq(roomLeaseOptions.isEnabled, true))
    : inArray(roomLeaseOptions.roomId, roomIds)

  const rows = await db.select().from(roomLeaseOptions).where(condition)
  for (const row of rows) {
    const list = grouped.get(row.roomId) ?? []
    list.push(row)
    grouped.set(row.roomId, list)
  }
  return grouped
}

function priceForRoom(roomId: string, leaseRowsForRoom: typeof roomLeaseOptions.$inferSelect[] | undefined) {
  if (!leaseRowsForRoom || leaseRowsForRoom.length === 0) return 0
  const fullYear = leaseRowsForRoom.find((l) => l.leaseType === 'full_year')
  if (fullYear) return Number(fullYear.price)
  return Number(leaseRowsForRoom[0].price)
}

// Fetch multiple cities/universities in one query each, keyed by id —
// replaces "one city query + one university query" per property/room/booking.
async function fetchCitiesMap(ids: string[]) {
  const map = new Map<string, typeof cities.$inferSelect>()
  const uniqueIds = [...new Set(ids)].filter(Boolean)
  if (uniqueIds.length === 0) return map
  const rows = await db.select().from(cities).where(inArray(cities.id, uniqueIds))
  for (const row of rows) map.set(row.id, row)
  return map
}

async function fetchUniversitiesMap(ids: string[]) {
  const map = new Map<string, typeof universities.$inferSelect>()
  const uniqueIds = [...new Set(ids)].filter(Boolean)
  if (uniqueIds.length === 0) return map
  const rows = await db.select().from(universities).where(inArray(universities.id, uniqueIds))
  for (const row of rows) map.set(row.id, row)
  return map
}

// ════════════════════════════════════════════════════════════
// getPropertySummaries — search page, homepage
// Batched: 1 query for properties, 1 for ALL their rooms, 1 for ALL
// lease options, 1 for cities, 1 for universities — regardless of how
// many properties/rooms exist. Previously this was 4+ queries PER PROPERTY.
// ════════════════════════════════════════════════════════════
export const getPropertySummaries = cache(async () => {
  const propertyRows = await db.select().from(properties)
  if (propertyRows.length === 0) return []

  const propertyIds = propertyRows.map((p) => p.id)
  const allRooms = await db.select().from(rooms).where(inArray(rooms.propertyId, propertyIds))
  const allRoomIds = allRooms.map((r) => r.id)

  const leaseGrouped = await fetchLeaseOptionsGrouped(allRoomIds, true)
  const citiesMap = await fetchCitiesMap(propertyRows.map((p) => p.cityId))
  const universitiesMap = await fetchUniversitiesMap(propertyRows.map((p) => p.universityId))

  const roomsByProperty = new Map<string, typeof rooms.$inferSelect[]>()
  for (const r of allRooms) {
    const list = roomsByProperty.get(r.propertyId) ?? []
    list.push(r)
    roomsByProperty.set(r.propertyId, list)
  }

  return propertyRows.map((p) => {
    const roomRows = roomsByProperty.get(p.id) ?? []

    const prices = roomRows
      .map((r) => priceForRoom(r.id, leaseGrouped.get(r.id)))
      .filter((price) => price > 0)

    const roomWithImage = roomRows.find((r) => Array.isArray(r.images) && (r.images as any[]).length > 0)
    const firstImage = roomWithImage ? (roomWithImage.images as any[])[0] : null

    return {
      id: p.id,
      name: p.name,
      university: universitiesMap.get(p.universityId)?.name ?? '',
      city: citiesMap.get(p.cityId)?.name ?? '',
      totalRooms: roomRows.length,
      availableRooms: roomRows.filter((r) => r.status === 'available').length,
      priceFrom: prices.length ? Math.min(...prices) : 0,
      priceTo: prices.length ? Math.max(...prices) : 0,
      blocks: [...new Set(roomRows.map((r) => r.blockName))],
      roomTypes: [...new Set(roomRows.map((r) => formatRoomType(r.roomType)))],
      thumbnail: firstImage ? { url: firstImage.url, alt: firstImage.alt } : null,
    }
  })
})

// ════════════════════════════════════════════════════════════
// getPropertyById — property detail page (full property + all blocks/rooms)
// Batched: property+city+university+landlord+landlordUser now come from
// ONE joined query instead of 5 separate ones. Room amenities are fetched
// via one shared amenities query instead of one query per room.
// Wrapped in cache() so generateMetadata + the page component share one call.
// ════════════════════════════════════════════════════════════
export const getPropertyById = cache(async (id: string) => {
  const [row] = await db
    .select({
      property: properties,
      city: cities,
      university: universities,
      landlord: landlords,
      landlordUser: users,
    })
    .from(properties)
    .leftJoin(cities, eq(properties.cityId, cities.id))
    .leftJoin(universities, eq(properties.universityId, universities.id))
    .leftJoin(landlords, eq(properties.landlordId, landlords.id))
    .leftJoin(users, eq(landlords.userId, users.id))
    .where(eq(properties.id, id))

  if (!row?.property) return null
  const { property, city, university, landlord, landlordUser } = row

  // Needed by rooms/[id]/page.jsx ("Manages N properties on Netlodge")
  const landlordPropertyCount = landlord
    ? (await db.select({ id: properties.id }).from(properties).where(eq(properties.landlordId, landlord.id))).length
    : 0

  const roomRows = await db.select().from(rooms).where(eq(rooms.propertyId, id))
  const roomIds = roomRows.map((r) => r.id)
  const leaseGrouped = await fetchLeaseOptionsGrouped(roomIds)

  // Collect every amenity id needed (property-level + every room's) and
  // fetch them all in ONE query, instead of one query per room.
  const allAmenityIds = [
    ...(property.amenityIds ?? []),
    ...roomRows.flatMap((r) => r.amenityIds ?? []),
  ]
  const amenitiesMap = await fetchAmenitiesMap(allAmenityIds)

  const propertyAmenitiesGrouped = groupAmenityIds(property.amenityIds, amenitiesMap)

  const blockMap = new Map<string, { id: string; name: string; floor: string; rooms: any[] }>()
  for (const r of roomRows) {
    if (!blockMap.has(r.blockName)) {
      blockMap.set(r.blockName, { id: r.blockName, name: r.blockName, floor: r.floor ?? '', rooms: [] })
    }
    const roomLeaseRows = leaseGrouped.get(r.id) ?? []
    const fullYear = roomLeaseRows.find((l) => l.leaseType === 'full_year')
    const roomAmenitiesGrouped = groupAmenityIds(r.amenityIds, amenitiesMap)

    blockMap.get(r.blockName)!.rooms.push({
      id: r.id,
      number: r.roomNumber,
      type: formatRoomType(r.roomType),
      price: fullYear ? Number(fullYear.price) : (roomLeaseRows[0] ? Number(roomLeaseRows[0].price) : 0),
      status: formatStatus(r.status),
      floor: r.floor ?? '',
      bathroom: formatBathroom(r.bathroomType),
      furnished: formatFurnished(r.furnished),
      dimensions: r.dimensions ?? '',
      images: r.images ?? [],
      amenities: roomAmenitiesGrouped,
      leaseOptions: roomLeaseRows.map((l) => ({
        leaseType: l.leaseType,
        price: Number(l.price),
        isEnabled: l.isEnabled,
      })),
    })
  }

  return {
    id: property.id,
    name: property.name,
    university: university?.name ?? '',
    city: city?.name ?? '',
    address: property.address,
    distanceToGate: metersToWalkString(property.distanceToGateMeters),
    distanceToFaculty: metersToWalkString(property.distanceToFacultyMeters),
    amenities: propertyAmenitiesGrouped,
    rules: property.rules,
    landlord: {
      name: landlordUser
        ? `${landlordUser.firstName} ${landlordUser.lastName}`
        : (landlord?.businessName ?? 'Landlord'),
      verified: landlord?.verificationStatus === 'approved',
      responseTime: 'Usually responds within a few hours',
      propertiesManaged: landlordPropertyCount,
    },
    blocks: Array.from(blockMap.values()),
  }
})

// Used by the student signup page to populate a real, DB-backed
// university dropdown instead of a hardcoded list that can drift out
// of sync with what's actually seeded.
export const getUniversitiesForSignup = cache(async () => {
  const rows = await db.select({
    id: universities.id,
    name: universities.name,
    cityName: cities.name,
  }).from(universities).innerJoin(cities, eq(universities.cityId, cities.id))

  return rows.map((r) => ({ id: r.id, name: r.name, cityName: r.cityName }))
})

// ════════════════════════════════════════════════════════════
// getRoomById — room detail page
// Deliberately does NOT call getPropertyById. The room page only ever
// needs ONE room + its parent property's basic info + that room's own
// amenities — it never needs every other room/block in the property.
// Previously this reused getPropertyById's full chain (all rooms, all
// blocks, all room-amenity queries) just to render a single room, which
// meant large properties made this page dramatically slower and far
// more exposed to a single transient DB connection failure killing the
// whole page. This version does a fixed ~5 queries regardless of how
// many rooms the property has.
// ════════════════════════════════════════════════════════════
export const getRoomById = cache(async (roomId: string) => {
  const [roomRow] = await db.select().from(rooms).where(eq(rooms.id, roomId))
  if (!roomRow) return null

  const [row] = await db
    .select({
      property: properties,
      city: cities,
      university: universities,
      landlord: landlords,
      landlordUser: users,
    })
    .from(properties)
    .leftJoin(cities, eq(properties.cityId, cities.id))
    .leftJoin(universities, eq(properties.universityId, universities.id))
    .leftJoin(landlords, eq(properties.landlordId, landlords.id))
    .leftJoin(users, eq(landlords.userId, users.id))
    .where(eq(properties.id, roomRow.propertyId))

  if (!row?.property) return null
  const { property, city, university, landlord, landlordUser } = row

  const landlordPropertyCount = landlord
    ? (await db.select({ id: properties.id }).from(properties).where(eq(properties.landlordId, landlord.id))).length
    : 0

  const leaseRows = await db.select().from(roomLeaseOptions).where(eq(roomLeaseOptions.roomId, roomId))
  const fullYear = leaseRows.find((l) => l.leaseType === 'full_year' && l.isEnabled)

  const amenitiesMap = await fetchAmenitiesMap(roomRow.amenityIds ?? [])
  const roomAmenitiesGrouped = groupAmenityIds(roomRow.amenityIds, amenitiesMap)

  const room = {
    id: roomRow.id,
    number: roomRow.roomNumber,
    type: formatRoomType(roomRow.roomType),
    price: fullYear ? Number(fullYear.price) : (leaseRows[0] ? Number(leaseRows[0].price) : 0),
    status: formatStatus(roomRow.status),
    floor: roomRow.floor ?? '',
    bathroom: formatBathroom(roomRow.bathroomType),
    furnished: formatFurnished(roomRow.furnished),
    dimensions: roomRow.dimensions ?? '',
    images: roomRow.images ?? [],
    amenities: roomAmenitiesGrouped,
    leaseOptions: leaseRows.map((l) => ({
      leaseType: l.leaseType,
      price: Number(l.price),
      isEnabled: l.isEnabled,
    })),
  }

  const block = { id: roomRow.blockName, name: roomRow.blockName, floor: roomRow.floor ?? '' }

  const property_ = {
    id: property.id,
    name: property.name,
    university: university?.name ?? '',
    city: city?.name ?? '',
    address: property.address,
    distanceToGate: metersToWalkString(property.distanceToGateMeters),
    distanceToFaculty: metersToWalkString(property.distanceToFacultyMeters),
    rules: property.rules,
    landlord: {
      name: landlordUser
        ? `${landlordUser.firstName} ${landlordUser.lastName}`
        : (landlord?.businessName ?? 'Landlord'),
      verified: landlord?.verificationStatus === 'approved',
      responseTime: 'Usually responds within a few hours',
      propertiesManaged: landlordPropertyCount,
    },
  }

  return { room, block, property: property_ }
})

// ════════════════════════════════════════════════════════════
// getPropertiesByLandlord — landlord portal
// Batched the same way as getPropertySummaries.
// ════════════════════════════════════════════════════════════
export const getPropertiesByLandlord = cache(async (landlordId: string) => {
  const propertyRows = await db.select().from(properties).where(eq(properties.landlordId, landlordId))
  if (propertyRows.length === 0) return []

  const propertyIds = propertyRows.map((p) => p.id)
  const allRooms = await db.select().from(rooms).where(inArray(rooms.propertyId, propertyIds))
  const allRoomIds = allRooms.map((r) => r.id)

  const leaseGrouped = await fetchLeaseOptionsGrouped(allRoomIds, true)
  const citiesMap = await fetchCitiesMap(propertyRows.map((p) => p.cityId))
  const universitiesMap = await fetchUniversitiesMap(propertyRows.map((p) => p.universityId))

  const roomsByProperty = new Map<string, typeof rooms.$inferSelect[]>()
  for (const r of allRooms) {
    const list = roomsByProperty.get(r.propertyId) ?? []
    list.push(r)
    roomsByProperty.set(r.propertyId, list)
  }

  return propertyRows.map((p) => {
    const roomRows = roomsByProperty.get(p.id) ?? []
    const prices = roomRows
      .map((r) => priceForRoom(r.id, leaseGrouped.get(r.id)))
      .filter((price) => price > 0)

    return {
      id: p.id,
      name: p.name,
      city: citiesMap.get(p.cityId)?.name ?? '',
      university: universitiesMap.get(p.universityId)?.name ?? '',
      totalRooms: roomRows.length,
      availableRooms: roomRows.filter((r) => r.status === 'available').length,
      isVerified: p.isVerified,
      blocks: [...new Set(roomRows.map((r) => r.blockName))],
      priceFrom: prices.length ? Math.min(...prices) : 0,
      priceTo: prices.length ? Math.max(...prices) : 0,
    }
  })
})

// Server-only ownership check. Never returned to a client component
// directly; callers use this purely to compare against session.user.roleRecordId.
export const getPropertyLandlordId = cache(async (propertyId: string): Promise<string | null> => {
  const [row] = await db.select({ landlordId: properties.landlordId }).from(properties).where(eq(properties.id, propertyId))
  return row?.landlordId ?? null
})

// Feeds the "create property" form's city → university cascading select
export const getCitiesWithUniversities = cache(async () => {
  const cityRows = await db.select().from(cities)
  const uniRows = await db.select().from(universities)
  return cityRows.map((c) => ({
    id: c.id,
    name: c.name,
    universities: uniRows.filter((u) => u.cityId === c.id).map((u) => ({ id: u.id, name: u.name })),
  }))
})

// Feeds property/room amenity selection with real DB-backed options
export const getAmenitiesList = cache(async () => {
  const rows = await db.select().from(amenities)
  return rows.map((a) => ({ id: a.id, category: a.category, label: a.label }))
})

// Landlord profile page. bankAccountNumberEncrypted is included but is
// STRICTLY server-only — every caller must strip it before passing props to
// a client component. It exists here only so the page can decrypt a masked
// preview server-side.
export const getLandlordProfileById = cache(async (landlordId: string) => {
  const [landlord] = await db.select().from(landlords).where(eq(landlords.id, landlordId))
  if (!landlord) return null
  const [user] = await db.select().from(users).where(eq(users.id, landlord.userId))

  return {
    businessName: landlord.businessName ?? '',
    verificationStatus: landlord.verificationStatus,
    bankName: landlord.bankName ?? '',
    bankAccountName: landlord.bankAccountName ?? '',
    bankAccountNumberEncrypted: landlord.bankAccountNumberEncrypted, // server-only
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
  }
})

// ════════════════════════════════════════════════════════════
// getBookingsByStudent — student dashboard / bookings page
// Batched: rooms/properties/cities/universities fetched once each via
// inArray, instead of 4 queries PER booking.
// ════════════════════════════════════════════════════════════
export const getBookingsByStudent = cache(async (studentId: string) => {
  const bookingRows = await db.select().from(bookings)
    .where(eq(bookings.studentId, studentId))
    .orderBy(desc(bookings.createdAt))

  if (bookingRows.length === 0) return []

  const roomIds = [...new Set(bookingRows.map((b) => b.roomId))]
  const roomRows = await db.select().from(rooms).where(inArray(rooms.id, roomIds))
  const roomsMap = new Map(roomRows.map((r) => [r.id, r]))

  const propertyIds = [...new Set(roomRows.map((r) => r.propertyId))]
  const propertyRows = propertyIds.length
    ? await db.select().from(properties).where(inArray(properties.id, propertyIds))
    : []
  const propertiesMap = new Map(propertyRows.map((p) => [p.id, p]))

  const citiesMap = await fetchCitiesMap(propertyRows.map((p) => p.cityId))
  const universitiesMap = await fetchUniversitiesMap(propertyRows.map((p) => p.universityId))

  const today = new Date()

  return bookingRows.map((b) => {
    const room = roomsMap.get(b.roomId) ?? null
    const property = room ? propertiesMap.get(room.propertyId) ?? null : null
    const city = property ? citiesMap.get(property.cityId) : undefined
    const university = property ? universitiesMap.get(property.universityId) : undefined

    let displayStatus = 'Pending'
    if (b.status === 'cancelled') displayStatus = 'Cancelled'
    else if (b.status === 'confirmed') {
      displayStatus = new Date(b.leaseEndDate) < today ? 'Expired' : 'Active'
    }

    return {
      id: b.id,
      bookingRef: b.bookingRef,
      roomLabel: room ? `Room ${room.roomNumber} — ${formatRoomType(room.roomType)}` : '',
      propertyName: property?.name ?? '',
      blockName: room?.blockName ?? '',
      university: university?.name ?? '',
      city: city?.name ?? '',
      leaseType: b.leaseType === 'full_year' ? '1 Year' : b.leaseType === 'per_semester' ? 'Per Semester' : 'Half Year',
      roomPrice: Number(b.roomPrice),
      serviceFee: Number(b.serviceFee),
      totalAmount: Number(b.totalAmount),
      status: displayStatus,
      paymentStatus: formatStatus(b.paymentStatus),
      moveInDate: b.moveInDate,
      leaseEndDate: b.leaseEndDate,
      paidAt: b.paidAt ? b.paidAt.toISOString() : null,
      createdAt: b.createdAt.toISOString(),
    }
  })
})

// NOTE: intentionally NOT wrapped in cache(). This is read again by
// booking/success/page.jsx immediately after finalizeConfirmedBooking()
// mutates the row — caching here would return stale pre-payment data on
// the second call within the same request.
export async function getBookingById(bookingId: string) {
  const [b] = await db.select().from(bookings).where(eq(bookings.id, bookingId))
  if (!b) return null

  const [room] = await db.select().from(rooms).where(eq(rooms.id, b.roomId))
  const property = room
    ? (await db.select().from(properties).where(eq(properties.id, room.propertyId)))[0]
    : null
  const city = property ? (await db.select().from(cities).where(eq(cities.id, property.cityId)))[0] : null

  return {
    id: b.id,
    bookingRef: b.bookingRef,
    studentId: b.studentId,       // used ONLY for server-side ownership checks, never sent to a client
    status: b.status,
    paymentStatus: b.paymentStatus,
    leaseType: b.leaseType === 'full_year' ? '1 Year' : b.leaseType === 'per_semester' ? 'Per Semester' : 'Half Year',
    roomPrice: Number(b.roomPrice),
    serviceFee: Number(b.serviceFee),
    totalAmount: Number(b.totalAmount),
    moveInDate: b.moveInDate,
    leaseEndDate: b.leaseEndDate,
    room: room ? {
      id: room.id,
      number: room.roomNumber,
      type: formatRoomType(room.roomType),
      bathroom: formatBathroom(room.bathroomType),
    } : null,
    blockName: room?.blockName ?? '',
    property: property ? {
      id: property.id,
      name: property.name,
      city: city?.name ?? '',
    } : null,
  }
}

export const getStudentProfileById = cache(async (studentId: string) => {
  const [student] = await db.select().from(students).where(eq(students.id, studentId))
  if (!student) return null
  const [user] = await db.select().from(users).where(eq(users.id, student.userId))
  const [university] = await db.select().from(universities).where(eq(universities.id, student.universityId))

  return {
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    university: university?.name ?? '',
    course: student.course,
    yearLevel: student.yearLevel,
    verified: student.verificationStatus === 'approved',
  }
})

// ════════════════════════════════════════════════════════════
// getSavedRoomsByStudent / isRoomSavedByStudent — /saved page
// Batched the same way as getBookingsByStudent.
// ════════════════════════════════════════════════════════════
export async function isRoomSavedByStudent(studentId: string, roomId: string): Promise<boolean> {
  const [row] = await db.select({ id: savedRooms.id }).from(savedRooms)
    .where(and(eq(savedRooms.studentId, studentId), eq(savedRooms.roomId, roomId)))
  return !!row
}

export const getSavedRoomsByStudent = cache(async (studentId: string) => {
  const savedRows = await db.select().from(savedRooms)
    .where(eq(savedRooms.studentId, studentId))
    .orderBy(desc(savedRooms.savedAt))

  if (savedRows.length === 0) return []

  const roomIds = [...new Set(savedRows.map((s) => s.roomId))]
  const roomRows = await db.select().from(rooms).where(inArray(rooms.id, roomIds))
  const roomsMap = new Map(roomRows.map((r) => [r.id, r]))

  const propertyIds = [...new Set(roomRows.map((r) => r.propertyId))]
  const propertyRows = propertyIds.length
    ? await db.select().from(properties).where(inArray(properties.id, propertyIds))
    : []
  const propertiesMap = new Map(propertyRows.map((p) => [p.id, p]))

  const citiesMap = await fetchCitiesMap(propertyRows.map((p) => p.cityId))
  const universitiesMap = await fetchUniversitiesMap(propertyRows.map((p) => p.universityId))
  const leaseGrouped = await fetchLeaseOptionsGrouped(roomIds, true)

  const results = []
  for (const s of savedRows) {
    const room = roomsMap.get(s.roomId)
    if (!room) continue // room was deleted — skip gracefully rather than crash the page

    const property = propertiesMap.get(room.propertyId)
    const city = property ? citiesMap.get(property.cityId) : undefined
    const university = property ? universitiesMap.get(property.universityId) : undefined
    const price = priceForRoom(room.id, leaseGrouped.get(room.id))

    results.push({
      id: s.id,
      roomId: room.id,
      propertyName: property?.name ?? '',
      roomNumber: room.roomNumber,
      roomType: formatRoomType(room.roomType),
      bathroom: formatBathroom(room.bathroomType),
      university: university?.name ?? '',
      city: city?.name ?? '',
      price,
      status: formatStatus(room.status),
      images: room.images ?? [],
      savedAt: s.savedAt.toISOString(),
    })
  }

  return results
})