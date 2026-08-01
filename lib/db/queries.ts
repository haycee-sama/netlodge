// lib/db/queries.ts
import { eq, and, inArray, desc } from 'drizzle-orm'
import { db } from './index'
import {
  properties, rooms, roomLeaseOptions, cities, universities,
  amenities, landlords, users, bookings, savedRooms, students,
} from './schema'

export const SERVICE_FEE_RATE = 0.07

// ── Formatting helpers — DB stores machine values, UI expects display strings ──
function formatRoomType(t: string) {
  if (t === 'self_contain') return 'Self-Contain'
  if (t === 'shared') return 'Shared'
  return 'Single'
}

function formatStatus(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function formatBookingStatus(s: string) {
  const map: Record<string, string> = {
    draft: 'Draft',
    pending_payment: 'Pending',
    confirmed: 'Confirmed',
    cancelled: 'Cancelled',
  }
  return map[s] ?? formatStatus(s)
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

async function getAmenitiesGrouped(ids: string[]) {
  const grouped: Record<'power' | 'water' | 'internet' | 'security' | 'extras', string[]> = {
    power: [], water: [], internet: [], security: [], extras: [],
  }
  if (!ids || ids.length === 0) return grouped
  const rows = await db.select().from(amenities).where(inArray(amenities.id, ids))
  for (const row of rows) grouped[row.category].push(row.label)
  return grouped
}

async function getFullYearPrice(roomId: string): Promise<number> {
  const leaseRows = await db.select().from(roomLeaseOptions)
    .where(and(eq(roomLeaseOptions.roomId, roomId), eq(roomLeaseOptions.isEnabled, true)))
  const fullYear = leaseRows.find((l) => l.leaseType === 'full_year')
  if (fullYear) return Number(fullYear.price)
  return leaseRows[0] ? Number(leaseRows[0].price) : 0
}

// ════════════════════════════════════════════════════════════
// getPropertySummaries — search page, homepage
// ════════════════════════════════════════════════════════════
export async function getPropertySummaries() {
  const propertyRows = await db.select().from(properties)

  const results = []
  for (const p of propertyRows) {
    const roomRows = await db.select().from(rooms).where(eq(rooms.propertyId, p.id))
    const roomIds = roomRows.map((r) => r.id)

    const leaseRows = roomIds.length
      ? await db.select().from(roomLeaseOptions)
          .where(and(inArray(roomLeaseOptions.roomId, roomIds), eq(roomLeaseOptions.isEnabled, true)))
      : []

    const prices = roomRows
      .map((r) => {
        const fy = leaseRows.find((l) => l.roomId === r.id && l.leaseType === 'full_year')
        if (fy) return Number(fy.price)
        const any = leaseRows.find((l) => l.roomId === r.id)
        return any ? Number(any.price) : 0
      })
      .filter((price) => price > 0)

    const [city] = await db.select().from(cities).where(eq(cities.id, p.cityId))
    const [university] = await db.select().from(universities).where(eq(universities.id, p.universityId))

    const roomWithImage = roomRows.find((r) => Array.isArray(r.images) && (r.images as any[]).length > 0)
    const firstImage = roomWithImage ? (roomWithImage.images as any[])[0] : null

    results.push({
      id: p.id,
      name: p.name,
      university: university?.name ?? '',
      city: city?.name ?? '',
      totalRooms: roomRows.length,
      availableRooms: roomRows.filter((r) => r.status === 'available').length,
      priceFrom: prices.length ? Math.min(...prices) : 0,
      priceTo: prices.length ? Math.max(...prices) : 0,
      blocks: [...new Set(roomRows.map((r) => r.blockName))],
      roomTypes: [...new Set(roomRows.map((r) => formatRoomType(r.roomType)))],
      thumbnail: firstImage ? { url: firstImage.url, alt: firstImage.alt } : null,
    })
  }

  return results
}

// ════════════════════════════════════════════════════════════
// getPropertyById — property detail page
// ════════════════════════════════════════════════════════════
export async function getPropertyById(id: string) {
  const [property] = await db.select().from(properties).where(eq(properties.id, id))
  if (!property) return null

  const [city] = await db.select().from(cities).where(eq(cities.id, property.cityId))
  const [university] = await db.select().from(universities).where(eq(universities.id, property.universityId))
  const [landlord] = await db.select().from(landlords).where(eq(landlords.id, property.landlordId))
  const landlordUser = landlord
    ? (await db.select().from(users).where(eq(users.id, landlord.userId)))[0]
    : null

  // Needed by rooms/[id]/page.jsx ("Manages N properties on Netlodge")
  const landlordPropertyRows = landlord
    ? await db.select({ id: properties.id }).from(properties).where(eq(properties.landlordId, landlord.id))
    : []

  const roomRows = await db.select().from(rooms).where(eq(rooms.propertyId, id))
  const roomIds = roomRows.map((r) => r.id)
  const leaseRows = roomIds.length
    ? await db.select().from(roomLeaseOptions).where(inArray(roomLeaseOptions.roomId, roomIds))
    : []

  const propertyAmenitiesGrouped = await getAmenitiesGrouped(property.amenityIds)

  const blockMap = new Map<string, { id: string; name: string; floor: string; rooms: any[] }>()
  for (const r of roomRows) {
    if (!blockMap.has(r.blockName)) {
      blockMap.set(r.blockName, { id: r.blockName, name: r.blockName, floor: r.floor ?? '', rooms: [] })
    }
    const roomLeaseRows = leaseRows.filter((l) => l.roomId === r.id)
    const fullYear = roomLeaseRows.find((l) => l.leaseType === 'full_year')

    // Needed by rooms/[id]/page.jsx ("Amenities" section, grouped by category)
    const roomAmenitiesGrouped = await getAmenitiesGrouped(r.amenityIds)

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
      propertiesManaged: landlordPropertyRows.length,
    },
    blocks: Array.from(blockMap.values()),
  }
}

// NEW — used by the student signup page to populate a real, DB-backed
// university dropdown instead of a hardcoded list that can drift out
// of sync with what's actually seeded.
export async function getUniversitiesForSignup() {
  const rows = await db.select({
    id: universities.id,
    name: universities.name,
    cityName: cities.name,
  }).from(universities).innerJoin(cities, eq(universities.cityId, cities.id))

  return rows.map((r) => ({ id: r.id, name: r.name, cityName: r.cityName }))
}

// ════════════════════════════════════════════════════════════
// getRoomById — room detail page
// ════════════════════════════════════════════════════════════
export async function getRoomById(roomId: string) {
  const [roomRow] = await db.select().from(rooms).where(eq(rooms.id, roomId))
  if (!roomRow) return null

  const property = await getPropertyById(roomRow.propertyId)
  if (!property) return null

  const block = property.blocks.find((b) => b.name === roomRow.blockName)
  const room = block?.rooms.find((r: any) => r.id === roomId)
  if (!block || !room) return null

  return { room, block, property }
}

// ════════════════════════════════════════════════════════════
// getPropertiesByLandlord — landlord portal
// ════════════════════════════════════════════════════════════
export async function getPropertiesByLandlord(landlordId: string) {
  const propertyRows = await db.select().from(properties).where(eq(properties.landlordId, landlordId))

  const results = []
  for (const p of propertyRows) {
    const roomRows = await db.select().from(rooms).where(eq(rooms.propertyId, p.id))
    const roomIds = roomRows.map((r) => r.id)
    const leaseRows = roomIds.length
      ? await db.select().from(roomLeaseOptions).where(and(inArray(roomLeaseOptions.roomId, roomIds), eq(roomLeaseOptions.isEnabled, true)))
      : []

    const prices = roomRows.map((r) => {
      const fy = leaseRows.find((l) => l.roomId === r.id && l.leaseType === 'full_year')
      if (fy) return Number(fy.price)
      const any = leaseRows.find((l) => l.roomId === r.id)
      return any ? Number(any.price) : 0
    }).filter((price) => price > 0)

    const [city] = await db.select().from(cities).where(eq(cities.id, p.cityId))
    const [university] = await db.select().from(universities).where(eq(universities.id, p.universityId))

    results.push({
      id: p.id,
      name: p.name,
      city: city?.name ?? '',
      university: university?.name ?? '',
      totalRooms: roomRows.length,
      availableRooms: roomRows.filter((r) => r.status === 'available').length,
      isVerified: p.isVerified,
      blocks: [...new Set(roomRows.map((r) => r.blockName))],
      priceFrom: prices.length ? Math.min(...prices) : 0,
      priceTo: prices.length ? Math.max(...prices) : 0,
    })
  }

  return results
}

// NEW — server-only ownership check. Never returned to a client component
// directly; callers use this purely to compare against session.user.roleRecordId.
export async function getPropertyLandlordId(propertyId: string): Promise<string | null> {
  const [row] = await db.select({ landlordId: properties.landlordId }).from(properties).where(eq(properties.id, propertyId))
  return row?.landlordId ?? null
}

// NEW — feeds the "create property" form's city → university cascading select
export async function getCitiesWithUniversities() {
  const cityRows = await db.select().from(cities)
  const uniRows = await db.select().from(universities)
  return cityRows.map((c) => ({
    id: c.id,
    name: c.name,
    universities: uniRows.filter((u) => u.cityId === c.id).map((u) => ({ id: u.id, name: u.name })),
  }))
}

// NEW — feeds property/room amenity selection with real DB-backed options
export async function getAmenitiesList() {
  const rows = await db.select().from(amenities)
  return rows.map((a) => ({ id: a.id, category: a.category, label: a.label }))
}

// NEW — landlord profile page. bankAccountNumberEncrypted is included but is
// STRICTLY server-only — every caller must strip it before passing props to
// a client component. It exists here only so the page can decrypt a masked
// preview server-side.
export async function getLandlordProfileById(landlordId: string) {
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
}

// ════════════════════════════════════════════════════════════
// getBookingsByStudent — student dashboard / bookings page
// ════════════════════════════════════════════════════════════
export async function getBookingsByStudent(studentId: string) {
  const bookingRows = await db.select().from(bookings)
    .where(eq(bookings.studentId, studentId))
    .orderBy(desc(bookings.createdAt))

  const today = new Date()
  const results = []

  for (const b of bookingRows) {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, b.roomId))
    const property = room
      ? (await db.select().from(properties).where(eq(properties.id, room.propertyId)))[0]
      : null
    const city = property ? (await db.select().from(cities).where(eq(cities.id, property.cityId)))[0] : null
    const university = property ? (await db.select().from(universities).where(eq(universities.id, property.universityId)))[0] : null

    let displayStatus = 'Pending'
    if (b.status === 'cancelled') displayStatus = 'Cancelled'
    else if (b.status === 'confirmed') {
      displayStatus = new Date(b.leaseEndDate) < today ? 'Expired' : 'Active'
    }

    results.push({
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
    })
  }

  return results
}


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

export async function getStudentProfileById(studentId: string) {
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
}

// ════════════════════════════════════════════════════════════
// getSavedRoomsByStudent — /saved page
// ════════════════════════════════════════════════════════════
export async function getSavedRoomsByStudent(studentId: string) {
  const savedRows = await db.select().from(savedRooms)
    .where(eq(savedRooms.studentId, studentId))
    .orderBy(desc(savedRooms.savedAt))

  const results = []
  for (const s of savedRows) {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, s.roomId))
    if (!room) continue

    const property = (await db.select().from(properties).where(eq(properties.id, room.propertyId)))[0]
    const price = await getFullYearPrice(room.id)

    results.push({
      id: s.id,
      propertyName: property?.name ?? '',
      roomNumber: room.roomNumber,
      roomType: formatRoomType(room.roomType),
      price,
      status: formatStatus(room.status),
      images: room.images ?? [],
    })
  }

  return results
}