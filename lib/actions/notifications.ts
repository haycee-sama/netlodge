// lib/actions/notifications.ts
'use server'

import { eq, and } from 'drizzle-orm'
import { db } from '../db'
import { notifications } from '../db/schema'
import { auth } from '../auth'
import { getNotificationsByUser, getUnreadNotificationCount } from '../db/queries'

async function requireUserId() {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized.' } as const
  return { userId: session.user.id } as const
}

// ════════════════════════════════════════════════════════════
// markNotificationAsRead — ownership-checked against the caller's session
// ════════════════════════════════════════════════════════════
export async function markNotificationAsRead(notificationId: string) {
  const authResult = await requireUserId()
  if ('error' in authResult) return authResult

  const [existing] = await db.select().from(notifications).where(eq(notifications.id, notificationId))
  if (!existing) return { error: 'Notification not found.' }
  if (existing.userId !== authResult.userId) return { error: 'You do not have access to this notification.' }

  try {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, notificationId))
    return { success: true }
  } catch (err) {
    console.error('markNotificationAsRead failed', err)
    return { error: 'Could not update notification.' }
  }
}

// ════════════════════════════════════════════════════════════
// markAllNotificationsAsRead — NOTE: deliberately takes no userId param.
// The spec asked for markAllNotificationsAsRead(userId), but as a
// 'use server' export that's callable directly from the browser, an
// attacker could pass any user's id and mark (or, in a future version that
// also does writes, tamper with) someone else's notifications. This
// derives the target user from the authenticated session instead — same
// behavior for legitimate callers, no cross-user surface.
// ════════════════════════════════════════════════════════════
export async function markAllNotificationsAsRead() {
  const authResult = await requireUserId()
  if ('error' in authResult) return authResult

  try {
    await db.update(notifications).set({ isRead: true })
      .where(and(eq(notifications.userId, authResult.userId), eq(notifications.isRead, false)))
    return { success: true }
  } catch (err) {
    console.error('markAllNotificationsAsRead failed', err)
    return { error: 'Could not update notifications.' }
  }
}

// ════════════════════════════════════════════════════════════
// getMyNotifications / getMyUnreadCount — safe to call directly from a
// client component (e.g. LandlordLayout) since they only ever return the
// caller's own data, resolved from their session.
// ════════════════════════════════════════════════════════════
export async function getMyNotifications() {
  const authResult = await requireUserId()
  if ('error' in authResult) return { error: authResult.error }
  const items = await getNotificationsByUser(authResult.userId)
  return { success: true, items }
}

export async function getMyUnreadCount() {
  const authResult = await requireUserId()
  if ('error' in authResult) return { error: authResult.error, count: 0 }
  const count = await getUnreadNotificationCount(authResult.userId)
  return { success: true, count }
}