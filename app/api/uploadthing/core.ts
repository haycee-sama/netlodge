// app/api/uploadthing/core.ts
import { createUploadthing, type FileRouter } from 'uploadthing/next'
import { UploadThingError } from 'uploadthing/server'
import { auth } from '../../../lib/auth'

const f = createUploadthing()

// Shared auth check — both routes require a logged-in landlord.
// This runs server-side before any upload is accepted; a client
// forging the endpoint call with no session, or a student session,
// gets rejected here before Uploadthing ever stores a byte.
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
      return await requireLandlordSession()
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log(`KYC document uploaded by landlord ${metadata.landlordId}: ${file.url}`)
      return { uploadedBy: metadata.landlordId }
    }),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter