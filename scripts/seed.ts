// scripts/seed.ts
// Run with: npx tsx scripts/seed.ts
// Safe to re-run — everything is find-or-create, nothing duplicates.

import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { eq, and, inArray } from 'drizzle-orm'
import { db } from '../lib/db'
import {
  cities, universities, amenities, users, landlords,
  properties, rooms, roomLeaseOptions,
} from '../lib/db/schema'

// ════════════════════════════════════════════════════════════
// find-or-create helpers
// ════════════════════════════════════════════════════════════

async function getOrCreateCity(name: string, state: string) {
  const [existing] = await db.select().from(cities).where(eq(cities.name, name))
  if (existing) return existing
  const [created] = await db.insert(cities).values({ name, state }).returning()
  return created
}

async function getOrCreateUniversity(cityId: string, name: string, shortName: string) {
  const [existing] = await db.select().from(universities)
    .where(and(eq(universities.cityId, cityId), eq(universities.name, name)))
  if (existing) return existing
  const [created] = await db.insert(universities).values({ cityId, name, shortName }).returning()
  return created
}

async function getOrCreateAmenity(category: typeof amenities.$inferInsert['category'], label: string) {
  const [existing] = await db.select().from(amenities)
    .where(and(eq(amenities.category, category), eq(amenities.label, label)))
  if (existing) return existing
  const [created] = await db.insert(amenities).values({ category, label }).returning()
  return created
}

async function getOrCreateLandlordUser(input: {
  email: string
  phone: string
  firstName: string
  lastName: string
  businessName: string
}) {
  const [existingUser] = await db.select().from(users).where(eq(users.email, input.email))
  if (existingUser) {
    const [landlord] = await db.select().from(landlords).where(eq(landlords.userId, existingUser.id))
    return { user: existingUser, landlord }
  }

  const passwordHash = await bcrypt.hash('Password123!', 10)
  const [user] = await db.insert(users).values({
    email: input.email,
    phone: input.phone,
    passwordHash,
    role: 'landlord',
    firstName: input.firstName,
    lastName: input.lastName,
    isEmailVerified: true,
  }).returning()

  const [landlord] = await db.insert(landlords).values({
    userId: user.id,
    businessName: input.businessName,
    verificationStatus: 'approved',
    reviewedAt: new Date(),
  }).returning()

  return { user, landlord }
}

async function getOrCreateProperty(input: {
  landlordId: string
  cityId: string
  universityId: string
  name: string
  address: string
  latitude: string
  longitude: string
  distanceToGateMeters: number
  distanceToFacultyMeters: number
  distanceToMarketMeters: number
  amenityIds: string[]
  rules: string[]
}) {
  const [existing] = await db.select().from(properties)
    .where(and(eq(properties.landlordId, input.landlordId), eq(properties.name, input.name)))
  if (existing) return existing

  const [created] = await db.insert(properties).values({
    ...input,
    isVerified: true,
  }).returning()
  return created
}

async function getOrCreateRoom(input: {
  propertyId: string
  blockName: string
  roomNumber: string
  roomType: typeof rooms.$inferInsert['roomType']
  floor: string
  bathroomType: typeof rooms.$inferInsert['bathroomType']
  furnished: typeof rooms.$inferInsert['furnished']
  dimensions: string
  status: typeof rooms.$inferInsert['status']
  amenityIds: string[]
  images: { url: string; alt: string }[]
}) {
  const [existing] = await db.select().from(rooms).where(
    and(
      eq(rooms.propertyId, input.propertyId),
      eq(rooms.blockName, input.blockName),
      eq(rooms.roomNumber, input.roomNumber)
    )
  )
  if (existing) return existing

  const [created] = await db.insert(rooms).values(input).returning()
  return created
}

async function upsertLeaseOption(roomId: string, leaseType: typeof roomLeaseOptions.$inferInsert['leaseType'], price: number) {
  const [existing] = await db.select().from(roomLeaseOptions).where(
    and(eq(roomLeaseOptions.roomId, roomId), eq(roomLeaseOptions.leaseType, leaseType))
  )
  if (existing) return existing

  const [created] = await db.insert(roomLeaseOptions).values({
    roomId, leaseType, price: price.toString(), isEnabled: true,
  }).returning()
  return created
}

// ════════════════════════════════════════════════════════════
// image pools — mirrors IMAGE_POOLS in the old app/lib/data.js
// ════════════════════════════════════════════════════════════

const IMAGE_POOLS: Record<string, { url: string; alt: string }[]> = {
  single: [
    { url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80', alt: 'Single bed with neutral bedding beside a window' },
    { url: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=80', alt: 'Compact study desk against the wall' },
  ],
  shared: [
    { url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1200&q=80', alt: 'Shared bedroom with two beds' },
    { url: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=1200&q=80', alt: 'Shared common living space' },
  ],
  self_contain: [
    { url: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80', alt: 'Self-contained room with double bed' },
    { url: 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?auto=format&fit=crop&w=1200&q=80', alt: 'En-suite bathroom with shower' },
  ],
}

// ════════════════════════════════════════════════════════════
// room seed type — compact tuple-like shape, mirrors data.js rooms
// ════════════════════════════════════════════════════════════

type RoomSeed = {
  block: string
  number: string
  type: 'single' | 'shared' | 'self_contain'
  status: 'available' | 'booked' | 'maintenance'
  floor: string
  bathroom: 'ensuite' | 'shared'
  furnished: 'yes' | 'no' | 'partially'
  dimensions: string
  fullYearPrice: number
}

async function main() {
  console.log('🌱 Seeding Netlodge database...\n')

  // ── 1. CITIES ────────────────────────────────────────────
  console.log('→ Cities')
  const abuja = await getOrCreateCity('Abuja', 'FCT')
  const lagos = await getOrCreateCity('Lagos', 'Lagos State')
  const enugu = await getOrCreateCity('Enugu', 'Enugu State')

  // ── 2. UNIVERSITIES ──────────────────────────────────────
  console.log('→ Universities')
  const uniAbuja   = await getOrCreateUniversity(abuja.id, 'University of Abuja', 'UNIABUJA')
  await getOrCreateUniversity(abuja.id, 'National Open University of Nigeria', 'NOUN')
  await getOrCreateUniversity(abuja.id, 'Nile University of Nigeria', 'NUN')

  const uniLagos    = await getOrCreateUniversity(lagos.id, 'University of Lagos', 'UNILAG')
  await getOrCreateUniversity(lagos.id, 'Lagos State University', 'LASU')
  await getOrCreateUniversity(lagos.id, 'Covenant University', 'CU')

  const uniNsukka   = await getOrCreateUniversity(enugu.id, 'University of Nigeria, Nsukka', 'UNN')
  await getOrCreateUniversity(enugu.id, 'Enugu State University of Science and Technology', 'ESUT')
  await getOrCreateUniversity(enugu.id, 'Godfrey Okoye University', 'GOUNI')

  // ── 3. AMENITIES ─────────────────────────────────────────
  console.log('→ Amenities')
  const amenitySeed: [typeof amenities.$inferInsert['category'], string][] = [
    ['power', '24hr Electricity'], ['power', 'Generator Backup'],
    ['power', 'Solar Power'], ['power', 'Prepaid Meter'],
    ['water', 'Constant Water Supply'], ['water', 'Borehole Water'], ['water', 'Overhead Tank'],
    ['internet', 'WiFi Included'], ['internet', 'Strong Network Coverage'],
    ['security', '24hr Security'], ['security', 'CCTV Cameras'], ['security', 'Gated Estate'],
    ['extras', 'Parking Space'], ['extras', 'Kitchen Access'], ['extras', 'Laundry Area'],
  ]
  const amenityRows = []
  for (const [category, label] of amenitySeed) {
    amenityRows.push(await getOrCreateAmenity(category, label))
  }
  const A = Object.fromEntries(amenityRows.map((a) => [a.label, a.id])) // label -> id lookup

  // ── 4. LANDLORDS ─────────────────────────────────────────
  console.log('→ Landlords')
  const { landlord: okafor } = await getOrCreateLandlordUser({
    email: 'emeka@gmail.com', phone: '08012345678',
    firstName: 'Emeka', lastName: 'Okafor', businessName: 'Okafor Properties Ltd',
  })
  const { landlord: adeyemi } = await getOrCreateLandlordUser({
    email: 'funke@gmail.com', phone: '08023456789',
    firstName: 'Funke', lastName: 'Adeyemi', businessName: 'Adeyemi Realty',
  })
  const { landlord: eze } = await getOrCreateLandlordUser({
    email: 'chuka@gmail.com', phone: '08034567890',
    firstName: 'Chukwuemeka', lastName: 'Eze', businessName: 'Eze Student Lodges',
  })

  // ════════════════════════════════════════════════════════
  // PROPERTY 1 — Sunrise Hostel (Abuja) — mirrors prop-1
  // ════════════════════════════════════════════════════════
  console.log('→ Sunrise Hostel (Abuja)')
  const sunrise = await getOrCreateProperty({
    landlordId: okafor!.id,
    cityId: abuja.id,
    universityId: uniAbuja.id,
    name: 'Sunrise Hostel',
    address: 'Plot 34, Gwagwalada, Abuja FCT',
    latitude: '8.951000',
    longitude: '7.088000',
    distanceToGateMeters: 400,
    distanceToFacultyMeters: 650,
    distanceToMarketMeters: 800,
    amenityIds: [A['24hr Electricity'], A['WiFi Included'], A['Borehole Water'], A['24hr Security'], A['CCTV Cameras'], A['Parking Space']],
    rules: ['No loud music after 10pm', 'No visitors after midnight', 'Keep common areas clean', 'No cooking in rooms'],
  })

  const sunriseRooms: RoomSeed[] = [
    // Block A
    { block: 'Block A', number: 'A01', type: 'single', status: 'available', floor: 'Ground', bathroom: 'shared', furnished: 'no', dimensions: '3m x 4m', fullYearPrice: 120000 },
    { block: 'Block A', number: 'A02', type: 'single', status: 'booked', floor: 'Ground', bathroom: 'shared', furnished: 'no', dimensions: '3m x 4m', fullYearPrice: 120000 },
    { block: 'Block A', number: 'A03', type: 'shared', status: 'available', floor: 'Ground', bathroom: 'shared', furnished: 'no', dimensions: '4m x 4m', fullYearPrice: 90000 },
    { block: 'Block A', number: 'A04', type: 'shared', status: 'available', floor: 'Ground', bathroom: 'shared', furnished: 'no', dimensions: '4m x 4m', fullYearPrice: 90000 },
    { block: 'Block A', number: 'A05', type: 'self_contain', status: 'available', floor: '1st', bathroom: 'ensuite', furnished: 'yes', dimensions: '4m x 5m', fullYearPrice: 180000 },
    { block: 'Block A', number: 'A06', type: 'self_contain', status: 'maintenance', floor: '1st', bathroom: 'ensuite', furnished: 'yes', dimensions: '4m x 5m', fullYearPrice: 180000 },
    { block: 'Block A', number: 'A07', type: 'single', status: 'available', floor: '1st', bathroom: 'shared', furnished: 'no', dimensions: '3m x 4m', fullYearPrice: 120000 },
    { block: 'Block A', number: 'A08', type: 'single', status: 'booked', floor: '1st', bathroom: 'shared', furnished: 'no', dimensions: '3m x 4m', fullYearPrice: 120000 },
    // Block B
    { block: 'Block B', number: 'B01', type: 'self_contain', status: 'available', floor: 'Ground', bathroom: 'ensuite', furnished: 'yes', dimensions: '4m x 5m', fullYearPrice: 180000 },
    { block: 'Block B', number: 'B02', type: 'self_contain', status: 'booked', floor: 'Ground', bathroom: 'ensuite', furnished: 'yes', dimensions: '4m x 5m', fullYearPrice: 180000 },
    { block: 'Block B', number: 'B03', type: 'single', status: 'available', floor: '1st', bathroom: 'shared', furnished: 'no', dimensions: '3m x 4m', fullYearPrice: 120000 },
    { block: 'Block B', number: 'B04', type: 'shared', status: 'available', floor: '1st', bathroom: 'shared', furnished: 'no', dimensions: '4m x 4m', fullYearPrice: 90000 },
    { block: 'Block B', number: 'B05', type: 'shared', status: 'available', floor: '2nd', bathroom: 'shared', furnished: 'no', dimensions: '4m x 4m', fullYearPrice: 90000 },
    { block: 'Block B', number: 'B06', type: 'single', status: 'booked', floor: '2nd', bathroom: 'shared', furnished: 'no', dimensions: '3m x 4m', fullYearPrice: 120000 },
    // Block C
    { block: 'Block C', number: 'C01', type: 'shared', status: 'available', floor: 'Ground', bathroom: 'shared', furnished: 'no', dimensions: '4m x 4m', fullYearPrice: 90000 },
    { block: 'Block C', number: 'C02', type: 'shared', status: 'available', floor: 'Ground', bathroom: 'shared', furnished: 'no', dimensions: '4m x 4m', fullYearPrice: 90000 },
    { block: 'Block C', number: 'C03', type: 'single', status: 'booked', floor: 'Ground', bathroom: 'shared', furnished: 'no', dimensions: '3m x 4m', fullYearPrice: 120000 },
    { block: 'Block C', number: 'C04', type: 'self_contain', status: 'available', floor: 'Ground', bathroom: 'ensuite', furnished: 'yes', dimensions: '4m x 5m', fullYearPrice: 180000 },
    // Block D
    { block: 'Block D', number: 'D01', type: 'single', status: 'available', floor: '1st', bathroom: 'shared', furnished: 'no', dimensions: '3m x 4m', fullYearPrice: 120000 },
    { block: 'Block D', number: 'D02', type: 'single', status: 'maintenance', floor: '1st', bathroom: 'shared', furnished: 'no', dimensions: '3m x 4m', fullYearPrice: 120000 },
    { block: 'Block D', number: 'D03', type: 'self_contain', status: 'booked', floor: '2nd', bathroom: 'ensuite', furnished: 'yes', dimensions: '4m x 5m', fullYearPrice: 180000 },
    { block: 'Block D', number: 'D04', type: 'self_contain', status: 'available', floor: '2nd', bathroom: 'ensuite', furnished: 'yes', dimensions: '4m x 5m', fullYearPrice: 180000 },
    { block: 'Block D', number: 'D05', type: 'shared', status: 'available', floor: '2nd', bathroom: 'shared', furnished: 'no', dimensions: '4m x 4m', fullYearPrice: 90000 },
  ]

  for (const r of sunriseRooms) {
    const room = await getOrCreateRoom({
      propertyId: sunrise.id,
      blockName: r.block,
      roomNumber: r.number,
      roomType: r.type,
      floor: r.floor,
      bathroomType: r.bathroom,
      furnished: r.furnished,
      dimensions: r.dimensions,
      status: r.status,
      amenityIds: [A['24hr Electricity'], A['WiFi Included'], A['24hr Security']],
      images: IMAGE_POOLS[r.type],
    })
    await upsertLeaseOption(room.id, 'full_year', r.fullYearPrice)
    await upsertLeaseOption(room.id, 'per_semester', Math.round(r.fullYearPrice * 0.55))
  }

  // ════════════════════════════════════════════════════════
  // PROPERTY 2 — Greenfield Lodge (Lagos) — mirrors prop-2
  // ════════════════════════════════════════════════════════
  console.log('→ Greenfield Lodge (Lagos)')
  const greenfield = await getOrCreateProperty({
    landlordId: adeyemi!.id,
    cityId: lagos.id,
    universityId: uniLagos.id,
    name: 'Greenfield Lodge',
    address: '12 Akoka Road, Yaba, Lagos',
    latitude: '6.518500',
    longitude: '3.387900',
    distanceToGateMeters: 250,
    distanceToFacultyMeters: 500,
    distanceToMarketMeters: 400,
    amenityIds: [A['Generator Backup'], A['24hr Security'], A['Parking Space']],
    rules: ['No loud music after 11pm', 'Visitors must leave by 10pm', 'No subletting allowed'],
  })

  const greenfieldRooms: RoomSeed[] = [
    { block: 'Block A', number: 'A01', type: 'self_contain', status: 'available', floor: 'Ground', bathroom: 'ensuite', furnished: 'yes', dimensions: '4m x 5m', fullYearPrice: 200000 },
    { block: 'Block A', number: 'A02', type: 'self_contain', status: 'booked', floor: 'Ground', bathroom: 'ensuite', furnished: 'yes', dimensions: '4m x 5m', fullYearPrice: 200000 },
    { block: 'Block A', number: 'A03', type: 'single', status: 'available', floor: '1st', bathroom: 'shared', furnished: 'no', dimensions: '3m x 4m', fullYearPrice: 150000 },
    { block: 'Block A', number: 'A04', type: 'single', status: 'available', floor: '1st', bathroom: 'shared', furnished: 'no', dimensions: '3m x 4m', fullYearPrice: 150000 },
    { block: 'Block B', number: 'B01', type: 'single', status: 'available', floor: 'Ground', bathroom: 'shared', furnished: 'no', dimensions: '3m x 4m', fullYearPrice: 150000 },
    { block: 'Block B', number: 'B02', type: 'single', status: 'booked', floor: 'Ground', bathroom: 'shared', furnished: 'no', dimensions: '3m x 4m', fullYearPrice: 150000 },
    { block: 'Block B', number: 'B03', type: 'self_contain', status: 'available', floor: '1st', bathroom: 'ensuite', furnished: 'yes', dimensions: '4m x 5m', fullYearPrice: 220000 },
  ]

  for (const r of greenfieldRooms) {
    const room = await getOrCreateRoom({
      propertyId: greenfield.id,
      blockName: r.block,
      roomNumber: r.number,
      roomType: r.type,
      floor: r.floor,
      bathroomType: r.bathroom,
      furnished: r.furnished,
      dimensions: r.dimensions,
      status: r.status,
      amenityIds: [A['Generator Backup'], A['WiFi Included']],
      images: IMAGE_POOLS[r.type],
    })
    await upsertLeaseOption(room.id, 'full_year', r.fullYearPrice)
  }

  // ════════════════════════════════════════════════════════
  // PROPERTY 3 — Campus View Hostel (Enugu) — mirrors prop-3
  // ════════════════════════════════════════════════════════
  console.log('→ Campus View Hostel (Enugu)')
  const campusView = await getOrCreateProperty({
    landlordId: eze!.id,
    cityId: enugu.id,
    universityId: uniNsukka.id,
    name: 'Campus View Hostel',
    address: 'University Road, Nsukka, Enugu',
    latitude: '6.858000',
    longitude: '7.396000',
    distanceToGateMeters: 640,
    distanceToFacultyMeters: 800,
    distanceToMarketMeters: 960,
    amenityIds: [A['Solar Power'], A['WiFi Included'], A['Borehole Water'], A['Kitchen Access']],
    rules: ['No loud noise after 10pm', 'Keep common areas clean', 'No pets allowed'],
  })

  const campusViewRooms: RoomSeed[] = [
    { block: 'Block A', number: 'A01', type: 'shared', status: 'available', floor: 'Ground', bathroom: 'shared', furnished: 'no', dimensions: '4m x 4m', fullYearPrice: 75000 },
    { block: 'Block A', number: 'A02', type: 'shared', status: 'booked', floor: 'Ground', bathroom: 'shared', furnished: 'no', dimensions: '4m x 4m', fullYearPrice: 75000 },
    { block: 'Block A', number: 'A03', type: 'single', status: 'available', floor: '1st', bathroom: 'shared', furnished: 'no', dimensions: '3m x 4m', fullYearPrice: 110000 },
    { block: 'Block B', number: 'B01', type: 'single', status: 'available', floor: 'Ground', bathroom: 'shared', furnished: 'no', dimensions: '3m x 4m', fullYearPrice: 110000 },
    { block: 'Block B', number: 'B02', type: 'shared', status: 'available', floor: 'Ground', bathroom: 'shared', furnished: 'no', dimensions: '4m x 4m', fullYearPrice: 75000 },
  ]

  for (const r of campusViewRooms) {
    const room = await getOrCreateRoom({
      propertyId: campusView.id,
      blockName: r.block,
      roomNumber: r.number,
      roomType: r.type,
      floor: r.floor,
      bathroomType: r.bathroom,
      furnished: r.furnished,
      dimensions: r.dimensions,
      status: r.status,
      amenityIds: [A['Solar Power'], A['Borehole Water']],
      images: IMAGE_POOLS[r.type],
    })
    await upsertLeaseOption(room.id, 'full_year', r.fullYearPrice)
  }

  console.log('\n✅ Seed complete. Sample login: emeka@gmail.com / Password123!')
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Seed failed:', err)
    process.exit(1)
  })