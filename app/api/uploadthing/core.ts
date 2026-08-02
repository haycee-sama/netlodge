// app/api/uploadthing/core.ts
import { createUploadthing, type FileRouter } from 'uploadthing/next'
import { UploadThingError } from 'uploadthing/server'
import { auth } from '../../../lib/auth'

const f = createUploadthing()

async function requireLandlordSession() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'landlord') {
    throw new UploadThingError('Unauthorized — landlord account required.')
  }
  if (!session.user.roleRecordId) {
    throw new UploadThingError('Complete your landlord account setup first.')
  }
  return { userId: session.user.id, landlordId: session.user.roleRecordId }
}

// Shared by student identity verification (verify/student page) and
// landlord KYC — both need to upload identity/ownership documents,
// gated only on being an authenticated user with a completed role profile.
async function requireStudentOrLandlordSession() {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'landlord' && session.user.role !== 'student')) {
    throw new UploadThingError('Unauthorized — you must be logged in.')
  }
  if (!session.user.roleRecordId) {
    throw new UploadThingError('Complete your account setup first.')
  }
  return { userId: session.user.id, roleRecordId: session.user.roleRecordId, role: session.user.role }
}

export const ourFileRouter = {
  roomImage: f({
    image: { maxFileSize: '4MB', maxFileCount: 10 },
  })
    .middleware(async () => {
      return await requireLandlordSession()
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log(`Room image uploaded by landlord ${metadata.landlordId}: ${file.url}`)
      return { uploadedBy: metadata.landlordId }
    }),

  kycDocument: f({
    image: { maxFileSize: '8MB', maxFileCount: 5 },
    pdf: { maxFileSize: '8MB', maxFileCount: 5 },
  })
    .middleware(async () => {
      return await requireStudentOrLandlordSession()
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log(`KYC document uploaded by ${metadata.role} ${metadata.roleRecordId}: ${file.url}`)
      return { uploadedBy: metadata.roleRecordId }
    }),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter