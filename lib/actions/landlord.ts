// lib/actions/landlord.ts
'use server'

import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '../db'
import { properties, rooms, roomLeaseOptions, landlords } from '../db/schema'
import { auth } from '../auth'
import { encryptAccountNumber } from '../crypto/bankAccount'
import { encryptAccountNumberToBase64 } from '../crypto/bankAccount'

async function requireLandlord() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'landlord') {
    return { error: 'Unauthorized.' } as const
  }
  const landlordId = session.user.roleRecordId
  if (!landlordId) return { error: 'Landlord profile not found.' } as const
  return { landlordId } as const
}

async function ownsProperty(landlordId: string, propertyId: string) {
  const [property] = await db.select().from(properties).where(eq(properties.id, propertyId))
  return property?.landlordId === landlordId
}

async function ownsRoom(landlordId: string, roomId: string) {
  const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId))
  if (!room) return false
  return ownsProperty(landlordId, room.propertyId)
}

// ════════════════════════════════════════════════════════════
// createProperty
// ════════════════════════════════════════════════════════════
export async function createProperty(data: {
  name: string
  address: string
  cityId: string
  universityId: string
  latitude?: number
  longitude?: number
  distanceToGateMeters?: number
  amenityIds?: string[]
  rules?: string[]
}) {
  const authResult = await requireLandlord()
  if ('error' in authResult) return authResult

  if (!data.name?.trim()) return { error: 'Property name is required.' }
  if (!data.address?.trim()) return { error: 'Property address is required.' }
  if (!data.cityId) return { error: 'City is required.' }
  if (!data.universityId) return { error: 'University is required.' }

  try {
    const [property] = await db.insert(properties).values({
      landlordId: authResult.landlordId,
      cityId: data.cityId,
      universityId: data.universityId,
      name: data.name.trim(),
      address: data.address.trim(),
      latitude: data.latitude !== undefined ? data.latitude.toString() : undefined,
      longitude: data.longitude !== undefined ? data.longitude.toString() : undefined,
      distanceToGateMeters: data.distanceToGateMeters,
      amenityIds: data.amenityIds ?? [],
      rules: data.rules ?? [],
    }).returning()

    revalidatePath('/landlord/properties')
    return { success: true, propertyId: property.id }
  } catch (err) {
    console.error('createProperty failed', err)
    return { error: 'Could not create property. Please try again.' }
  }
}

// ════════════════════════════════════════════════════════════
// createRoom
// ════════════════════════════════════════════════════════════
export async function createRoom(data: {
  propertyId: string
  blockName: string
  roomNumber: string
  roomType: 'single' | 'shared' | 'self_contain'
  floor?: string
  bathroomType: 'ensuite' | 'shared'
  furnished: 'yes' | 'no' | 'partially'
  dimensions?: string
  amenityIds?: string[]
  images?: { url: string; alt: string }[]
}) {
  const authResult = await requireLandlord()
  if ('error' in authResult) return authResult

  if (!(await ownsProperty(authResult.landlordId, data.propertyId))) {
    return { error: 'You do not own this property.' }
  }
  if (!data.blockName?.trim()) return { error: 'Block name is required.' }
  if (!data.roomNumber?.trim()) return { error: 'Room number is required.' }

  try {
    const [room] = await db.insert(rooms).values({
      propertyId: data.propertyId,
      blockName: data.blockName.trim(),
      roomNumber: data.roomNumber.trim(),
      roomType: data.roomType,
      floor: data.floor,
      bathroomType: data.bathroomType,
      furnished: data.furnished,
      dimensions: data.dimensions,
      amenityIds: data.amenityIds ?? [],
      images: data.images ?? [],
    }).returning()

    revalidatePath(`/landlord/property/${data.propertyId}/rooms`)
    return { success: true, roomId: room.id }
  } catch (err: any) {
    const pgCode = err?.code ?? err?.cause?.code

    if (pgCode === '23505') {
      return {
        error: `Room "${data.roomNumber.trim()}" already exists in ${data.blockName.trim()}. Please use a different room number.`,
      }
    }

    console.error('createRoom failed', err)
    return { error: 'Could not create room. Please try again.' }
  }
}

// ════════════════════════════════════════════════════════════
// updateRoomLeaseOptions — upsert per lease_type
// ════════════════════════════════════════════════════════════
export async function updateRoomLeaseOptions(
  roomId: string,
  options: Array<{ leaseType: 'full_year' | 'per_semester' | 'half_year'; price: number; isEnabled: boolean }>
) {
  const authResult = await requireLandlord()
  if ('error' in authResult) return authResult

  if (!(await ownsRoom(authResult.landlordId, roomId))) return { error: 'You do not own this room.' }

  const fullYear = options.find((o) => o.leaseType === 'full_year' && o.isEnabled)
  if (!fullYear) return { error: 'The 1 Year lease option is required and cannot be disabled.' }
  if (options.some((o) => o.price <= 0)) return { error: 'All prices must be greater than zero.' }

  try {
    for (const option of options) {
      const [existing] = await db.select().from(roomLeaseOptions).where(
        and(eq(roomLeaseOptions.roomId, roomId), eq(roomLeaseOptions.leaseType, option.leaseType))
      )

      if (existing) {
        await db.update(roomLeaseOptions).set({
          price: option.price.toString(),
          isEnabled: option.isEnabled,
        }).where(eq(roomLeaseOptions.id, existing.id))
      } else {
        await db.insert(roomLeaseOptions).values({
          roomId,
          leaseType: option.leaseType,
          price: option.price.toString(),
          isEnabled: option.isEnabled,
        })
      }
    }

    revalidatePath('/landlord')
    return { success: true }
  } catch (err) {
    console.error('updateRoomLeaseOptions failed', err)
    return { error: 'Could not update pricing. Please try again.' }
  }
}

// ════════════════════════════════════════════════════════════
// updateRoomStatus
// ════════════════════════════════════════════════════════════
export async function updateRoomStatus(roomId: string, status: 'available' | 'booked' | 'maintenance') {
  const authResult = await requireLandlord()
  if ('error' in authResult) return authResult

  if (!(await ownsRoom(authResult.landlordId, roomId))) return { error: 'You do not own this room.' }

  try {
    await db.update(rooms).set({ status }).where(eq(rooms.id, roomId))
    revalidatePath('/landlord')
    return { success: true }
  } catch (err) {
    console.error('updateRoomStatus failed', err)
    return { error: 'Could not update room status. Please try again.' }
  }
}

// ════════════════════════════════════════════════════════════
// updateLandlordProfile — bank account encrypted before storage
// ════════════════════════════════════════════════════════════
export async function updateLandlordProfile(data: {
  businessName?: string
  bankName?: string
  bankAccountNumber?: string
  bankAccountName?: string
}) {
  const authResult = await requireLandlord()
  if ('error' in authResult) return authResult

  if (data.bankAccountNumber && !/^\d{10}$/.test(data.bankAccountNumber)) {
    return { error: 'Enter a valid 10-digit account number.' }
  }

  try {
    const updates: Record<string, unknown> = {}
    if (data.businessName !== undefined) updates.businessName = data.businessName
    if (data.bankName !== undefined) updates.bankName = data.bankName
    if (data.bankAccountName !== undefined) updates.bankAccountName = data.bankAccountName
    if (data.bankAccountNumber) {
      updates.bankAccountNumberEncrypted = encryptAccountNumberToBase64(data.bankAccountNumber)
    }

    await db.update(landlords).set(updates).where(eq(landlords.id, authResult.landlordId))
    revalidatePath('/landlord/profile')
    return { success: true }
  } catch (err) {
    console.error('updateLandlordProfile failed', err)
    return { error: 'Could not update profile. Please try again.' }
  }
}

// ════════════════════════════════════════════════════════════
// submitLandlordKyc — stores uploaded document URLs, leaves
// verificationStatus at its existing value ('pending' by default)
// for manual admin review. No NIN/BVN is collected or stored here
// — see types/next-auth.d.ts-adjacent architecture notes: Phase 1
// deliberately stores only a verification provider reference, never
// raw NIN/BVN, and no automated provider is wired up yet.
// ════════════════════════════════════════════════════════════
export async function submitLandlordKyc(documents: {
  govId: { url: string; name: string } | null
  propertyDoc: { url: string; name: string } | null
  propertyPhotos: { url: string; name: string }[]
}) {
  const authResult = await requireLandlord()
  if ('error' in authResult) return authResult

  if (!documents.govId) return { error: 'Please upload your government ID.' }
  if (!documents.propertyDoc) return { error: 'Please upload your property ownership document.' }
  if (!documents.propertyPhotos || documents.propertyPhotos.length === 0) {
    return { error: 'Please upload at least one geo-tagged property photo.' }
  }

  const kycDocuments = [
    { type: 'gov_id', url: documents.govId.url, name: documents.govId.name },
    { type: 'property_doc', url: documents.propertyDoc.url, name: documents.propertyDoc.name },
    ...documents.propertyPhotos.map((p) => ({ type: 'property_photo', url: p.url, name: p.name })),
  ]

  try {
    await db.update(landlords).set({ kycDocuments }).where(eq(landlords.id, authResult.landlordId))
    revalidatePath('/landlord/verify/status')
    return { success: true }
  } catch (err) {
    console.error('submitLandlordKyc failed', err)
    return { error: 'Could not submit your documents. Please try again.' }
  }
}