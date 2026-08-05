// lib/auth-guards.ts
// Shared session/role-check helpers. Previously lib/actions/admin.ts,
// lib/actions/landlord.ts, and lib/actions/student.ts each defined their
// own near-identical "check session, check role, check roleRecordId"
// function, and lib/actions/booking.ts and lib/actions/dispute.ts
// re-implemented the same check inline in multiple exported functions.
//
// Deliberately NOT a 'use server' file — these are internal helpers
// called from other server-side modules, never invoked directly from
// the client.

import { auth } from './auth'

export async function requireStudentId(unauthorizedMessage = 'Unauthorized.') {
  const session = await auth()
  if (!session?.user || session.user.role !== 'student') {
    return { error: unauthorizedMessage } as const
  }
  const studentId = session.user.roleRecordId
  if (!studentId) return { error: 'Student profile not found.' } as const
  return { studentId, userId: session.user.id, email: session.user.email } as const
}

export async function requireLandlordId(unauthorizedMessage = 'Unauthorized.') {
  const session = await auth()
  if (!session?.user || session.user.role !== 'landlord') {
    return { error: unauthorizedMessage } as const
  }
  const landlordId = session.user.roleRecordId
  if (!landlordId) return { error: 'Landlord profile not found.' } as const
  return { landlordId, userId: session.user.id } as const
}

export async function requireAdminId(unauthorizedMessage = 'Unauthorized.') {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return { error: unauthorizedMessage } as const
  }
  return { adminUserId: session.user.id } as const
}